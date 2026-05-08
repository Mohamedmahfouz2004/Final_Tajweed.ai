"""
uthmani_annotator.py — Production-grade Phoneme→Uthmani Mapping Pipeline

Converts model phoneme-level predictions + diff operations into a structured,
character-level Uthmani annotation suitable for real-time streaming UI.

Architecture:
  1. UthmaniParser     — Parses raw Uthmani text into LetterUnits
  2. PhonemeMapper     — Builds bidirectional phoneme↔character index maps
  3. ErrorProjector    — Projects phoneme-level diffs + sifat errors → char-level
  4. AnnotationBuilder — Produces final structured JSON output

Complexity: O(n) where n = max(len(phonemes), len(uthmani_text))
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Literal

import diff_match_patch as dmp_module

from .explain import expalin_sifat

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
#  1. Data Types
# ═══════════════════════════════════════════════════════════════════════════

class ErrorType(str, Enum):
    """Exhaustive classification of character-level errors mapped to Tajweed rules."""
    NONE      = "none"
    PHONEME   = "phoneme"       # Wrong or missing phoneme (مخارج الحروف)
    MADD      = "madd"          # Elongation error (المدود)
    GHUNNA    = "ghunna"        # Nasalization error (الغنة / أحكام النون والميم)
    QALQALA   = "qalqala"       # Bounce/echo error (القلقلة)
    VOWEL     = "vowel"         # Harakat mismatch (الحركات والتشكيل)
    TAFKHEEM  = "tafkheem"      # Tafkheem/Tarqeeq error (التفخيم والترقيق)
    HAMS_JAHR = "hams_jahr"     # Hams/Jahr error (الهمس والجهر)
    SHIDDA    = "shidda"        # Shidda/Rakhawa error (الشدة والرخاوة)
    SAFEER    = "safeer"        # Safeer error (الصفير)
    ISTITALA  = "istitala"      # Istitala error (الاستطالة)
    SIFAT     = "sifat"         # Generic Tajweed attribute mismatch (صفات أخرى)
    INSERTION = "insertion"     # Extra phoneme not in reference (إضافة صوت زائد)
    DELETION  = "deletion"      # Missing phoneme from reference (حذف حرف)


class Severity(str, Enum):
    NONE   = "none"
    LOW    = "low"
    MEDIUM = "medium"
    HIGH   = "high"


class CharStatus(int, Enum):
    """Status codes for each character position."""
    FUTURE       = 0   # Not yet spoken (grey)
    CORRECT      = 1   # Phoneme + sifat match (green)
    PHONEME_ERR  = 2   # Phoneme mismatch (red)
    SIFAT_ERR    = 3   # Sifat mismatch (red)


@dataclass
class LetterUnit:
    """A logical Uthmani letter = base character + attached diacritics."""
    start: int          # Start index in the raw Uthmani string
    end: int            # End index (exclusive)
    text: str           # The actual substring
    is_letter: bool     # True if this is a consonant/vowel carrier
    is_wasla: bool = False  # True if this is Alif Wasla (ٱ)
    is_space: bool = False  # True if whitespace or ayah marker


@dataclass
class CharAnnotation:
    """Structured annotation for a single Uthmani character."""
    char: str
    index: int
    status: CharStatus = CharStatus.FUTURE
    error: bool = False
    error_type: ErrorType = ErrorType.NONE
    severity: Severity = Severity.NONE
    phoneme_range: list[int] = field(default_factory=list)
    sifat_idx: int | None = None
    tooltip: str = ""

    def to_dict(self) -> dict:
        return {
            "char": self.char,
            "index": self.index,
            "status": self.status.value,
            "error": self.error,
            "error_type": self.error_type.value,
            "severity": self.severity.value,
            "tooltip": self.tooltip,
        }


@dataclass
class AnnotationResult:
    """Complete annotation output."""
    text: str
    chars: list[CharAnnotation]
    locked_status: list[int]
    html: str = ""

    def to_json(self) -> dict:
        return {
            "text": self.text,
            "chars": [c.to_dict() for c in self.chars],
        }


# ═══════════════════════════════════════════════════════════════════════════
#  2. Uthmani Parser
# ═══════════════════════════════════════════════════════════════════════════

# Unicode ranges for Arabic diacritics
_DIACRITICS = (
    set(range(0x064B, 0x0656))
    | {0x0670, 0x0640, 0x06DF, 0x06E0, 0x06E2, 0x06E3,
       0x06E4, 0x06E5, 0x06E6, 0x06E7, 0x06E8,
       0x06EA, 0x06EB, 0x06EC, 0x06ED}
)

_ALIF_WASLA = 0x0671  # ٱ


def parse_uthmani(text: str) -> list[LetterUnit]:
    """
    Parse Uthmani text into discrete letter units.
    
    Each unit = one base letter + all its trailing diacritics.
    Spaces and ayah markers are separate non-letter units.
    
    Complexity: O(n), single pass.
    """
    units: list[LetterUnit] = []
    i = 0
    n = len(text)

    while i < n:
        ch = text[i]
        cp = ord(ch)

        # Spaces and ayah end markers
        if ch in (' ', '\u06DD'):
            units.append(LetterUnit(
                start=i, end=i + 1, text=ch,
                is_letter=False, is_space=True
            ))
            i += 1

        # Orphan diacritic — attach to previous letter unit
        elif cp in _DIACRITICS:
            if units and units[-1].is_letter:
                units[-1].end = i + 1
                units[-1].text = text[units[-1].start:i + 1]
            i += 1

        # Base letter + trailing diacritics
        else:
            start = i
            i += 1
            while i < n and ord(text[i]) in _DIACRITICS:
                i += 1
            is_wasla = (cp == _ALIF_WASLA)
            units.append(LetterUnit(
                start=start, end=i, text=text[start:i],
                is_letter=True, is_wasla=is_wasla
            ))

    return units


# ═══════════════════════════════════════════════════════════════════════════
#  3. Phoneme Mapper
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class PhonemeMap:
    """Bidirectional mapping between phoneme indices and character indices."""
    # phoneme_idx → list of char indices in uthmani_text
    phoneme_to_chars: list[list[int]]
    # phoneme_idx → ref_sifat index
    phoneme_to_sifat: dict[int, int]
    # ref_sifat_idx → list of char indices
    sifat_to_chars: dict[int, list[int]]
    # Content units (letters excluding wasla)
    content_units: list[LetterUnit]
    # All letter units including wasla
    all_units: list[LetterUnit]
    # Mapping length
    mapping_len: int


def build_phoneme_map(
    letter_units: list[LetterUnit],
    ref_sifat: list,
    ref_mappings: list | None = None,
) -> PhonemeMap:
    """
    Build the bidirectional phoneme↔character mapping.
    
    If ref_mappings is available (from quran-transcript >= 0.5.2), uses those
    for precise per-character mapping. Otherwise, falls back to a positional
    mapping derived from ref_sifat[i].phonemes.
    
    Complexity: O(n) where n = total characters/phonemes.
    """
    content_units = [
        u for u in letter_units
        if u.is_letter and not u.is_wasla
    ]
    all_letter = [u for u in letter_units if u.is_letter]

    # Map each phoneme index to its parent sifat index
    phoneme_to_sifat: dict[int, int] = {}
    phoneme_idx = 0
    for i, sifa in enumerate(ref_sifat):
        for p in sifa.phonemes:
            for _ in p:
                phoneme_to_sifat[phoneme_idx] = i
                phoneme_idx += 1

    total_phonemes = phoneme_idx
    phoneme_to_chars: list[list[int]] = [[] for _ in range(total_phonemes)]
    sifat_to_chars: dict[int, list[int]] = {i: [] for i in range(len(ref_sifat))}

    if ref_mappings is not None and len(ref_mappings) > 0:
        # ── Path A: Use precise ref_mappings from quran-transcript ──
        for unit in letter_units:
            char_indices = list(range(unit.start, unit.end))
            for char_idx in char_indices:
                mapping = ref_mappings[char_idx] if char_idx < len(ref_mappings) else None
                is_deleted = getattr(mapping, "deleted", False) if mapping else True
                if mapping is not None and not is_deleted:
                    start_p, end_p = mapping.pos
                    for p_idx in range(start_p, end_p):
                        if p_idx < total_phonemes:
                            for c_idx in char_indices:
                                if c_idx not in phoneme_to_chars[p_idx]:
                                    phoneme_to_chars[p_idx].append(c_idx)
                            s_idx = phoneme_to_sifat.get(p_idx)
                            if s_idx is not None:
                                for c_idx in char_indices:
                                    if c_idx not in sifat_to_chars[s_idx]:
                                        sifat_to_chars[s_idx].append(c_idx)
    else:
        # ── Path B: Derive mapping by matching base letters ──
        #
        # Uses phoneme base consonants to find matching Uthmani characters.
        # This correctly handles gemination, madd, and silent letters.
        try:
            from quran_transcript.alphabet import phonetics as _ph
            _madd_chars = set(_ph.alif + _ph.yaa_madd + _ph.waw_madd)
        except Exception:
            _madd_chars = set('اۥۦ')

        _diacritics = (
            set(range(0x064B, 0x0656))
            | {0x0670, 0x0640, 0x06DF, 0x06E0, 0x06E2, 0x06E3,
               0x06E4, 0x06E5, 0x06E6, 0x06E7, 0x06E8,
               0x06EA, 0x06EB, 0x06EC, 0x06ED}
        )

        _alif_wasla = 0x0671
        _hamza = 'ء'
        _hamza_variants = set('أؤئٱء')

        def _normalize_letter(c):
            if c in _hamza_variants: return _hamza
            return c

        def _get_base_letter(text):
            stripped = ''.join(c for c in text if ord(c) not in _diacritics)
            if not stripped: return ''
            return _normalize_letter(stripped[0])

        def _get_sifat_letters(ph_str):
            chars = []
            for c in ph_str:
                if c in _madd_chars: continue
                if ord(c) in _diacritics: continue
                nc = _normalize_letter(c)
                if nc not in chars: chars.append(nc)
            return chars

        # Build mapping_units: [first_wasla?] + content_units
        mapping_units = []
        first_wasla_added = False
        for u in letter_units:
            if not u.is_letter:
                continue
            if u.is_wasla:
                if not first_wasla_added and u.start == 0:
                    mapping_units.append(u)
                    first_wasla_added = True
            else:
                mapping_units.append(u)

        mu_idx = 0
        last_unit = mapping_units[0] if mapping_units else None
        p_cursor = 0

        for sifat_idx, sifa in enumerate(ref_sifat):
            ph_raw = str(sifa.phonemes).replace(' ', '')
            sifat_letters = _get_sifat_letters(ph_raw)

            consumed_units = []
            if len(sifat_letters) == 0:
                # Madd: attach to previous letter unit
                if last_unit is not None:
                    consumed_units = [last_unit]
            else:
                temp_idx = mu_idx
                for sl in sifat_letters:
                    while temp_idx < len(mapping_units):
                        u = mapping_units[temp_idx]
                        ul = _get_base_letter(u.text)
                        consumed_units.append(u)
                        last_unit = u
                        temp_idx += 1
                        if ul == sl:
                            break
                mu_idx = temp_idx

            # Collect character indices from consumed units
            char_indices = []
            for u in consumed_units:
                for ci in range(u.start, u.end):
                    if ci not in char_indices:
                        char_indices.append(ci)

            for phoneme_chunk in sifa.phonemes:
                for _ in phoneme_chunk:
                    if p_cursor < total_phonemes:
                        for c_idx in char_indices:
                            if c_idx not in phoneme_to_chars[p_cursor]:
                                phoneme_to_chars[p_cursor].append(c_idx)
                        for c_idx in char_indices:
                            if c_idx not in sifat_to_chars[sifat_idx]:
                                sifat_to_chars[sifat_idx].append(c_idx)
                        p_cursor += 1

    return PhonemeMap(
        phoneme_to_chars=phoneme_to_chars,
        phoneme_to_sifat=phoneme_to_sifat,
        sifat_to_chars=sifat_to_chars,
        content_units=content_units,
        all_units=letter_units,
        mapping_len=len(content_units),
    )


# ═══════════════════════════════════════════════════════════════════════════
#  4. Error Projector
# ═══════════════════════════════════════════════════════════════════════════

# Sifat keys that indicate specific Tajweed error types
_SIFAT_ERROR_TYPE_MAP = {
    "ghonna":              ErrorType.GHUNNA,
    "qalqla":              ErrorType.QALQALA,
    "madd":                ErrorType.MADD,
    "vowel":               ErrorType.VOWEL,
    "movement":            ErrorType.VOWEL,
    "tafkheem_or_taqeeq":  ErrorType.TAFKHEEM,
    "hams_or_jahr":        ErrorType.HAMS_JAHR,
    "shidda_or_rakhawa":   ErrorType.SHIDDA,
    "safeer":              ErrorType.SAFEER,
    "istitala":            ErrorType.ISTITALA,
    "tafashie":            ErrorType.SIFAT,
    "tikraar":             ErrorType.SIFAT,
    "itbaq":               ErrorType.TAFKHEEM,  # الإطباق مرتبط بالتفخيم
}

# Keys to check in the sifat table for errors
_SIFAT_CHECK_KEYS = frozenset({
    "hams_or_jahr", "shidda_or_rakhawa", "tafkheem_or_taqeeq",
    "itbaq", "safeer", "qalqla", "tikraar", "tafashie",
    "istitala", "ghonna", "madd", "vowel", "movement",
})


def classify_sifat_error(
    row: dict,
    base_keys: list[str],
) -> tuple[ErrorType, Severity, str]:
    """
    Classify the specific error type from a sifat table row.
    
    Returns (error_type, severity, tooltip_message).
    """
    mismatched_keys: list[str] = []

    for key in base_keys:
        exp_key = f"exp_{key}"
        if row.get(exp_key) != row.get(key):
            mismatched_keys.append(key)

    if not mismatched_keys:
        return ErrorType.NONE, Severity.NONE, ""

    # Determine the most specific error type
    error_type = ErrorType.SIFAT
    for key in mismatched_keys:
        if key in _SIFAT_ERROR_TYPE_MAP:
            mapped_type = _SIFAT_ERROR_TYPE_MAP[key]
            if mapped_type != ErrorType.SIFAT:
                error_type = mapped_type
                break

    # Severity based on count of mismatches
    if len(mismatched_keys) >= 3:
        severity = Severity.HIGH
    elif len(mismatched_keys) >= 2:
        severity = Severity.MEDIUM
    else:
        severity = Severity.LOW

    # Build Arabic tooltip
    _SIFAT_KEY_ARABIC = {
        "hams_or_jahr": "الهمس/الجهر",
        "shidda_or_rakhawa": "الشدة/الرخاوة",
        "tafkheem_or_taqeeq": "التفخيم/الترقيق",
        "itbaq": "الإطباق/الانفتاح",
        "safeer": "الصفير",
        "qalqla": "القلقلة",
        "tikraar": "التكرار",
        "tafashie": "التفشي",
        "istitala": "الاستطالة",
        "ghonna": "الغنة",
        "madd": "المد",
        "vowel": "الحركة",
        "movement": "الحركة",
    }
    parts = []
    for key in mismatched_keys:
        exp_key = f"exp_{key}"
        expected = row.get(exp_key, "?")
        got = row.get(key, "?")
        ar_name = _SIFAT_KEY_ARABIC.get(key, key)
        parts.append(f"{ar_name}: المتوقع '{expected}' ← النطق '{got}'")
    tooltip = " | ".join(parts)

    return error_type, severity, tooltip


@dataclass
class SifatErrorInfo:
    """Error information for a specific ref_sifat index."""
    error_type: ErrorType
    severity: Severity
    tooltip: str


def detect_sifat_errors(
    predicted_sifat: list,
    ref_sifat: list,
    diffs: list,
) -> dict[int, SifatErrorInfo]:
    """
    Use expalin_sifat (same function as the matrix table) to detect
    which ref_sifat indices have errors and classify them.
    
    Returns: dict mapping ref_idx → SifatErrorInfo
    """
    errors: dict[int, SifatErrorInfo] = {}

    try:
        sifat_table = expalin_sifat(predicted_sifat, ref_sifat, diffs)
        if not sifat_table:
            return errors

        base_keys = [
            k for k in sifat_table[0].keys()
            if not k.startswith("exp_")
            and k not in ("tag", "ref_idx", "phonemes", "exp_phonemes")
        ]

        for row in sifat_table:
            tag = row.get("tag")
            ref_idx = row.get("ref_idx")
            if ref_idx is None:
                continue

            if tag == "exact":
                error_type, severity, tooltip = classify_sifat_error(row, base_keys)
                if error_type != ErrorType.NONE:
                    errors[ref_idx] = SifatErrorInfo(error_type, severity, tooltip)

            elif tag == "insert":
                errors[ref_idx] = SifatErrorInfo(
                    ErrorType.INSERTION, Severity.MEDIUM,
                    "Extra phoneme detected (insertion)"
                )

    except Exception as e:
        logger.warning("Sifat error detection failed: %s", e)

    return errors


def project_errors(
    uthmani_text: str,
    diffs: list,
    pmap: PhonemeMap,
    sifat_errors: dict[int, SifatErrorInfo],
    locked_status: list[int] | None = None,
) -> list[CharAnnotation]:
    """
    Project phoneme-level diff operations + sifat errors onto Uthmani characters.
    
    Algorithm:
      1. Walk diffs, compute last_spoken_ref_idx (only on EQUAL)
      2. Walk diffs again, assigning status per phoneme → per char
      3. Merge with locked_status (once colored, never change)
      4. Post-process: wasla inherits neighbor color
      5. Build CharAnnotation list
    
    Complexity: O(n) — single pass through diffs + single pass through chars.
    """
    text_len = len(uthmani_text)
    dmp_obj = dmp_module.diff_match_patch()

    # --- Step 1: Compute spoken boundary ---
    last_active_diff_idx = -1
    for i, (op, data) in enumerate(diffs):
        if op in (dmp_obj.DIFF_EQUAL, dmp_obj.DIFF_INSERT):
            last_active_diff_idx = i

    # --- Step 2: Walk diffs, assign status ---
    char_status = [CharStatus.FUTURE] * text_len
    char_error_info: list[SifatErrorInfo | None] = [None] * text_len

    ref_ptr = 0
    ptc = pmap.phoneme_to_chars
    pts = pmap.phoneme_to_sifat

    for i, (op, data) in enumerate(diffs):
        d_len = len(data)

        if op == dmp_obj.DIFF_EQUAL:
            for p_idx in range(ref_ptr, ref_ptr + d_len):
                if p_idx < len(ptc):
                    s_idx = pts.get(p_idx)
                    sifat_err = sifat_errors.get(s_idx) if s_idx is not None else None

                    if sifat_err:
                        status = CharStatus.SIFAT_ERR
                    else:
                        status = CharStatus.CORRECT

                    for c_idx in ptc[p_idx]:
                        if char_status[c_idx].value <= CharStatus.CORRECT.value:
                            char_status[c_idx] = status
                            if sifat_err:
                                char_error_info[c_idx] = sifat_err
            ref_ptr += d_len

        elif op == dmp_obj.DIFF_DELETE:
            is_error = i <= last_active_diff_idx
            status = CharStatus.PHONEME_ERR if is_error else CharStatus.FUTURE
            for p_idx in range(ref_ptr, ref_ptr + d_len):
                if p_idx < len(ptc):
                    for c_idx in ptc[p_idx]:
                        if status.value > char_status[c_idx].value:
                            char_status[c_idx] = status
                            if status == CharStatus.PHONEME_ERR:
                                char_error_info[c_idx] = SifatErrorInfo(
                                    ErrorType.DELETION, Severity.HIGH,
                                    f"Missing sound: {data}"
                                )
            ref_ptr += d_len

        elif op == dmp_obj.DIFF_INSERT:
            # Extra sound inserted not in reference. Attach error to previous/current character.
            p_idx = max(0, ref_ptr - 1)
            if p_idx < len(ptc):
                for c_idx in ptc[p_idx]:
                    if CharStatus.PHONEME_ERR.value > char_status[c_idx].value:
                        char_status[c_idx] = CharStatus.PHONEME_ERR
                        char_error_info[c_idx] = SifatErrorInfo(
                            ErrorType.INSERTION, Severity.HIGH,
                            f"Extra sound inserted: {data}"
                        )

    # --- Step 3: Merge with locked status ---
    if locked_status and len(locked_status) == text_len:
        for i in range(text_len):
            prev_status = locked_status[i]
            if prev_status != CharStatus.FUTURE.value:
                # If it was previously spoken but now evaluated as FUTURE, restore it
                # to prevent words from disappearing due to ASR alignment shifts.
                if char_status[i] == CharStatus.FUTURE:
                    char_status[i] = CharStatus(prev_status)
                
                # If it was CORRECT, NEVER downgrade it to an error or FUTURE.
                if prev_status == CharStatus.CORRECT.value:
                    char_status[i] = CharStatus.CORRECT
                    if char_error_info[i]:
                        char_error_info[i] = None

    # --- Step 4: Wasla inherits next letter's color ---
    wasla_positions: set[int] = set()
    for unit in pmap.all_units:
        if unit.is_wasla:
            for ci in range(unit.start, unit.end):
                wasla_positions.add(ci)

    for ci in sorted(wasla_positions):
        for ni in range(ci + 1, text_len):
            if ni not in wasla_positions:
                char_status[ci] = char_status[ni]
                char_error_info[ci] = char_error_info[ni]
                break

    # --- Step 5: Build annotations ---
    annotations: list[CharAnnotation] = []
    for i, ch in enumerate(uthmani_text):
        st = char_status[i]
        err_info = char_error_info[i]

        ann = CharAnnotation(
            char=ch,
            index=i,
            status=st,
            error=(st.value >= 2),
            error_type=err_info.error_type if err_info else ErrorType.NONE,
            severity=err_info.severity if err_info else Severity.NONE,
            tooltip=err_info.tooltip if err_info else "",
        )

        # Assign phoneme_range and sifat_idx from content_units
        for unit_idx, unit in enumerate(pmap.content_units):
            if unit.start <= i < unit.end and unit_idx < pmap.mapping_len:
                ann.sifat_idx = unit_idx
                break

        annotations.append(ann)

    return annotations


# ═══════════════════════════════════════════════════════════════════════════
#  5. HTML Builder
# ═══════════════════════════════════════════════════════════════════════════

_STATUS_COLORS = {
    CharStatus.FUTURE:      "#94A3B8",   # Slate grey
    CharStatus.CORRECT:     "#22C55E",   # Green
    CharStatus.PHONEME_ERR: "#DC2626",   # Red
    CharStatus.SIFAT_ERR:   "#DC2626",   # Red (same for consistency)
}

_ERROR_DECORATIONS = {
    ErrorType.MADD:    "text-decoration: underline wavy #F97316;",   # Orange wavy
    ErrorType.GHUNNA:  "text-decoration: underline dotted #8B5CF6;", # Purple dotted
    ErrorType.QALQALA: "text-decoration: underline dashed #EF4444;", # Red dashed
    ErrorType.VOWEL:   "text-decoration: underline double #F59E0B;", # Amber double
}


def build_html(
    uthmani_text: str,
    annotations: list[CharAnnotation],
) -> str:
    """
    Build styled HTML from character annotations.
    
    Groups consecutive characters with the same status into spans
    for efficient rendering (avoids one <span> per character).
    
    Complexity: O(n), single pass.
    """
    if not annotations:
        return f'<div style="font-family: \'Amiri\', serif; font-size: 32px; line-height: 2.2; direction: rtl; text-align: center;">{uthmani_text}</div>'

    parts = [
        '<div style="font-family: \'Amiri\', serif; font-size: 32px; '
        'line-height: 2.2; direction: rtl; text-align: center;">'
    ]

    i = 0
    n = len(annotations)

    while i < n:
        ann = annotations[i]
        color = _STATUS_COLORS.get(ann.status, "#94A3B8")
        decoration = _ERROR_DECORATIONS.get(ann.error_type, "")

        # Group consecutive chars with same status + error_type
        start = i
        while (
            i < n
            and annotations[i].status == ann.status
            and annotations[i].error_type == ann.error_type
        ):
            i += 1

        segment = uthmani_text[annotations[start].index:annotations[i - 1].index + 1]
        style = f"color:{color};"
        if decoration:
            style += decoration

        tooltip = ann.tooltip
        if tooltip:
            parts.append(
                f'<span style="{style}" title="{tooltip}">{segment}</span>'
            )
        else:
            parts.append(f'<span style="{style}">{segment}</span>')

    parts.append("</div>")
    return "".join(parts)


# ═══════════════════════════════════════════════════════════════════════════
#  6. Main Pipeline Entry Point
# ═══════════════════════════════════════════════════════════════════════════

def annotate_uthmani(
    uthmani_text: str,
    predicted_phonemes: str,
    ref_phonemes: str,
    predicted_sifat: list,
    ref_sifat: list,
    ref_mappings: list | None = None,
    locked_status: list[int] | None = None,
) -> AnnotationResult:
    """
    Full pipeline: phoneme predictions → structured Uthmani annotation.
    
    This is the single entry point that orchestrates:
      1. Parse Uthmani text
      2. Build phoneme↔char mapping
      3. Compute diffs
      4. Detect sifat errors via the matrix
      5. Project errors onto characters
      6. Generate HTML
    
    Returns AnnotationResult with both structured JSON and rendered HTML.
    """
    # 1. Parse
    letter_units = parse_uthmani(uthmani_text)

    # 2. Map
    pmap = build_phoneme_map(letter_units, ref_sifat, ref_mappings)

    # 3. Diff
    dmp_obj = dmp_module.diff_match_patch()
    diffs = dmp_obj.diff_main(ref_phonemes, predicted_phonemes)
    dmp_obj.diff_cleanupSemantic(diffs)

    # 4. Sifat errors
    sifat_errors = detect_sifat_errors(predicted_sifat, ref_sifat, diffs)

    # 5. Project
    annotations = project_errors(
        uthmani_text, diffs, pmap, sifat_errors, locked_status
    )

    # 6. HTML
    html = build_html(uthmani_text, annotations)

    # Build locked status array for persistence
    new_locked = [ann.status.value for ann in annotations]

    return AnnotationResult(
        text=uthmani_text,
        chars=annotations,
        locked_status=new_locked,
        html=html,
    )
