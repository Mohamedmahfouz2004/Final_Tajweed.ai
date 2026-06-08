"""
Async MongoDB connection via Motor.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import get_settings

logger = logging.getLogger("tajweed.db")

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """Initialize the Motor client and connect to MongoDB."""
    global _client, _db
    settings = get_settings()
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client.get_default_database()
    # Ping to verify connection
    await _client.admin.command("ping")
    logger.info("✅ MongoDB connected: %s", _db.name)


async def close_db() -> None:
    """Close the Motor client."""
    global _client, _db
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the active database handle. Raises if not connected."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db
