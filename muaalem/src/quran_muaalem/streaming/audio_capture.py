"""
Audio capture module for real-time streaming.

Provides two backends:
* ``MicrophoneCapture`` — live microphone input via ``sounddevice``
* ``FileStreamCapture`` — streams a WAV/MP3 file in chunks (for testing)

Both push raw float32 numpy arrays into a ``queue.Queue`` consumed by
the buffer manager thread.
"""

import logging
import threading
import queue
import time
from typing import Optional

import numpy as np
from numpy.typing import NDArray

from .config import StreamingConfig

logger = logging.getLogger(__name__)


class AudioCapture:
    """
    Base class for audio capture backends.

    Subclasses must implement ``_run()`` which is executed in a daemon thread.
    Audio chunks are pushed to ``self._queue``.
    """

    def __init__(self, config: StreamingConfig, out_queue: queue.Queue):
        self._config = config
        self._queue = out_queue
        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ── lifecycle ────────────────────────────────────────────────────────

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            logger.warning("AudioCapture already running")
            return
        self._running.set()
        self._thread = threading.Thread(target=self._run, daemon=True, name="audio-capture")
        self._thread.start()
        logger.info("AudioCapture started")

    def stop(self) -> None:
        self._running.clear()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        logger.info("AudioCapture stopped")

    @property
    def is_running(self) -> bool:
        return self._running.is_set()

    # ── subclass contract ────────────────────────────────────────────────

    def _run(self) -> None:
        raise NotImplementedError


class MicrophoneCapture(AudioCapture):
    """
    Captures audio from the default microphone using ``sounddevice``.

    Uses a callback-based stream so that the capture never blocks
    the main thread or the GPU inference thread.
    """

    def _run(self) -> None:
        try:
            import sounddevice as sd
        except ImportError:
            logger.error("sounddevice not installed — run: pip install sounddevice")
            return

        chunk_samples = self._config.chunk_samples
        sr = self._config.sample_rate

        def _callback(indata: NDArray, frames: int, time_info, status):
            if status:
                logger.warning("sounddevice status: %s", status)
            if self._running.is_set():
                # indata shape: (frames, channels) — squeeze to 1-D
                chunk = indata[:, 0].copy().astype(np.float32)
                try:
                    self._queue.put_nowait(chunk)
                except queue.Full:
                    logger.warning("Audio capture queue full — dropping chunk")

        with sd.InputStream(
            samplerate=sr,
            channels=self._config.channels,
            blocksize=chunk_samples,
            dtype="float32",
            callback=_callback,
        ):
            logger.info(
                "Microphone stream open  sr=%d  chunk=%d samples", sr, chunk_samples
            )
            while self._running.is_set():
                time.sleep(0.05)

        logger.info("Microphone stream closed")


class FileStreamCapture(AudioCapture):
    """
    Streams audio from a file in real-time chunks (for testing / demo).

    Simulates real-time delivery by sleeping between chunks.
    """

    def __init__(
        self,
        config: StreamingConfig,
        out_queue: queue.Queue,
        file_path: str,
        realtime: bool = True,
    ):
        super().__init__(config, out_queue)
        self._file_path = file_path
        self._realtime = realtime

    def _run(self) -> None:
        from librosa.core import load as librosa_load

        wave, _ = librosa_load(self._file_path, sr=self._config.sample_rate, mono=True)
        chunk_samples = self._config.chunk_samples
        sleep_s = self._config.chunk_duration_ms / 1000.0

        total = len(wave)
        offset = 0
        logger.info(
            "FileStreamCapture: streaming %s (%d samples, %.1f s)",
            self._file_path, total, total / self._config.sample_rate,
        )

        while offset < total and self._running.is_set():
            end = min(offset + chunk_samples, total)
            chunk = wave[offset:end].astype(np.float32)
            # Zero-pad final chunk if shorter
            if len(chunk) < chunk_samples:
                chunk = np.pad(chunk, (0, chunk_samples - len(chunk)))
            try:
                self._queue.put_nowait(chunk)
            except queue.Full:
                logger.warning("File stream queue full — dropping chunk")
            offset = end
            if self._realtime:
                time.sleep(sleep_s)

        logger.info("FileStreamCapture: finished streaming file")


class GradioStreamCapture(AudioCapture):
    """
    Receives audio chunks pushed from the Gradio streaming callback.

    Unlike Microphone/File capture, this does not run its own thread.
    The Gradio callback calls ``push_chunk()`` directly.
    """

    def __init__(self, config: StreamingConfig, out_queue: queue.Queue):
        super().__init__(config, out_queue)
        self._running.set()  # Always "running" — lifecycle managed by Gradio
        self._chunks_received = 0

    def push_chunk(self, sr: int, audio_array: NDArray) -> None:
        """
        Push a chunk from Gradio's streaming callback.

        Gradio sends audio as (sample_rate, numpy_array).
        The array is typically int16 or float32, and may be 1-D or 2-D.
        """
        if not self._running.is_set():
            return

        if audio_array is None or len(audio_array) == 0:
            return

        raw = audio_array

        # ── Ensure mono ──────────────────────────────────────────────────
        if raw.ndim > 1:
            raw = raw[:, 0] if raw.shape[1] > 0 else raw.flatten()

        # ── Convert to float32 in [-1, 1] ────────────────────────────────
        # Check BEFORE casting — Gradio sends int16 very often
        if raw.dtype in (np.int16, np.int32):
            chunk = raw.astype(np.float32) / 32768.0
        elif raw.dtype == np.float64:
            chunk = raw.astype(np.float32)
        elif raw.dtype == np.float32:
            chunk = raw.copy()
            # If values look like int16 range (> 1.5), normalise
            if chunk.size > 0 and np.max(np.abs(chunk)) > 1.5:
                chunk = chunk / 32768.0
        else:
            chunk = raw.astype(np.float32)
            if chunk.size > 0 and np.max(np.abs(chunk)) > 1.5:
                chunk = chunk / 32768.0

        # ── Resample if needed ───────────────────────────────────────────
        if sr != self._config.sample_rate:
            try:
                import librosa
                chunk = librosa.resample(
                    chunk, orig_sr=sr, target_sr=self._config.sample_rate
                )
            except ImportError:
                logger.error("librosa needed for resampling — install it")
                return

        if chunk.size == 0:
            return

        self._chunks_received += 1
        if self._chunks_received <= 3 or self._chunks_received % 50 == 0:
            logger.info(
                "GradioStreamCapture: chunk #%d  sr=%d  samples=%d  dtype=%s  range=[%.4f, %.4f]",
                self._chunks_received, sr, len(chunk), chunk.dtype,
                float(np.min(chunk)), float(np.max(chunk)),
            )

        try:
            self._queue.put_nowait(chunk)
        except queue.Full:
            logger.warning("Gradio capture queue full — dropping chunk")

    def start(self) -> None:
        self._running.set()
        self._chunks_received = 0

    def stop(self) -> None:
        self._running.clear()

    def _run(self) -> None:
        pass  # No background thread needed
