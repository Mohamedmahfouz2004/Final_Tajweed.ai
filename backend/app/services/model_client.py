"""
Model Server HTTP client — proxies requests to the Muaalem inference server.
"""

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("tajweed.model_client")


async def proxy_get(path: str, params: dict | None = None, timeout: float = 10.0) -> Any:
    """Proxy a GET request to the Model Server."""
    settings = get_settings()
    url = f"{settings.MODEL_SERVER_URL}{path}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        logger.warning("Model server not reachable at %s", url)
        return {"error": "Model server not reachable"}
    except Exception as e:
        logger.error("Model server proxy error: %s", e)
        return {"error": str(e)}


async def proxy_post(path: str, json_body: dict | None = None, timeout: float = 30.0) -> Any:
    """Proxy a POST request to the Model Server."""
    settings = get_settings()
    url = f"{settings.MODEL_SERVER_URL}{path}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=json_body, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        logger.warning("Model server not reachable at %s", url)
        return {"error": "Model server not reachable"}
    except Exception as e:
        logger.error("Model server proxy error: %s", e)
        return {"error": str(e)}


async def health_check() -> dict:
    """Check if the Model Server is alive."""
    return await proxy_get("/api/health")
