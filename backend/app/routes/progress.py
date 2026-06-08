"""
Progress routes — update, log-mistake, summary, detailed-summary, practical-quiz, mark-corrected.
Replaces: backend_node/controllers/progressController.js + routes/progressRoutes.js
"""

import logging
import random
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
import httpx

from app.database import get_db
from app.config import get_settings
from app.middleware.auth import get_current_user
from app.models.progress import ProgressUpdate, MistakeLog, MarkCorrected, ERROR_TYPE_MAP

logger = logging.getLogger("tajweed.progress")

router = APIRouter(prefix="/api/progress", tags=["Progress"])


# ─── Update Progress ───

@router.post("/update")
async def update_progress(body: ProgressUpdate, user_id: str = Depends(get_current_user)):
    db = get_db()
    logger.info("[PROGRESS] Update - User: %s, Lesson: %s, Status: %s, Score: %s",
                user_id, body.lesson_id, body.status, body.score)

    u_id = user_id  # Clerk user id (string)
    l_id = ObjectId(body.lesson_id)

    result = await db.progresses.find_one_and_update(
        {"user": u_id, "lesson": l_id},
        {
            "$set": {
                "status": body.status.value,
                "score": body.score,
                "last_accessed": datetime.now(timezone.utc),
            },
            "$setOnInsert": {
                "user": u_id,
                "lesson": l_id,
                "createdAt": datetime.now(timezone.utc),
            },
        },
        upsert=True,
        return_document=True,
    )

    # Serialize
    result["_id"] = str(result["_id"])
    result["user"] = str(result["user"])
    result["lesson"] = str(result["lesson"])
    return result


# ─── Log Mistake ───

@router.post("/log-mistake")
async def log_mistake(body: MistakeLog, user_id: str = Depends(get_current_user)):
    db = get_db()
    rule_info = ERROR_TYPE_MAP.get(body.error_type, {"category": "أخطاء أخرى", "name": body.error_type})

    doc = {
        "user": user_id,
        "error_type": body.error_type,
        "rule_category": rule_info["category"],
        "rule_name_ar": rule_info["name"],
        "surah_number": body.surah_number,
        "ayah_number": body.ayah_number,
        "ayah_text": body.ayah_text or "",
        "char_index": body.char_index,
        "is_corrected": False,
        "feedback": body.feedback or f"خطأ تجويدي: {rule_info['name']}",
        "occurrence_count": 1,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
    }
    if body.lesson_id:
        doc["lesson"] = ObjectId(body.lesson_id)

    result = await db.mistakes.insert_one(doc)
    logger.info("[MISTAKE] Logged: %s (%s) - Surah %s, Ayah %s",
                body.error_type, rule_info["name"], body.surah_number, body.ayah_number)

    return {"msg": "Mistake logged", "id": str(result.inserted_id)}


# ─── Progress Summary (for dashboard) ───

