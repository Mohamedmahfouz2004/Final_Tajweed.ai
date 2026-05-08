"""
Quran Muaalem — Real-time Streaming sub-package.

Public API
----------
StreamingConfig     Configuration dataclass for all tunable parameters.
StreamingPipeline   End-to-end pipeline wiring capture → inference → decode.
"""

from .config import StreamingConfig
from .pipeline import StreamingPipeline
from .metrics import ChunkMetrics, MetricsCollector

__all__ = [
    "StreamingConfig",
    "StreamingPipeline",
    "ChunkMetrics",
    "MetricsCollector",
]
