"""
Admin routes — stats, user management, lesson CRUD, quiz CRUD, video upload.
Replaces: backend_node/controllers/adminController.js + routes/adminRoutes.js
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta

import aiofiles
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.database import get_db
from app.config import get_settings
from app.middleware.auth import require_admin
from app.models.lesson import LessonCreate, LessonUpdate, QuizCreate
from app.services import clerk

logger = logging.getLogger("tajweed.admin")

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _serialize(doc: dict) -> dict:
    """Stringify ObjectId fields for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    for key in ("user", "lesson"):
        if key in doc and isinstance(doc[key], ObjectId):
            doc[key] = str(doc[key])
    for q in doc.get("quizzes", []):
        if "_id" in q:
            q["_id"] = str(q["_id"])
    return doc


# ─── Dashboard Stats ───

@router.get("/stats")
async def get_stats(_admin: str = Depends(require_admin)):
    db = get_db()

    # User counts come from Clerk; content/progress counts from Mongo.
    users = await clerk.list_users(limit=500)
    total_users = await clerk.count_users()
    total_admins = sum(1 for u in users if u.get("role") == "admin")

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_this_week = sum(
        1 for u in users
        if u.get("createdAt") and datetime.fromisoformat(u["createdAt"]) >= week_ago
    )

    total_lessons = await db.lessons.count_documents({})
    total_progress = await db.progresses.count_documents({})
    completed_progress = await db.progresses.count_documents({"status": "completed"})

    return {
        "totalUsers": total_users,
        "totalAdmins": total_admins,
        "totalLessons": total_lessons,
        "totalProgress": total_progress,
        "completedProgress": completed_progress,
        "newUsersThisWeek": new_users_this_week,
        "completionRate": round((completed_progress / total_progress) * 100) if total_progress > 0 else 0,
    }


# ─── User Management ───

@router.get("/users")
async def get_all_users(_admin: str = Depends(require_admin)):
    return await clerk.list_users()


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, body: dict, _admin: str = Depends(require_admin)):
    role = body.get("role")
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    return await clerk.update_user_role(user_id, role)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin_id: str = Depends(require_admin)):
    db = get_db()
    if user_id == admin_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    deleted = await clerk.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")

    # Cleanup this user's data (keyed by Clerk user id string).
    await db.progresses.delete_many({"user": user_id})
    await db.mistakes.delete_many({"user": user_id})
    return {"msg": "User deleted successfully"}


# ─── Lesson Management ───

@router.post("/lessons")
async def create_lesson(body: LessonCreate, _admin: str = Depends(require_admin)):
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "title": body.title,
        "description": body.description or "",
        "video_url": body.video_url or "",
        "content_type": "video",
        "sequence_order": body.sequence_order,
        "tajweed_rule": body.tajweed_rule or "",
        "quizzes": [],
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.lessons.insert_one(doc)
    created = await db.lessons.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, body: LessonUpdate, _admin: str = Depends(require_admin)):
    db = get_db()
    update_fields = {k: v for k, v in body.model_dump().items() if v is not None}
    update_fields["updatedAt"] = datetime.now(timezone.utc)

    result = await db.lessons.find_one_and_update(
        {"_id": ObjectId(lesson_id)},
        {"$set": update_fields},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return _serialize(result)


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, _admin: str = Depends(require_admin)):
    db = get_db()
    await db.lessons.delete_one({"_id": ObjectId(lesson_id)})
    return {"msg": "Lesson deleted"}


# ─── Quiz Management ───

@router.post("/quizzes")
async def create_quiz(body: dict, _admin: str = Depends(require_admin)):
    db = get_db()
    lesson_id = body.get("lesson_id")
    quiz_doc = {
        "_id": ObjectId(),
        "question": body["question"],
        "options": body["options"],
        "correct_answer": body["correct_answer"],
        "points": body.get("points", 10),
    }
    result = await db.lessons.find_one_and_update(
        {"_id": ObjectId(lesson_id)},
        {"$push": {"quizzes": quiz_doc}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Lesson not found")
    # Return the new quiz
    last_quiz = result["quizzes"][-1]
    last_quiz["_id"] = str(last_quiz["_id"])
    return last_quiz


@router.delete("/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, _admin: str = Depends(require_admin)):
    db = get_db()
    oid = ObjectId(quiz_id)
    lesson = await db.lessons.find_one({"quizzes._id": oid})
    if not lesson:
        raise HTTPException(status_code=404, detail="Quiz not found")

    await db.lessons.update_one(
        {"_id": lesson["_id"]},
        {"$pull": {"quizzes": {"_id": oid}}},
    )
    return {"msg": "Quiz question deleted"}


# ─── Video Upload ───

@router.post("/upload-video")
async def upload_video(video: UploadFile = File(...), _admin: str = Depends(require_admin)):
    settings = get_settings()
    upload_dir = os.path.join(settings.UPLOAD_DIR, "videos")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(video.filename or "video.mp4")[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_name)

    async with aiofiles.open(file_path, "wb") as f:
        content = await video.read()
        await f.write(content)

    video_url = f"/uploads/videos/{unique_name}"
    return {"url": video_url, "filename": unique_name}
