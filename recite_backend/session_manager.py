"""
Session Manager — per-socket session state (no audio buffer needed; ASR is on client)
"""

from typing import Dict
from dataclasses import dataclass, field


@dataclass
class SessionState:
    global_word_pos: int = 0
    first_global: int = 0
    last_confidence: float = 0.0
    mode: str = 'tracking'          # 'tracking' or 'search'
    consecutive_low: int = 0
    current_sura: int = 1
    page_verse_ids: list = field(default_factory=list)


class SessionManager:
    def __init__(self, confidence_threshold: float = 0.4, max_low: int = 3):
        self._sessions: Dict[str, SessionState] = {}
        self.confidence_threshold = confidence_threshold
        self.max_low = max_low

    # ── lifecycle ──────────────────────────────────────────────────────────

    def create(self, sid: str) -> SessionState:
        state = SessionState()
        self._sessions[sid] = state
        return state

    def get(self, sid: str) -> SessionState:
        if sid not in self._sessions:
            return self.create(sid)
        return self._sessions[sid]

    def delete(self, sid: str):
        self._sessions.pop(sid, None)

    # ── updates ────────────────────────────────────────────────────────────

    def set_sura(self, sid: str, sura: int, verse_ids: list, first_global: int = 0):
        state = self.get(sid)
        state.current_sura = sura
        state.page_verse_ids = verse_ids
        state.global_word_pos = first_global
        state.first_global = first_global
        state.mode = 'tracking'
        state.consecutive_low = 0

    def update_from_alignment(self, sid: str, confidence: float, furthest: int):
        state = self.get(sid)
        state.global_word_pos = max(state.global_word_pos, furthest)
        state.last_confidence = confidence

        if confidence < self.confidence_threshold:
            state.consecutive_low += 1
        else:
            state.consecutive_low = 0

        state.mode = 'search' if state.consecutive_low >= self.max_low else 'tracking'

    def reset_position(self, sid: str):
        state = self.get(sid)
        state.global_word_pos = state.first_global
        state.mode = 'tracking'
        state.consecutive_low = 0
