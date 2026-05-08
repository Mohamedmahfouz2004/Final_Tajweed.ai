"""
config.py — Tunable parameters for Quran alignment engine
"""

class Config:
    # Segment scoring
    ALPHA = 0.7
    BETA = 0.3
    SEGMENT_THRESHOLD = 0.30

    # Word-level alignment  (0.4 is forgiving for Web Speech API Arabic variations)
    WORD_THRESHOLD = 0.4
    DELETE_COST = 0.8
    INSERT_COST = 0.8

    # Tracking window  (forward-only, no backward lookback)
    WINDOW_SIZE = 120
    BACKWARD_MARGIN = 0

    # Mode switching
    CONFIDENCE_THRESHOLD = 0.4
    MAX_LOW_CONFIDENCE = 3

    # Segment generation
    MIN_SEGMENT_WORDS = 3
    MAX_SEGMENT_WORDS = 15
    SEGMENT_STRIDE = 2

    # Sequence detection
    SEQUENCE_SKIP_MIN_WORDS = 12
    SEQUENCE_SKIP_MIN_AYAS = 1
    BACKWARDS_TOLERANCE = 5

    # Minimum spoken words before alignment runs (filters noise)
    MIN_SPOKEN_WORDS = 2
