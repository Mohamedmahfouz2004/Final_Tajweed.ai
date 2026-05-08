"""
Streaming pipeline orchestrator.

Wires together all five threads (audio capture → buffer manager →
feature extraction → GPU inference → CTC decoder) with inter-thread
queues and provides a clean lifecycle API.

The model is loaded ONCE; the pipeline can be started/stopped/restarted
without reloading weights.
"""

import logging
import queue
import threading
import time
from typing import Optional, Callable

import torch
from transformers import AutoFeatureExtractor
from quran_transcript import QuranPhoneticScriptOutput

from ..modeling.modeling_multi_level_ctc import Wav2Vec2BertForMultilevelCTC
from ..modeling.multi_level_tokenizer import MultiLevelTokenizer
from ..muaalem_typing import MuaalemOutput

from .config import StreamingConfig
from .audio_capture import (
    AudioCapture,
    MicrophoneCapture,
    FileStreamCapture,
    GradioStreamCapture,
)
from .buffer_manager import BufferManager
from .feature_extractor import StreamingFeatureExtractor
from .inference_engine import StreamingInferenceEngine
from .decoder import StreamingDecoder
from .metrics import MetricsCollector

logger = logging.getLogger(__name__)


class StreamingPipeline:
    """
    End-to-end real-time streaming pipeline for Quran Muaalem.

    The model is loaded once in ``__init__``.  Call ``start_gradio()`` /
    ``start_microphone()`` to begin streaming, ``stop()`` to end, and
    the same instance can be restarted without reloading weights.

    Usage
    -----
    >>> cfg = StreamingConfig()
    >>> pipe = StreamingPipeline(cfg)
    >>> pipe.set_reference(phonetizer_out)
    >>> pipe.on_prediction = my_callback
    >>> pipe.start_gradio()
    >>> pipe.push_audio(sr, audio_array)   # from Gradio callback
    >>> ...
    >>> pipe.stop()
    >>> pipe.start_gradio()                # restart without reload
    """

    def __init__(
        self,
        config: Optional[StreamingConfig] = None,
        on_prediction: Optional[Callable[[MuaalemOutput, dict], None]] = None,
    ):
        self._config = config or StreamingConfig()
        self._on_prediction = on_prediction

        # Resolve device
        if self._config.device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available — falling back to CPU")
            self._config.device = "cpu"

        # ── Load model & processor (once) ────────────────────────────────
        logger.info("Loading model: %s", self._config.model_name_or_path)
        self._model = Wav2Vec2BertForMultilevelCTC.from_pretrained(
            self._config.model_name_or_path
        )
        self._model.to(self._config.device, dtype=self._config.torch_dtype)
        self._model.eval()

        self._processor = AutoFeatureExtractor.from_pretrained(
            self._config.model_name_or_path
        )
        self._tokenizer = MultiLevelTokenizer(self._config.model_name_or_path)

        logger.info(
            "Model loaded — device=%s  dtype=%s",
            self._config.device, self._config.dtype_str,
        )

        # ── Pipeline stages (created on start, destroyed on stop) ────────
        self._capture: Optional[AudioCapture] = None
        self._buffer: Optional[BufferManager] = None
        self._feature_ext: Optional[StreamingFeatureExtractor] = None
        self._inference_eng: Optional[StreamingInferenceEngine] = None
        self._decoder: Optional[StreamingDecoder] = None
        self._metrics: Optional[MetricsCollector] = None

        # Queues are created per-start to ensure they're empty
        self._q_raw: Optional[queue.Queue] = None
        self._q_buffer: Optional[queue.Queue] = None
        self._q_features: Optional[queue.Queue] = None
        self._q_inference: Optional[queue.Queue] = None

        self._running = False
        self._ref: Optional[QuranPhoneticScriptOutput] = None

    # ── Reference text ───────────────────────────────────────────────────

    def set_reference(self, ref: QuranPhoneticScriptOutput) -> None:
        """Set / update the Quranic reference for alignment."""
        self._ref = ref
        if self._decoder is not None:
            self._decoder.set_reference(ref)

    # ── Prediction callback ──────────────────────────────────────────────

    @property
    def on_prediction(self) -> Optional[Callable]:
        return self._on_prediction

    @on_prediction.setter
    def on_prediction(self, cb: Callable[[MuaalemOutput, dict], None]) -> None:
        self._on_prediction = cb
        if self._decoder is not None:
            self._decoder._on_prediction = cb

    # ── Start variants ───────────────────────────────────────────────────

    def start_microphone(self) -> None:
        """Start streaming from the default microphone."""
        self._create_queues()
        self._capture = MicrophoneCapture(self._config, self._q_raw)
        self._start_pipeline()
        self._capture.start()

    def start_file(self, path: str, realtime: bool = True) -> None:
        """Start streaming from an audio file (for testing)."""
        self._create_queues()
        self._capture = FileStreamCapture(self._config, self._q_raw, path, realtime)
        self._start_pipeline()
        self._capture.start()

    def start_gradio(self) -> None:
        """Start pipeline for Gradio streaming (no capture thread)."""
        self._create_queues()
        self._capture = GradioStreamCapture(self._config, self._q_raw)
        self._start_pipeline()
        self._capture.start()
        logger.info("Pipeline ready for Gradio audio chunks")

    def push_audio(self, sr: int, audio_array) -> None:
        """
        Push audio from Gradio streaming callback.
        Only valid after ``start_gradio()``.
        """
        if isinstance(self._capture, GradioStreamCapture):
            self._capture.push_chunk(sr, audio_array)
        else:
            logger.warning("push_audio called but capture is not GradioStreamCapture")

    # ── Stop ─────────────────────────────────────────────────────────────

    def stop(self) -> None:
        """Gracefully stop all threads and clean up."""
        if not self._running:
            return
        self._running = False

        # Stop in reverse order
        if self._capture is not None:
            self._capture.stop()
            self._capture = None
        if self._buffer is not None:
            self._buffer.stop()
            self._buffer = None
        if self._feature_ext is not None:
            self._feature_ext.stop()
            self._feature_ext = None
        if self._inference_eng is not None:
            self._inference_eng.stop()
            self._inference_eng = None
        if self._decoder is not None:
            self._decoder.stop()
            self._decoder = None

        if self._metrics is not None:
            self._metrics.close()
            self._metrics = None

        # Clear queues
        self._q_raw = None
        self._q_buffer = None
        self._q_features = None
        self._q_inference = None

        logger.info("StreamingPipeline stopped — ready to restart")

    # ── Status ───────────────────────────────────────────────────────────

    @property
    def is_running(self) -> bool:
        return self._running

    def get_metrics(self) -> dict:
        """Return current rolling metrics summary."""
        if self._metrics is not None:
            return self._metrics.summary()
        return {"status": "no_data"}

    def reset(self) -> None:
        """Reset accumulated state (call when changing verse)."""
        if self._decoder is not None:
            self._decoder.reset()
        # Drain queues
        for q in [self._q_raw, self._q_buffer, self._q_features, self._q_inference]:
            if q is not None:
                while not q.empty():
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        break

    # ── Internal ─────────────────────────────────────────────────────────

    def _create_queues(self) -> None:
        """Create fresh inter-thread queues."""
        max_q = self._config.max_queue_size
        self._q_raw = queue.Queue(maxsize=max_q)
        self._q_buffer = queue.Queue(maxsize=max_q)
        self._q_features = queue.Queue(maxsize=max_q)
        self._q_inference = queue.Queue(maxsize=max_q)

    def _start_pipeline(self) -> None:
        """Spin up the buffer, feature, inference, and decoder threads."""
        self._metrics = MetricsCollector(self._config)

        self._buffer = BufferManager(self._config, self._q_raw, self._q_buffer)
        self._feature_ext = StreamingFeatureExtractor(
            self._config, self._processor, self._q_buffer, self._q_features
        )
        self._inference_eng = StreamingInferenceEngine(
            self._config, self._model, self._q_features, self._q_inference
        )
        self._decoder = StreamingDecoder(
            self._config,
            self._tokenizer,
            self._q_inference,
            self._metrics,
            ref_phonetizer_out=self._ref,
            on_prediction=self._on_prediction,
        )

        self._buffer.start()
        self._feature_ext.start()
        self._inference_eng.start()
        self._decoder.start()
        self._running = True

        logger.info("StreamingPipeline started — all threads running")
