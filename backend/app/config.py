"""
Configuration module — loads settings from .env via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os


class Settings(BaseSettings):
    # ── Server ──
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # ── Database ──
    MONGODB_URI: str = "mongodb://localhost:27017/tajweed_ai"

    # ── Auth (Clerk) ──
    # Identity is owned by Clerk. The backend verifies Clerk session JWTs against
    # the instance JWKS and uses the Clerk Backend API for user management.
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    # Issuer / Frontend API of the Clerk instance (used to derive the JWKS URL).
    CLERK_ISSUER: str = "https://ideal-escargot-93.clerk.accounts.dev"
    CLERK_API_URL: str = "https://api.clerk.com/v1"

    # ── Client ──
    CLIENT_URL: str = "http://localhost:5173"

    # ── Email ──
    EMAIL_USER: str = ""
    EMAIL_PASS: str = ""

    # ── Model Server ──
    MODEL_SERVER_URL: str = "http://localhost:8888"
    MODEL_SERVER_WS: str = "ws://localhost:8888"

    # ── File Uploads ──
    UPLOAD_DIR: str = Field(default_factory=lambda: os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