@router.get("/summary")
async def get_progress_summary(user_id: str = Depends(get_current_user)):
    db = get_db()
    u_id = user_id  # Clerk user id (string)

    # Progress records
    progress_cursor = db.progresses.find({"user": u_id})
    progress_records = await progress_cursor.to_list(length=500)
    completed_count = sum(1 for p in progress_records if p.get("status") == "completed")

    # Weekly stats (last 7 progress records)
    weekly_pipeline = [
        {"$match": {"user": u_id}},
        {"$sort": {"last_accessed": -1}},
        {"$limit": 7},
        {"$project": {
            "day_num": {"$dayOfMonth": "$last_accessed"},
            "score": 1,
            "avg_score": "$score",
        }},
    ]
    weekly_stats = await db.progresses.aggregate(weekly_pipeline).to_list(length=7)
    for s in weekly_stats:
        s["_id"] = str(s["_id"])

    # Common mistakes (uncorrected)
    mistake_pipeline = [
        {"$match": {"user": u_id, "is_corrected": {"$ne": True}}},
        {"$group": {
            "_id": "$error_type",
            "count": {"$sum": 1},
            "rule_category": {"$first": "$rule_category"},
            "rule_name_ar": {"$first": "$rule_name_ar"},
        }},
        {"$project": {
            "name": "$_id",
            "count": 1,
            "rule_category": 1,
            "rule_name_ar": 1,
            "_id": 0,
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    common_mistakes = await db.mistakes.aggregate(mistake_pipeline).to_list(length=10)

    # Total counts
    total_mistakes = await db.mistakes.count_documents({"user": u_id, "is_corrected": {"$ne": True}})
    total_corrected = await db.mistakes.count_documents({"user": u_id, "is_corrected": True})

    # Unique ayahs
    unique_ayahs = await db.mistakes.distinct("ayah_number", {"user": u_id, "surah_number": {"$exists": True}})

    # Average accuracy
    avg_accuracy = 0
    if weekly_stats:
        scores = [s.get("score", 0) or 0 for s in weekly_stats]
        avg_accuracy = round(sum(scores) / len(scores)) if scores else 0

    return {
        "weekly": weekly_stats,
        "mistakes": common_mistakes,
        "versesPracticed": len(unique_ayahs),
        "completedLessons": completed_count,
        "completedLessonIds": [str(p["lesson"]) for p in progress_records if p.get("status") == "completed"],
        "totalMistakes": total_mistakes,
        "totalCorrected": total_corrected,
        "averageAccuracy": avg_accuracy,
    }


# ─── Detailed Summary (for ProgressView) ───

@router.get("/detailed-summary")
async def get_detailed_summary(user_id: str = Depends(get_current_user)):
    db = get_db()
    u_id = user_id  # Clerk user id (string)

    # Mistakes by category
    cat_pipeline = [
        {"$match": {"user": u_id}},
        {"$group": {
            "_id": {"error_type": "$error_type", "rule_category": "$rule_category"},
            "total": {"$sum": 1},
            "corrected": {"$sum": {"$cond": ["$is_corrected", 1, 0]}},
            "uncorrected": {"$sum": {"$cond": ["$is_corrected", 0, 1]}},
            "rule_name_ar": {"$first": "$rule_name_ar"},
            "sample_ayahs": {"$push": {"surah": "$surah_number", "ayah": "$ayah_number", "text": "$ayah_text"}},
        }},
        {"$project": {
            "error_type": "$_id.error_type",
            "rule_category": "$_id.rule_category",
            "rule_name_ar": 1,
            "total": 1,
            "corrected": 1,
            "uncorrected": 1,
            "error_percentage": {"$round": [{"$multiply": [{"$divide": ["$uncorrected", "$total"]}, 100]}, 1]},
            "sample_ayahs": {"$slice": ["$sample_ayahs", 5]},
            "_id": 0,
        }},
        {"$sort": {"uncorrected": -1}},
    ]
    mistakes_by_category = await db.mistakes.aggregate(cat_pipeline).to_list(length=100)

    # Daily performance (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    daily_pipeline = [
        {"$match": {"user": u_id, "createdAt": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "mistakes": {"$sum": 1},
            "corrected": {"$sum": {"$cond": ["$is_corrected", 1, 0]}},
        }},
        {"$sort": {"_id": 1}},
        {"$project": {"date": "$_id", "mistakes": 1, "corrected": 1, "_id": 0}},
    ]
    daily_performance = await db.mistakes.aggregate(daily_pipeline).to_list(length=30)

    # Surah stats
    surah_pipeline = [
        {"$match": {"user": u_id, "surah_number": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$surah_number",
            "total_mistakes": {"$sum": 1},
            "corrected": {"$sum": {"$cond": ["$is_corrected", 1, 0]}},
            "unique_ayahs": {"$addToSet": "$ayah_number"},
        }},
        {"$project": {
            "surah_number": "$_id",
            "total_mistakes": 1,
            "corrected": 1,
            "ayahs_count": {"$size": "$unique_ayahs"},
            "accuracy": {"$round": [{"$multiply": [{"$divide": ["$corrected", "$total_mistakes"]}, 100]}, 1]},
            "_id": 0,
        }},
        {"$sort": {"surah_number": 1}},
    ]
    surah_stats = await db.mistakes.aggregate(surah_pipeline).to_list(length=200)

    # Lesson progress
    progress_cursor = db.progresses.find({"user": u_id})
    progress_records = await progress_cursor.to_list(length=500)
    lesson_progress = []
    for p in progress_records:
        lesson = await db.lessons.find_one({"_id": p["lesson"]})
        lesson_progress.append({
            "lessonTitle": lesson["title"] if lesson else "Unknown",
            "tajweed_rule": lesson.get("tajweed_rule", "") if lesson else "",
            "status": p.get("status"),
            "score": p.get("score"),
            "last_accessed": p.get("last_accessed"),
        })

    summary = {
        "totalCategories": len(mistakes_by_category),
        "totalMistakes": sum(m.get("total", 0) for m in mistakes_by_category),
        "totalCorrected": sum(m.get("corrected", 0) for m in mistakes_by_category),
        "totalUncorrected": sum(m.get("uncorrected", 0) for m in mistakes_by_category),
    }

    return {
        "summary": summary,
        "mistakesByCategory": mistakes_by_category,
        "dailyPerformance": daily_performance,
        "surahStats": surah_stats,
        "lessonProgress": lesson_progress,
    }


# ─── Practical Quiz Verses ───

@router.get("/practical-quiz/{error_type}")
async def get_practical_quiz_verses(error_type: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    settings = get_settings()
    u_id = user_id  # Clerk user id (string)

    cursor = db.mistakes.find({
        "user": u_id,
        "error_type": error_type,
        "is_corrected": {"$ne": True},
        "surah_number": {"$exists": True, "$ne": None},
        "ayah_number": {"$exists": True, "$ne": None},
    }).sort("createdAt", -1)

    mistakes = await cursor.to_list(length=500)

    if not mistakes:
        return {"verses": [], "message": "لا توجد أخطاء مسجلة لهذا الحكم"}

    # Group by surah:ayah
    verse_map: dict[str, dict] = {}
    for m in mistakes:
        key = f"{m['surah_number']}:{m['ayah_number']}"
        if key not in verse_map:
            verse_map[key] = {
                "surah_number": m["surah_number"],
                "ayah_number": m["ayah_number"],
                "ayah_text": m.get("ayah_text", ""),
                "error_type": m["error_type"],
                "char_indices": [],
            }
        ci = m.get("char_index")
        if ci is not None and ci not in verse_map[key]["char_indices"]:
            verse_map[key]["char_indices"].append(ci)

    # Fetch missing text from Model Server
    unique_verses = list(verse_map.values())
    for verse in unique_verses:
        if not verse["ayah_text"]:
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"{settings.MODEL_SERVER_URL}/api/uthmani",
                        params={
                            "surah": verse["surah_number"],
                            "from_aya": verse["ayah_number"],
                            "to_aya": verse["ayah_number"],
                        },
                        timeout=5,
                    )
                    data = resp.json()
                    if data.get("text"):
                        verse["ayah_text"] = data["text"]
            except Exception as e:
                logger.warning("[QUIZ] Could not fetch text for %s:%s: %s",
                               verse["surah_number"], verse["ayah_number"], e)

    # Select 50% (min 1)
    quiz_count = max(1, len(unique_verses) // 2 + (len(unique_verses) % 2))
    random.shuffle(unique_verses)
    selected = unique_verses[:quiz_count]

    logger.info("[QUIZ] %s: %d total, selected %d", error_type, len(unique_verses), len(selected))

    return {
        "verses": selected,
        "totalErrors": len(unique_verses),
        "quizSize": len(selected),
        "errorType": error_type,
    }


# ─── Mark Mistake Corrected ───

@router.post("/mark-corrected")
async def mark_corrected(body: MarkCorrected, user_id: str = Depends(get_current_user)):
    db = get_db()
    result = await db.mistakes.update_many(
        {
            "user": user_id,
            "error_type": body.error_type,
            "surah_number": body.surah_number,
            "ayah_number": body.ayah_number,
            "is_corrected": False,
        },
        {
            "$set": {
                "is_corrected": True,
                "corrected_at": datetime.now(timezone.utc),
            },
        },
    )

    logger.info("[CORRECTED] %s Surah %s:%s - %d corrected",
                body.error_type, body.surah_number, body.ayah_number, result.modified_count)

    return {"msg": "Mistakes marked as corrected", "correctedCount": result.modified_count}
