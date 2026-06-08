"""
Lesson & Quiz Pydantic models.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Request Schemas ──

class QuizCreate(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    points: int = 10


class LessonCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    video_url: Optional[str] = ""
    sequence_order: int
    tajweed_rule: Optional[str] = ""


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None
    sequence_order: Optional[int] = None
    tajweed_rule: Optional[str] = None


# ── Response Schemas ──

class QuizResponse(BaseModel):
    id: str = Field(alias="_id", default="")
    question: str
    options: list[str]
    correct_answer: str
    points: int = 10

    model_config = {"populate_by_name": True}


class LessonResponse(BaseModel):
    id: str
    title: str
    description: str = ""
    video_url: str = ""
    content_type: str = "video"
    sequence_order: int
    tajweed_rule: str = ""
    quizzes: list[dict] = []
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
