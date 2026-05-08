"""
Streaming feature extractor.

Wraps the HuggingFace ``AutoFeatureExtractor`` but processes one chunk
at a time.  Runs in its own thread and pushes feature tensors into the
inference queue.
"""

import logging
import threading
import queue
import time
from typing import Optional
from dataclasses import dataclass

import numpy as np
import torch
from numpy.typing import NDArray

from .config import StreamingConfig
from .buffer_manager import BufferChunk
from .vad import EnergyVAD

logger = logging.getLogger(__name__)


@dataclass
class FeatureChunk:
    """A chunk of extracted features ready for GPU inference."""
    features: dict               # {key: Tensor} — ready for model.forward()
    chunk_index: int
    timestamp: float
    capture_latency_ms: float
    feature_latency_ms: float
    is_speech: bool
    audio_duration_ms: float     # duration of the audio that produced these features


class StreamingFeatureExtractor:
    """
    Thread that reads :class:`BufferChunk` items, applies VAD, extracts
    Mel-filterbank features via the HuggingFace processor, and pushes
    :class:`FeatureChunk` objects to the inference queue.
    """

    def __init__(
        self,
        config: StreamingConfig,
        processor,
        in_queue: queue.Queue,
        out_queue: queue.Queue,
    ):
        self._config = config
        self._processor = processor
        self._in_queue = in_queue
        self._out_queue = out_queue
        self._vad = EnergyVAD(config) if config.vad_enabled else None
        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ── lifecycle ────────────────────────────────────────────────────────

    def start(self) -> None:
        self._running.set()
        self._thread = threading.Thread(
            target=self._run, daemon=True, name="feature-extractor"
        )
        self._thread.start()
        logger.info("StreamingFeatureExtractor started")

    def stop(self) -> None:
        self._running.clear()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        logger.info("StreamingFeatureExtractor stopped")

    # ── main loop ────────────────────────────────────────────────────────

    def _run(self) -> None:
        while self._running.is_set():
            try:
                buf_chunk: BufferChunk = self._in_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            t0 = time.perf_counter()

            # ── VAD check ────────────────────────────────────────────────
            is_speech = True
            if self._vad is not None:
                is_speech = self._vad.is_speech(buf_chunk.audio)

            # ── Feature extraction ───────────────────────────────────────
            # The HF processor expects a list of waveforms
            features = self._processor(
                [buf_chunk.audio],
                sampling_rate=self._config.sample_rate,
                return_tensors="pt",
            )

            # Pin memory for faster H2D transfer if configured
            if self._config.pin_memory and torch.cuda.is_available():
                features = {k: v.pin_memory() for k, v in features.items()}

            feature_latency = (time.perf_counter() - t0) * 1000.0

            audio_duration_ms = (len(buf_chunk.audio) / self._config.sample_rate) * 1000.0

            fc = FeatureChunk(
                features={k: v for k, v in features.items()},
                chunk_index=buf_chunk.chunk_index,
                timestamp=buf_chunk.timestamp,
                capture_latency_ms=buf_chunk.capture_latency_ms,
                feature_latency_ms=feature_latency,
                is_speech=is_speech,
                audio_duration_ms=audio_duration_ms,
            )

            try:
                self._out_queue.put_nowait(fc)
            except queue.Full:
                logger.warning(
                    "Inference queue full — dropping feature chunk %d",
                    buf_chunk.chunk_index,
                )

        logger.info("StreamingFeatureExtractor loop exited")
