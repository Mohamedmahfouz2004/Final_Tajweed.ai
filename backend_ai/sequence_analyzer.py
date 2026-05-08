"""
Sequence Analyzer — detects verse skips and page mismatches
Adapted from: github.com/yayaiu6/Real-Time-Quran-recitation-tracker-System
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class SequenceError:
    error_type: str   # "skip_aya", "page_mismatch"
    severity: str     # "warning", "error"
    message: str
    details: Dict[str, Any]


class SequenceAnalyzer:
    def __init__(
        self,
        skip_min_words: int = 12,
        skip_min_ayas: int = 1,
        backwards_tolerance: int = 5,
        low_confidence_threshold: float = 0.3,
        min_segment_score: float = 0.4
    ):
        self.skip_min_words = skip_min_words
        self.skip_min_ayas = skip_min_ayas
        self.backwards_tolerance = backwards_tolerance
        self.low_confidence_threshold = low_confidence_threshold
        self.min_segment_score = min_segment_score

    def analyze(self, prev_pos: int, alignment_result, all_words: List, consecutive_low: int = 0) -> Optional[SequenceError]:
        correct_matches = [
            m for m in alignment_result.matches
            if m.alignment_type == 'match' and m.is_correct and m.quran_word
        ]

        # No correct matches at all
        if not correct_matches:
            if (consecutive_low >= 3
                    and alignment_result.confidence < self.low_confidence_threshold
                    and alignment_result.segment_score < self.min_segment_score):
                return SequenceError(
                    error_type='page_mismatch',
                    severity='error',
                    message='التلاوة لا تطابق هذه الصفحة.',
                    details={'confidence': alignment_result.confidence}
                )
            return None

        # Check for forward skip
        global_indices = [m.quran_word.global_index for m in correct_matches]
        min_idx = min(global_indices)
        gap = min_idx - prev_pos

        if gap >= self.skip_min_words:
            # Count how many full ayas were skipped
            skipped_aya_ids = set()
            for w in all_words[prev_pos:min_idx]:
                skipped_aya_ids.add(w.aya_id)

            if len(skipped_aya_ids) >= self.skip_min_ayas:
                return SequenceError(
                    error_type='skip_aya',
                    severity='warning',
                    message=f'تم تخطي {len(skipped_aya_ids)} آية(آيات).',
                    details={'skipped_ayas': len(skipped_aya_ids), 'gap': gap}
                )

        # Check for backwards anomaly (going back significantly)
        max_idx = max(global_indices)
        if max_idx < prev_pos - self.backwards_tolerance:
            backwards_dist = prev_pos - max_idx
            return SequenceError(
                error_type='backwards_anomaly',
                severity='warning',
                message=f'تم الرجوع للخلف بمقدار {backwards_dist} كلمة.',
                details={'backwards_distance': backwards_dist}
            )

        return None
