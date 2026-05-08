"""
Ring buffer and sliding-window manager.

Sits between audio capture and feature extraction.  Maintains a circular
numpy buffer that stores incoming samples and yields overlapping windows
for inference.
"""

import logging
import threading
import queue
import time
from dataclasses import dataclass
from typing import Optional

import numpy as np
from numpy.typing import NDArray

from .config import StreamingConfig

logger = logging.getLogger(__name__)


@dataclass
class BufferChunk:
    """A chunk ready for feature extraction."""
    audio: NDArray           # 1-D float32 array
    chunk_index: int
    timestamp: float         # wall-clock time when the chunk was assembled
    capture_latency_ms: float  # time from first sample capture to chunk assembly


class RingBuffer:
    """
    Lock-free (single-producer / single-consumer) circular buffer backed
    by a contiguous numpy array.

    Parameters
    ----------
    capacity : int
        Maximum number of float32 samples the buffer can hold.
    """

    def __init__(self, capacity: int):
        self._buf = np.zeros(capacity, dtype=np.float32)
        self._capacity = capacity
        self._write_pos = 0
        self._read_pos = 0
        self._lock = threading.Lock()

    # ── write ────────────────────────────────────────────────────────────

    def write(self, data: NDArray) -> int:
        """
        Append *data* to the buffer.  Returns the number of samples
        actually written (may be less than ``len(data)`` if the buffer
        is full).
        """
        n = len(data)
        with self._lock:
            available = self._capacity - self.level
            to_write = min(n, available)
            if to_write == 0:
                return 0

            end = self._write_pos + to_write
            if end <= self._capacity:
                self._buf[self._write_pos:end] = data[:to_write]
            else:
                first = self._capacity - self._write_pos
                self._buf[self._write_pos:] = data[:first]
                self._buf[:to_write - first] = data[first:to_write]
            self._write_pos = (self._write_pos + to_write) % self._capacity
        return to_write

    # ── read ─────────────────────────────────────────────────────────────

    def read(self, n: int) -> NDArray:
        """
        Read (and consume) up to *n* samples.
        """
        with self._lock:
            avail = self.level
            to_read = min(n, avail)
            if to_read == 0:
                return np.array([], dtype=np.float32)

            end = self._read_pos + to_read
            if end <= self._capacity:
                out = self._buf[self._read_pos:end].copy()
            else:
                first = self._capacity - self._read_pos
                out = np.concatenate([
                    self._buf[self._read_pos:],
                    self._buf[:to_read - first],
                ])
            self._read_pos = (self._read_pos + to_read) % self._capacity
        return out

    def peek(self, n: int) -> NDArray:
        """Read *n* samples WITHOUT consuming them."""
        with self._lock:
            avail = self.level
            to_read = min(n, avail)
            if to_read == 0:
                return np.array([], dtype=np.float32)

            end = self._read_pos + to_read
            if end <= self._capacity:
                return self._buf[self._read_pos:end].copy()
            else:
                first = self._capacity - self._read_pos
                return np.concatenate([
                    self._buf[self._read_pos:],
                    self._buf[:to_read - first],
                ])

    # ── helpers ──────────────────────────────────────────────────────────

    @property
    def level(self) -> int:
        """Number of unread samples currently in the buffer."""
        diff = self._write_pos - self._read_pos
        if diff < 0:
            diff += self._capacity
        return diff

    @property
    def fill_pct(self) -> float:
        """Buffer fill as a percentage."""
        return (self.level / self._capacity) * 100.0

    def reset(self) -> None:
        with self._lock:
            self._write_pos = 0
            self._read_pos = 0


class BufferManager:
    """
    Thread that consumes raw audio chunks from the capture queue,
    stores them in a :class:`RingBuffer`, and emits overlapping
    :class:`BufferChunk` objects to the feature-extraction queue.
    """

    def __init__(
        self,
        config: StreamingConfig,
        in_queue: queue.Queue,
        out_queue: queue.Queue,
    ):
        self._config = config
        self._in_queue = in_queue
        self._out_queue = out_queue
        self._ring = RingBuffer(config.ring_buffer_samples)
        self._overlap_buf: NDArray = np.array([], dtype=np.float32)
        self._chunk_index = 0
        self._chunks_dropped = 0
        self._running = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ── lifecycle ────────────────────────────────────────────────────────

    def start(self) -> None:
        self._running.set()
        self._thread = threading.Thread(
            target=self._run, daemon=True, name="buffer-manager"
        )
        self._thread.start()
        logger.info("BufferManager started")

    def stop(self) -> None:
        self._running.clear()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        logger.info("BufferManager stopped")

    # ── metrics ──────────────────────────────────────────────────────────

    @property
    def buffer_fill_pct(self) -> float:
        return self._ring.fill_pct

    @property
    def chunks_dropped(self) -> int:
        return self._chunks_dropped

    # ── main loop ────────────────────────────────────────────────────────

    def _run(self) -> None:
        chunk_samples = self._config.chunk_samples
        overlap_samples = self._config.overlap_samples

        while self._running.is_set():
            try:
                raw_chunk = self._in_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            t_capture = time.perf_counter()

            # Write into ring buffer
            written = self._ring.write(raw_chunk)
            if written < len(raw_chunk):
                self._chunks_dropped += 1
                logger.warning("Ring buffer full — dropped %d samples", len(raw_chunk) - written)

            # Emit windowed chunks while enough data is available
            while self._ring.level >= chunk_samples:
                # Read chunk_samples from ring (consuming them)
                new_data = self._ring.read(chunk_samples)

                # Build the overlapping window
                if len(self._overlap_buf) > 0:
                    windowed = np.concatenate([self._overlap_buf, new_data])
                else:
                    windowed = new_data

                # Save overlap for next window
                if overlap_samples > 0 and len(new_data) >= overlap_samples:
                    self._overlap_buf = new_data[-overlap_samples:].copy()
                else:
                    self._overlap_buf = np.array([], dtype=np.float32)

                capture_latency = (time.perf_counter() - t_capture) * 1000.0

                bc = BufferChunk(
                    audio=windowed,
                    chunk_index=self._chunk_index,
                    timestamp=time.time(),
                    capture_latency_ms=capture_latency,
                )
                try:
                    self._out_queue.put_nowait(bc)
                except queue.Full:
                    self._chunks_dropped += 1
                    logger.warning("Feature queue full — dropping chunk %d", self._chunk_index)

                self._chunk_index += 1

        logger.info("BufferManager loop exited")
