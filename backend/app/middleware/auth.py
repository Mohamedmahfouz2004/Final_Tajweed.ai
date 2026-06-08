"""
Clerk authentication dependencies for FastAPI.

Identity is owned by Clerk. We verify the incoming Clerk **session JWT** (RS256)
against the instance JWKS and return the Clerk user id (the token's `sub`, a
string like `user_xxx`). Admin checks read `public_metadata.role` via the Clerk
Backend API.
"""

import logging
import time

import httpx
from fastapi import Depends, HTTPException, status, Request
from jose import jwt, JWTError

from app.config import get_settings
from app.services import clerk

logger = logging.getLogger("tajweed.auth")


# ── JWKS cache ──
# Clerk's signing keys are stable; cache them and refresh periodically.
_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0
_JWKS_TTL = 3600  # seconds


async def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache

    settings = get_settings()
    jwks_url = f"{settings.CLERK_ISSUER.rstrip('/')}/.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
    return _jwks_cache


def _extract_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    # Clerk's __session cookie (fallback for same-origin requests)
    return request.cookies.get("__session")


# ── Dependencies ──

async def get_current_user(request: Request) -> str:
    """
    Verify the Clerk session JWT and return the Clerk user id (`sub`).
    """
    settings = get_settings()
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authorization Denied",
        )

    try:
        jwks = await _get_jwks()
        # Match the token's `kid` to a JWK.
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # Key may have rotated — force a refresh once.
            global _jwks_cache
            _jwks_cache = None
            jwks = await _get_jwks()
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise HTTPException(status_code=401, detail="Invalid token signing key")

        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.CLERK_ISSUER,
            # Clerk session tokens have no audience by default.
            options={"verify_aud": False},
        )
    except HTTPException:
        raise
    except JWTError as e:
        logger.info("[AUTH] Token verification failed: %s", e)
        raise HTTPException(status_code=401, detail="Token is not valid")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token is not valid")
    return user_id


async def require_admin(user_id: str = Depends(get_current_user)) -> str:
    """
    Require that the authenticated Clerk user has publicMetadata.role == 'admin'.
    """
    role = await clerk.get_user_role(user_id)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Admins only")
    return user_id
