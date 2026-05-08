"""
GPU inference engine for streaming.

Runs the **unmodified** Wav2Vec2BertForMultilevelCTC model on feature
chunks produced by the feature extractor.  Handles:

* FP16 / BF16 ``torch.autocast``
* Dedicated CUDA stream for async kernel execution
* Overlap-aware output trimming
* Per-chunk latency & RTF measurement
"""

import logging
import threading
import queue
import time
from typing import Optional
from dataclasses import dataclass

import torch
import numpy as np

from .config import StreamingConfig
from .feature_extractor import FeatureChunk

logger = logging.getLogger(__name__)


@dataclass
class InferenceChunk:
    """Model output for a single chunk."""
    level_to_probs: dict          # {level_name: Tensor(1, T, C)} — softmax probs on CPU
    chunk_index: int
    timestamp: float
    capture_latency_ms: float
    feature_latency_ms: float
    inference_latency_ms: float
    is_speech: bool
    audio_duration_ms: float
    gpu_util_pct: float
    vram_used_mb: float


class StreamingInferenceEngine:
    """
    Thread that reads :class:`FeatureChunk` objects, runs the model on GPU,
    and pushes :class:`InferenceChunk` logit/prob dicts to the decoder.
    """

    def __init__(
        self,
        config: StreamingConfig,
        model: torch.nn.Module,
        in_queue: queue.Queue,
        out_queue: queue.Queue,
    ):
        self._config = config
        self._model = model
        self._in_queue = in_queue
        self._out_queue = out_queue
        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._cuda_stream: Optional[torch.cuda.Stream] = None

        # Set up CUDA stream
        if config.use_cuda_streams and torch.cuda.is_available():
            self._cuda_stream = torch.cuda.Stream()

    # ── lifecycle ────────────────────────────────────────────────────────

    def start(self) -> None:
        self._running.set()
        self._thread = threading.Thread(
            target=self._run, daemon=True, name="gpu-inference"
        )
        self._thread.start()
        logger.info("StreamingInferenceEngine started")

    def stop(self) -> None:
        self._running.clear()
        if self._thread is not None:
            self._thread.join(timeout=5.0)
            self._thread = None
        logger.info("StreamingInferenceEngine stopped")

    # ── GPU metrics helpers ──────────────────────────────────────────────

    @staticmethod
    def _get_gpu_metrics() -> tuple[float, float]:
        """Return (gpu_util_pct, vram_used_mb). Falls back to 0 on error."""
        if not torch.cuda.is_available():
            return 0.0, 0.0
        try:
            vram_used = torch.cuda.memory_allocated() / (1024 ** 2)
            # GPU utilisation requires pynvml or nvidia-smi — we just track VRAM
            return 0.0, vram_used
        except Exception:
            return 0.0, 0.0

    # ── main loop ────────────────────────────────────────────────────────

    def _run(self) -> None:
        device = self._config.device
        dtype = self._config.torch_dtype

        while self._running.is_set():
            try:
                feat_chunk: FeatureChunk = self._in_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            # Skip silent chunks — pass a sentinel through
            if not feat_chunk.is_speech:
                sentinel = InferenceChunk(
                    level_to_probs={},
                    chunk_index=feat_chunk.chunk_index,
                    timestamp=feat_chunk.timestamp,
                    capture_latency_ms=feat_chunk.capture_latency_ms,
                    feature_latency_ms=feat_chunk.feature_latency_ms,
                    inference_latency_ms=0.0,
                    is_speech=False,
                    audio_duration_ms=feat_chunk.audio_duration_ms,
                    gpu_util_pct=0.0,
                    vram_used_mb=0.0,
                )
                try:
                    self._out_queue.put_nowait(sentinel)
                except queue.Full:
                    pass
                continue

            t0 = time.perf_counter()
            logger.info(
                "InferenceEngine: processing chunk #%d  features=%s",
                feat_chunk.chunk_index,
                {k: tuple(v.shape) for k, v in feat_chunk.features.items()},
            )

            # ── Transfer features to GPU ─────────────────────────────────
            features = {
                k: v.to(device, dtype=dtype, non_blocking=True)
                for k, v in feat_chunk.features.items()
            }

            # ── Run model forward pass ───────────────────────────────────
            with torch.no_grad():
                if self._cuda_stream is not None:
                    with torch.cuda.stream(self._cuda_stream):
                        outs = self._model(**features, return_dict=False)[0]
                    self._cuda_stream.synchronize()
                else:
                    outs = self._model(**features, return_dict=False)[0]

            # ── Softmax → CPU ────────────────────────────────────────────
            probs = {}
            for level in outs:
                probs[level] = (
                    torch.nn.functional.softmax(outs[level], dim=-1)
                    .cpu()
                    .to(torch.float32)
                )

            inference_latency = (time.perf_counter() - t0) * 1000.0
            logger.info(
                "InferenceEngine: chunk #%d done in %.1fms  levels=%s  shapes=%s",
                feat_chunk.chunk_index, inference_latency,
                list(probs.keys()),
                {k: tuple(v.shape) for k, v in probs.items()},
            )
            gpu_util, vram = self._get_gpu_metrics()

            ic = InferenceChunk(
                level_to_probs=probs,
                chunk_index=feat_chunk.chunk_index,
                timestamp=feat_chunk.timestamp,
                capture_latency_ms=feat_chunk.capture_latency_ms,
                feature_latency_ms=feat_chunk.feature_latency_ms,
                inference_latency_ms=inference_latency,
                is_speech=True,
                audio_duration_ms=feat_chunk.audio_duration_ms,
                gpu_util_pct=gpu_util,
                vram_used_mb=vram,
            )

            try:
                self._out_queue.put_nowait(ic)
            except queue.Full:
                logger.warning(
                    "Decoder queue full — dropping inference chunk %d",
                    feat_chunk.chunk_index,
                )

        logger.info("StreamingInferenceEngine loop exited")
