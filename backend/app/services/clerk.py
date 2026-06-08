"""
Clerk Backend API client (REST via httpx).

Used for user management (listing, role changes, deletion) now that Clerk owns
identity. JWT verification lives in app.middleware.auth and does not need this.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger("tajweed.clerk")


def _headers() -> dict:
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        raise RuntimeError("CLERK_SECRET_KEY is not configured")
    return {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}


def _base() -> str:
    return get_settings().CLERK_API_URL.rstrip("/")


def _shape_user(u: dict) -> dict:
    """Map a Clerk user object to the shape the admin UI expects."""
    first = u.get("first_name") or ""
    last = u.get("last_name") or ""
    name = f"{first} {last}".strip() or u.get("username") or ""

    # Primary email
    email = ""
    primary_id = u.get("primary_email_address_id")
    for e in u.get("email_addresses", []) or []:
        if e.get("id") == primary_id:
            email = e.get("email_address", "")
            break
    if not email and u.get("email_addresses"):
        email = u["email_addresses"][0].get("email_address", "")

    if not name:
        name = email or "مستخدم"

    created_ms = u.get("created_at")
    created_iso = (
        datetime.fromtimestamp(created_ms / 1000, tz=timezone.utc).isoformat()
        if created_ms
        else None
    )

    return {
        "_id": u.get("id"),
        "name": name,
        "email": email,
        "role": (u.get("public_metadata") or {}).get("role", "user"),
        "createdAt": created_iso,
    }


async def get_user(user_id: str) -> Optional[dict]:
    """Fetch a single Clerk user (raw object), or None if not found."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{_base()}/users/{user_id}", headers=_headers())
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


async def get_user_role(user_id: str) -> str:
    """Return a user's role from publicMetadata (defaults to 'user')."""
    user = await get_user(user_id)
    if not user:
        return "user"
    return (user.get("public_metadata") or {}).get("role", "user")


async def list_users(limit: int = 100) -> list[dict]:
    """List users, shaped for the admin UI, newest first."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_base()}/users",
            headers=_headers(),
            params={"limit": limit, "order_by": "-created_at"},
        )
        resp.raise_for_status()
        return [_shape_user(u) for u in resp.json()]


async def count_users() -> int:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{_base()}/users/count", headers=_headers())
        resp.raise_for_status()
        return resp.json().get("total_count", 0)


async def update_user_role(user_id: str, role: str) -> dict:
    """Set public_metadata.role for a user; returns the shaped user."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.patch(
            f"{_base()}/users/{user_id}/metadata",
            headers=_headers(),
            json={"public_metadata": {"role": role}},
        )
        resp.raise_for_status()
        return _shape_user(resp.json())


async def delete_user(user_id: str) -> bool:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.delete(f"{_base()}/users/{user_id}", headers=_headers())
        if resp.status_code == 404:
            return False
        resp.raise_for_status()
        return True
