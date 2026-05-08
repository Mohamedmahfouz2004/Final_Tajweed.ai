"""
Quran Alignment Engine
Fuzzy search + Levenshtein-based word alignment
Adapted from: github.com/harb993/tajweed.ai
"""

from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from Levenshtein import distance as levenshtein_distance
from rapidfuzz import process as rf_process, fuzz as rf_fuzz
import re
import logging

logger = logging.getLogger(__name__)


# ─── Data classes ────────────────────────────────────────────────────────────

@dataclass
class WordEntry:
    global_index: int
    sura: int
    aya: int
    aya_id: int
    word_index: int
    text: str


@dataclass
class VerseEntry:
    aya_id: int
    sura: int
    aya: int
    normalized_text: str
    words: List[WordEntry]


@dataclass
class SegmentCandidate:
    words: List[WordEntry]
    text: str
    start_global_index: int
    end_global_index: int
    score: float = 0.0


@dataclass
class AlignmentMatch:
    spoken_word: Optional[str]
    quran_word: Optional[WordEntry]
    similarity: float
    alignment_type: str   # "match", "insert", "delete"
    is_correct: bool


@dataclass
class AlignmentResult:
    matches: List[AlignmentMatch]
    confidence: float
    furthest_global_index: int
    segment_score: float


# ─── Config ──────────────────────────────────────────────────────────────────

class AlignmentConfig:
    ALPHA = 0.7
    BETA = 0.3
    SEGMENT_THRESHOLD = 0.30
    WORD_THRESHOLD = 0.4
    DELETE_COST = 0.8
    INSERT_COST = 0.8
    WINDOW_SIZE = 120
    BACKWARD_MARGIN = 0
    CONFIDENCE_THRESHOLD = 0.4
    MIN_SEGMENT_WORDS = 3
    MAX_SEGMENT_WORDS = 15
    SEGMENT_STRIDE = 2

    @classmethod
    def from_config(cls, cfg):
        """Build AlignmentConfig from a Config object, overriding defaults."""
        inst = cls()
        # Handle cases where cfg might be a dictionary or object
        def get_val(o, attr, default):
            if isinstance(o, dict): return o.get(attr, default)
            return getattr(o, attr, default)

        for attr in ('ALPHA', 'BETA', 'SEGMENT_THRESHOLD', 'WORD_THRESHOLD',
                     'DELETE_COST', 'INSERT_COST', 'WINDOW_SIZE', 'BACKWARD_MARGIN',
                     'CONFIDENCE_THRESHOLD', 'MIN_SEGMENT_WORDS', 'MAX_SEGMENT_WORDS',
                     'SEGMENT_STRIDE'):
            setattr(inst, attr, get_val(cfg, attr, getattr(inst, attr)))
        return inst


# ─── Helpers ─────────────────────────────────────────────────────────────────

def normalize_text(text: str) -> str:
    # Strip diacritics (tashkeel) and superscript alef
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    # Normalize Alef variants  أ إ آ ٱ → ا
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ٱ', 'ا')
    # Normalize Hamza-on-seat  ؤ → و ,  ئ → ي
    text = text.replace('ؤ', 'و').replace('ئ', 'ي')
    # Remove standalone Hamza  ء
    text = text.replace('ء', '')
    # Ta Marbuta → Ha,  Alef Maqsura → Ya
    text = text.replace('ة', 'ه').replace('ى', 'ي')
    # Remove tatweel (kashida)
    text = text.replace('\u0640', '')
    # Keep only Arabic letters and spaces
    text = re.sub(r'[^\u0621-\u063A\u0641-\u064A\u0627\s]', '', text)
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def calculate_similarity(word1: str, word2: str) -> float:
    if not word1 or not word2:
        return 0.0
    max_len = max(len(word1), len(word2))
    if max_len == 0:
        return 1.0
    return 1.0 - levenshtein_distance(word1, word2) / max_len


# ─── Data builder ────────────────────────────────────────────────────────────

class QuranDataBuilder:
    @staticmethod
    def build_indices(quran_data: List[Dict[str, Any]]) -> Tuple[List[WordEntry], List[VerseEntry], Dict[int, VerseEntry]]:
        all_words: List[WordEntry] = []
        verses: List[VerseEntry] = []
        aya_id_map: Dict[int, VerseEntry] = {}
        global_index = 0

        for aya_data in quran_data:
            aya_id = aya_data['id']
            sura = aya_data.get('sura_no', aya_data.get('sura', 0))
            aya = aya_data.get('aya_no', aya_data.get('aya', 0))

            raw_text = aya_data.get('aya_text_emlaey', '')
            normalized = normalize_text(raw_text)
            words_in_verse = [w for w in normalized.split() if w]

            verse_words: List[WordEntry] = []
            for word_index, word_text in enumerate(words_in_verse):
                entry = WordEntry(
                    global_index=global_index,
                    sura=sura, aya=aya, aya_id=aya_id,
                    word_index=word_index, text=word_text
                )
                all_words.append(entry)
                verse_words.append(entry)
                global_index += 1

            verse_entry = VerseEntry(
                aya_id=aya_id, sura=sura, aya=aya,
                normalized_text=normalized, words=verse_words
            )
            verses.append(verse_entry)
            aya_id_map[aya_id] = verse_entry

        return all_words, verses, aya_id_map


