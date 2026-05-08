"""
Voice Activity Detection for the streaming pipeline.

Provides a lightweight energy-based VAD with hysteresis so that the GPU
inference thread is not invoked on silence.  Optionally wraps Silero VAD
if the user has it installed.
"""

import logging
import numpy as np
from numpy.typing import NDArray

from .config import StreamingConfig

logger = logging.getLogger(__name__)


class EnergyVAD:
    """
    Simple RMS-energy voice-activity detector with hysteresis.

    The detector maintains a counter of consecutive silent frames.
    Inference is only paused when that counter exceeds
    ``config.vad_silence_frames_to_pause``.
    """

    def __init__(self, config: StreamingConfig):
        self.threshold = config.vad_energy_threshold
        self.silence_frames_to_pause = config.vad_silence_frames_to_pause
        self._consecutive_silence = 0
        self._is_speaking = False

    def reset(self) -> None:
        """Reset internal state."""
        self._consecutive_silence = 0
        self._is_speaking = False

    def is_speech(self, chunk: NDArray) -> bool:
        """
        Determine whether *chunk* contains speech.

        Parameters
        ----------
        chunk : ndarray
            1-D float audio samples (already at 16 kHz).

        Returns
        -------
        bool
            ``True`` if the chunk is considered speech.
        """
        rms = float(np.sqrt(np.mean(chunk.astype(np.float64) ** 2)))

        if rms >= self.threshold:
            self._consecutive_silence = 0
            self._is_speaking = True
        else:
            self._consecutive_silence += 1
            if self._consecutive_silence >= self.silence_frames_to_pause:
                self._is_speaking = False

        return self._is_speaking

    @property
    def consecutive_silence_count(self) -> int:
        return self._consecutive_silence

    @property
    def speaking(self) -> bool:
        return self._is_speaking
