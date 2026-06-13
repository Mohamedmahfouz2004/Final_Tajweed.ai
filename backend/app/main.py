"""
FastAPI application — main entry point.
Consolidates all backends into one server.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import connect_db, close_db

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("tajweed")


# ── Lifespan (startup / shutdown) ──

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Tajweed.AI Logic Server...")
    await connect_db()
    settings = get_settings()

    # Ensure upload directory exists
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "videos"), exist_ok=True)

    logger.info("✅ Server ready on port %d", settings.PORT)
    logger.info("   Model Server expected at: %s", settings.MODEL_SERVER_URL)

    yield

    # Shutdown
    await close_db()
    logger.info("Server shut down.")


# ── Create App ──

app = FastAPI(
    title="Tajweed.AI",
    description="Unified backend for the Tajweed.AI Quran recitation trainer",
    version="2.0.0",
    lifespan=lifespan,
)


# ── CORS ──

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Static files (uploads) ──

settings = get_settings()
uploads_path = settings.UPLOAD_DIR
if os.path.isdir(uploads_path):
    app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")


# ── Register Routers ──

from app.routes.lessons import router as lessons_router
from app.routes.progress import router as progress_router
from app.routes.admin import router as admin_router
from app.routes.quran import router as quran_router
from app.routes.explain import router as explain_router
from app.ws.stream import router as ws_router

# Auth (login/signup/sessions) is owned by Clerk on the client — no auth router.
app.include_router(lessons_router)
app.include_router(progress_router)
app.include_router(admin_router)
app.include_router(quran_router)
app.include_router(explain_router)
app.include_router(ws_router)


# ── Root ──

@app.get("/")
async def root():
    return {
        "app": "Tajweed.AI Logic Server",
        "version": "2.0.0",
        "docs": "/docs",
    }