# ─── Segment generator ───────────────────────────────────────────────────────

class SegmentGenerator:
    def __init__(self, all_words: List[WordEntry], config: AlignmentConfig):
        self.all_words = all_words
        self.config = config

    def generate_tracking_candidates(self, anchor_pos: int, sura: Optional[int] = None) -> List[SegmentCandidate]:
        """Generate candidates FORWARD from anchor_pos, constrained to the surah."""
        start = anchor_pos
        end = min(start + self.config.WINDOW_SIZE, len(self.all_words))

        # Constrain window to surah boundaries
        if sura is not None:
            while start < len(self.all_words) and self.all_words[start].sura != sura:
                start += 1
            while end > start and end - 1 < len(self.all_words) and self.all_words[end - 1].sura != sura:
                end -= 1

        return self._generate(self.all_words[start:end])

    def generate_search_candidates(self, verse_ids: List[int], aya_id_map: Dict[int, VerseEntry]) -> List[SegmentCandidate]:
        segments: List[SegmentCandidate] = []
        for aya_id in verse_ids:
            if aya_id not in aya_id_map:
                continue
            verse = aya_id_map[aya_id]
            if verse.words:
                segments.append(SegmentCandidate(
                    words=verse.words,
                    text=' '.join(w.text for w in verse.words),
                    start_global_index=verse.words[0].global_index,
                    end_global_index=verse.words[-1].global_index
                ))
        return segments

    def _generate(self, words: List[WordEntry]) -> List[SegmentCandidate]:
        segments: List[SegmentCandidate] = []
        cfg = self.config
        for start in range(0, len(words), cfg.SEGMENT_STRIDE):
            for length in range(cfg.MIN_SEGMENT_WORDS, cfg.MAX_SEGMENT_WORDS + 1):
                end = start + length
                if end > len(words):
                    break
                sw = words[start:end]
                segments.append(SegmentCandidate(
                    words=sw,
                    text=' '.join(w.text for w in sw),
                    start_global_index=sw[0].global_index,
                    end_global_index=sw[-1].global_index
                ))
        return segments


# ─── Segment scorer ──────────────────────────────────────────────────────────

class SegmentScorer:
    def __init__(self, config: AlignmentConfig):
        self.config = config

    def score(self, spoken_text: str, segment: SegmentCandidate) -> float:
        Q, V = spoken_text, segment.text
        dist = levenshtein_distance(Q, V)
        mx = max(len(Q), len(V))
        if mx == 0:
            return 0.0
        norm_dist = dist / mx
        length_penalty = abs(len(Q) - len(V)) / mx
        return max(0.0, 1.0 - (self.config.ALPHA * norm_dist + self.config.BETA * length_penalty))

    def find_best(self, spoken_text: str, candidates: List[SegmentCandidate], top_n: int = 5) -> List[SegmentCandidate]:
        if not candidates:
            return []
        choices = [c.text for c in candidates]
        results = rf_process.extract(
            spoken_text, choices,
            scorer=rf_fuzz.ratio,
            limit=top_n,
            score_cutoff=self.config.SEGMENT_THRESHOLD * 100
        )
        if not results:
            return []
        best = []
        for text, score, idx in results:
            candidates[idx].score = score / 100.0
            best.append(candidates[idx])
        return best


# ─── Word aligner ────────────────────────────────────────────────────────────

class WordAligner:
    def __init__(self, config: AlignmentConfig):
        self.config = config

    def align(self, spoken_words: List[str], segment_words: List[WordEntry]) -> List[AlignmentMatch]:
        m, n = len(spoken_words), len(segment_words)
        if m == 0 or n == 0:
            return []

        INF = float('inf')
        dp = [[INF] * (n + 1) for _ in range(m + 1)]
        dp[0][0] = 0.0
        for j in range(1, n + 1):
            dp[0][j] = dp[0][j-1] + self.config.INSERT_COST
        for i in range(1, m + 1):
            dp[i][0] = dp[i-1][0] + self.config.DELETE_COST

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                sim = calculate_similarity(spoken_words[i-1], segment_words[j-1].text)
                dp[i][j] = min(
                    dp[i-1][j-1] + (1.0 - sim),
                    dp[i-1][j] + self.config.DELETE_COST,
                    dp[i][j-1] + self.config.INSERT_COST
                )

        return self._backtrack(dp, spoken_words, segment_words)

    def _backtrack(self, dp, spoken_words, segment_words) -> List[AlignmentMatch]:
        matches: List[AlignmentMatch] = []
        i, j = len(spoken_words), len(segment_words)

        while i > 0 or j > 0:
            if i == 0:
                j -= 1
                matches.append(AlignmentMatch(None, segment_words[j], 0.0, 'delete', False))
            elif j == 0:
                i -= 1
                matches.append(AlignmentMatch(spoken_words[i], None, 0.0, 'insert', False))
            else:
                sw = spoken_words[i-1]
                qw = segment_words[j-1]
                sim = calculate_similarity(sw, qw.text)
                match_cost = 1.0 - sim
                if dp[i][j] == dp[i-1][j-1] + match_cost:
                    matches.append(AlignmentMatch(sw, qw, sim, 'match', sim >= self.config.WORD_THRESHOLD))
                    i -= 1; j -= 1
                elif dp[i][j] == dp[i-1][j] + self.config.DELETE_COST:
                    matches.append(AlignmentMatch(sw, None, 0.0, 'insert', False))
                    i -= 1
                else:
                    matches.append(AlignmentMatch(None, qw, 0.0, 'delete', False))
                    j -= 1

        matches.reverse()
        return matches


