"""
Quran data routes — proxied to the Model Server.
Replaces: /api/surahs, /api/surah/{id}, /api/uthmani, /api/health from muaalem_server.
"""

from fastapi import APIRouter

from app.services.model_client import proxy_get, health_check

router = APIRouter(tags=["Quran Data"])


@router.get("/api/surahs")
async def get_surahs():
    """Get list of all surahs — proxied to Model Server."""
    return await proxy_get("/api/surahs")


@router.get("/api/uthmani")
async def get_uthmani(surah: int = 1, from_aya: int = 1, to_aya: int = 1):
    """Get Uthmani text for a range — proxied to Model Server."""
    return await proxy_get("/api/uthmani", params={
        "surah": surah,
        "from_aya": from_aya,
        "to_aya": to_aya,
    })


@router.get("/api/health")
async def get_health():
    """Health check — returns status of both logic and model servers."""
    model_health = await health_check()
    return {
        "logic_server": "ok",
        "model_server": model_health,
    }


# ─── Session Analytics (proxied) ───

@router.post("/api/session/{session_id}/end")
async def end_session(session_id: str):
    """End a session and generate analytics — proxied to Model Server."""
    from app.services.model_client import proxy_post
    return await proxy_post(f"/api/session/{session_id}/end")


@router.get("/api/session/{session_id}/analytics")
async def get_session_analytics(session_id: str):
    """Get analytics for a session — proxied to Model Server."""
    return await proxy_get(f"/api/session/{session_id}/analytics")
