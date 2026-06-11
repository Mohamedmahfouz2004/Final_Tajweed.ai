"""
Progress & Mistake Pydantic models.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ProgressStatus(str, Enum):
    NOT_STARTED = "not-started"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"


# ── Request Schemas ──

class ProgressUpdate(BaseModel):
    lesson_id: str
    status: ProgressStatus
    score: int = 0
    theoretical_score: int = 0
    practical_tests: dict = Field(default_factory=dict) # {"test_id": "passed" / "failed"}
    video_watched: bool = False


class MistakeLog(BaseModel):
    error_type: str
    lesson_id: Optional[str] = None
    surah_number: Optional[int] = None
    ayah_number: Optional[int] = None
    ayah_text: Optional[str] = ""
    char_index: Optional[int] = None
    feedback: Optional[str] = None
    audio_url: Optional[str] = None


class MarkCorrected(BaseModel):
    error_type: str
    surah_number: int
    ayah_number: int


# ── Error Type Mapping (server-side) ──

ERROR_TYPE_MAP = {
    "madd":      {"category": "أحكام المدود", "name": "خطأ في المد"},
    "ghunna":    {"category": "الغنة وأحكام النون والميم", "name": "خطأ في الغنة"},
    "qalqala":   {"category": "القلقلة", "name": "خطأ في القلقلة"},
    "vowel":     {"category": "الحركات والتشكيل", "name": "خطأ في الحركات"},
    "tafkheem":  {"category": "التفخيم والترقيق", "name": "خطأ في التفخيم أو الترقيق"},
    "hams_jahr": {"category": "الهمس والجهر", "name": "خطأ في الهمس أو الجهر"},
    "shidda":    {"category": "الشدة والرخاوة", "name": "خطأ في الشدة أو الرخاوة"},
    "safeer":    {"category": "الصفير", "name": "خطأ في الصفير"},
    "istitala":  {"category": "الاستطالة", "name": "خطأ في الاستطالة"},
    "sifat":     {"category": "صفات الحروف", "name": "خطأ في صفة الحرف"},
    "phoneme":   {"category": "مخارج الحروف", "name": "خطأ في مخرج الحرف"},
    "deletion":  {"category": "أخطاء النطق", "name": "حذف حرف أو صوت"},
    "insertion": {"category": "أخطاء النطق", "name": "إضافة صوت زائد"},
}