# ─── Special phrase handler ───────────────────────────────────────────────────

class SpecialPhraseHandler:
    """Strip common prefixed phrases (Istiatha, Basmallah) before alignment."""

    def __init__(self):
        self.istiatha_words = normalize_text('أعوذ بالله من الشيطان الرجيم').split()
        self.basmallah_words = normalize_text('بسم الله الرحمن الرحيم').split()

    def strip(self, spoken_words: List[str]) -> Tuple[List[str], List[str]]:
        detected: List[str] = []
        remaining = spoken_words[:]

        if self._matches(remaining, self.istiatha_words):
            detected.append('istiatha')
            remaining = remaining[len(self.istiatha_words):]

        if self._matches(remaining, self.basmallah_words):
            detected.append('basmallah')
            remaining = remaining[len(self.basmallah_words):]

        return remaining, detected

    def _matches(self, words: List[str], phrase: List[str], threshold: float = 0.65) -> bool:
        if len(words) < len(phrase):
            return False
        total = sum(calculate_similarity(words[i], phrase[i]) for i in range(len(phrase)))
        return (total / len(phrase)) >= threshold


# ─── Main engine ─────────────────────────────────────────────────────────────

class QuranAlignmentEngine:
    def __init__(self, quran_data: List[Dict[str, Any]], config=None):
        if config is not None:
            self.config = AlignmentConfig.from_config(config)
        else:
            self.config = AlignmentConfig()
        self.all_words, self.verses, self.aya_id_map = QuranDataBuilder.build_indices(quran_data)
        self.generator = SegmentGenerator(self.all_words, self.config)
        self.scorer = SegmentScorer(self.config)
        self.aligner = WordAligner(self.config)
        self.phrase_handler = SpecialPhraseHandler()
        logger.info(f"Loaded {len(self.all_words)} words, {len(self.verses)} verses")

    def align(self, transcript: str, anchor_pos: int, mode: str,
              page_verse_ids: Optional[List[int]] = None,
              current_sura: Optional[int] = None) -> AlignmentResult:
        spoken_norm = normalize_text(transcript)
        spoken_words = [w for w in spoken_norm.split() if w]
        if not spoken_words:
            return AlignmentResult([], 0.0, anchor_pos, 0.0)

        remaining, detected = self.phrase_handler.strip(spoken_words)
        alignment_words = remaining if remaining else spoken_words
        alignment_text = ' '.join(alignment_words)

        if mode == 'tracking':
            candidates = self.generator.generate_tracking_candidates(anchor_pos, sura=current_sura)
        else:
            ids = page_verse_ids or list(self.aya_id_map.keys())
            candidates = self.generator.generate_search_candidates(ids, self.aya_id_map)

        if not candidates:
            return AlignmentResult([], 0.0, anchor_pos, 0.0)

        best = self.scorer.find_best(alignment_text, candidates)
        if not best:
            return AlignmentResult([], 0.0, anchor_pos, 0.0)

        best_segment = best[0]
        matches = self.aligner.align(alignment_words, best_segment.words)

        match_sims = [m.similarity for m in matches if m.alignment_type == 'match']
        confidence = sum(match_sims) / len(match_sims) if match_sims else 0.0

        correct_indices = [m.quran_word.global_index for m in matches if m.is_correct and m.quran_word]
        furthest = max(correct_indices) if correct_indices else anchor_pos

        return AlignmentResult(
            matches=matches,
            confidence=confidence,
            furthest_global_index=furthest,
            segment_score=best_segment.score
        )

    def get_ayah_first_index(self, sura: int, aya: int) -> int:
        """Return the global index of the first word in a specific ayah."""
        for w in self.all_words:
            if w.sura == sura and w.aya == aya:
                return w.global_index
        return self.get_surah_first_index(sura)

    def get_surah_first_index(self, sura: int) -> int:
        for w in self.all_words:
            if w.sura == sura:
                return w.global_index
        return 0

    def get_surah_words(self, sura: int) -> List[Dict]:
        result = []
        for v in self.verses:
            if v.sura != sura:
                continue
            for w in v.words:
                result.append({
                    'global_index': w.global_index,
                    'sura': w.sura,
                    'aya': w.aya,
                    'aya_id': w.aya_id,
                    'word_index': w.word_index,
                    'text': w.text,
                })
        return result
