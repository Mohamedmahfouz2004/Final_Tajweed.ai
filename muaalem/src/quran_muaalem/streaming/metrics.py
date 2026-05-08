"""
Structured metrics collection and JSON logging for the streaming pipeline.

Every chunk produces a ``ChunkMetrics`` snapshot.  The ``MetricsCollector``
maintains a rolling window and exposes aggregates suitable for dashboard
display or Prometheus scraping.
"""

import json
import time
import logging
import threading
from dataclasses import dataclass, field, asdict
from collections import deque
from pathlib import Path
from typing import Optional

from .config import StreamingConfig

logger = logging.getLogger(__name__)


@dataclass
class ChunkMetrics:
    """Metrics captured for a single processed chunk."""

    chunk_index: int = 0
    timestamp: float = 0.0

    # Latency (milliseconds)
    capture_latency_ms: float = 0.0
    feature_latency_ms: float = 0.0
    inference_latency_ms: float = 0.0
    decode_latency_ms: float = 0.0
    total_latency_ms: float = 0.0

    # Real-time factor
    rtf: float = 0.0
    chunk_duration_ms: float = 0.0

    # Buffer
    buffer_fill_pct: float = 0.0
    chunks_dropped: int = 0

    # GPU
    gpu_util_pct: float = 0.0
    vram_used_mb: float = 0.0

    # Prediction
    is_speech: bool = True
    prediction_confidence: float = 0.0
    num_phonemes: int = 0

    # Errors
    error: Optional[str] = None


class MetricsCollector:
    """
    Thread-safe metrics collector with rolling-window aggregation.

    Usage
    -----
    >>> mc = MetricsCollector(config)
    >>> mc.record(chunk_metrics)
    >>> print(mc.summary())
    """

    def __init__(self, config: StreamingConfig):
        self._config = config
        self._window: deque[ChunkMetrics] = deque(
            maxlen=config.metrics_rolling_window
        )
        self._lock = threading.Lock()
        self._total_chunks = 0
        self._total_dropped = 0
        self._start_time = time.time()

        # Optional file logger
        self._log_fh = None
        if config.log_to_file:
            path = Path(config.log_file_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            self._log_fh = open(path, "a", encoding="utf-8")
            logger.info("Metrics logging to %s", path)

    # ── Public API ───────────────────────────────────────────────────────

    def record(self, m: ChunkMetrics) -> None:
        """Record a single chunk's metrics."""
        with self._lock:
            self._window.append(m)
            self._total_chunks += 1
            self._total_dropped += m.chunks_dropped

        if self._log_fh is not None:
            line = json.dumps(asdict(m), ensure_ascii=False)
            self._log_fh.write(line + "\n")
            self._log_fh.flush()

    def summary(self) -> dict:
        """Return a rolling-window summary dict (safe to serialise)."""
        with self._lock:
            if not self._window:
                return {"status": "no_data"}
            recent = list(self._window)

        n = len(recent)
        avg = lambda attr: sum(getattr(m, attr) for m in recent) / n

        return {
            "total_chunks_processed": self._total_chunks,
            "total_chunks_dropped": self._total_dropped,
            "uptime_s": round(time.time() - self._start_time, 1),
            "avg_total_latency_ms": round(avg("total_latency_ms"), 2),
            "avg_inference_latency_ms": round(avg("inference_latency_ms"), 2),
            "avg_rtf": round(avg("rtf"), 4),
            "avg_buffer_fill_pct": round(avg("buffer_fill_pct"), 1),
            "avg_confidence": round(avg("prediction_confidence"), 3),
            "avg_gpu_util_pct": round(avg("gpu_util_pct"), 1),
            "avg_vram_mb": round(avg("vram_used_mb"), 1),
            "latest_latency_ms": round(recent[-1].total_latency_ms, 2),
            "latest_rtf": round(recent[-1].rtf, 4),
            "is_speech": recent[-1].is_speech,
        }

    def close(self) -> None:
        """Flush and close the log file."""
        if self._log_fh is not None:
            self._log_fh.close()
            self._log_fh = None
