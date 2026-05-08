"""
Streaming configuration for Quran Muaalem real-time inference.

All tunable parameters for the streaming pipeline are centralised here.
Defaults are optimised for RTX 3060 with ~125 ms end-to-end latency.
"""

from dataclasses import dataclass, field


@dataclass
class StreamingConfig:
    """Configuration for the real-time streaming pipeline."""

    # ── Audio ────────────────────────────────────────────────────────────
    sample_rate: int = 16_000
    """Must be 16 000 Hz — the model was trained on this rate."""

    channels: int = 1
    """Mono audio only."""

    # ── Chunking ─────────────────────────────────────────────────────────
    chunk_duration_ms: int = 500
    """Duration of each audio chunk sent to inference (ms)."""

    overlap_duration_ms: int = 250
    """Overlap between consecutive chunks for context continuity (ms)."""

    context_duration_s: float = 4.0
    """Rolling context window length (seconds)."""

    # ── VAD ───────────────────────────────────────────────────────────────
    vad_enabled: bool = True
    """Enable voice-activity detection to skip silent chunks."""

    vad_energy_threshold: float = 0.01
    """RMS energy below this value is considered silence."""

    vad_silence_frames_to_pause: int = 6
    """Number of consecutive silent chunks before pausing inference."""

    # ── GPU / Inference ──────────────────────────────────────────────────
    device: str = "cuda"
    """Torch device string.  Falls back to cpu if CUDA is unavailable."""

    dtype_str: str = "bfloat16"
    """Inference dtype: 'bfloat16', 'float16', or 'float32'."""

    use_cuda_streams: bool = True
    """Use a dedicated CUDA stream for async kernel execution."""

    pin_memory: bool = True
    """Pin host memory for faster H2D transfers."""

    model_name_or_path: str = "obadx/muaalem-model-v3_2"
    """HuggingFace model identifier or local path."""

    # ── Decoding / Smoothing ─────────────────────────────────────────────
    smoothing_window: int = 3
    """Number of past chunk predictions to average for temporal stability."""

    confidence_threshold: float = 0.3
    """Minimum average confidence to emit a phoneme prediction."""

    # ── Buffer ───────────────────────────────────────────────────────────
    ring_buffer_duration_s: float = 10.0
    """Maximum duration the ring buffer can hold (seconds)."""

    max_queue_size: int = 50
    """Maximum items in inter-thread queues before back-pressure."""

    # ── Metrics / Logging ────────────────────────────────────────────────
    log_to_file: bool = False
    """Write structured JSON logs to disk."""

    log_file_path: str = "streaming_metrics.jsonl"
    """Path for the JSON-lines log file."""

    metrics_rolling_window: int = 20
    """Number of recent chunks used for rolling-average metrics."""

    # ── Derived helpers ──────────────────────────────────────────────────
    @property
    def chunk_samples(self) -> int:
        """Number of audio samples per chunk."""
        return int(self.sample_rate * self.chunk_duration_ms / 1000)

    @property
    def overlap_samples(self) -> int:
        """Number of overlapping samples between consecutive chunks."""
        return int(self.sample_rate * self.overlap_duration_ms / 1000)

    @property
    def context_samples(self) -> int:
        """Total rolling-context samples."""
        return int(self.sample_rate * self.context_duration_s)

    @property
    def ring_buffer_samples(self) -> int:
        """Total ring-buffer capacity in samples."""
        return int(self.sample_rate * self.ring_buffer_duration_s)

    @property
    def torch_dtype(self):
        import torch
        _map = {
            "bfloat16": torch.bfloat16,
            "float16": torch.float16,
            "float32": torch.float32,
        }
        return _map.get(self.dtype_str, torch.bfloat16)
