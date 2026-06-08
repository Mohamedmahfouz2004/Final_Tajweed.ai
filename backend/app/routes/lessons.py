"""
Lesson routes — list all, get by id.
Replaces: backend_node/controllers/lessonController.js + routes/lessonRoutes.js
"""

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from app.database import get_db

router = APIRouter(prefix="/api/lessons", tags=["Lessons"])


def _serialize_lesson(lesson: dict) -> dict:
    """Convert a MongoDB lesson document to a JSON-safe dict."""
    lesson["_id"] = str(lesson["_id"])
    # Also stringify quiz _id values
    for q in lesson.get("quizzes", []):
        if "_id" in q:
            q["_id"] = str(q["_id"])
    return lesson


@router.get("")
async def get_all_lessons():
    db = get_db()
    cursor = db.lessons.find().sort("sequence_order", 1)
    lessons = []
    async for lesson in cursor:
        lessons.append(_serialize_lesson(lesson))
    return lessons


@router.get("/{lesson_id}")
async def get_lesson_by_id(lesson_id: str):
    db = get_db()
    try:
        lesson = await db.lessons.find_one({"_id": ObjectId(lesson_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid lesson ID")

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    return _serialize_lesson(lesson)
