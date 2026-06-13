"""
OpenRouter chat client — used to generate tajweed explanations.

OpenRouter exposes an OpenAI-compatible /chat/completions endpoint, so this is a
thin httpx wrapper (the project already depends on httpx — see model_client.py).
We deliberately do not use a provider SDK so the model is swappable via the
OPENROUTER_MODEL env var.

chat_json() returns a parsed dict on success or None on any failure (missing key,
network error, non-JSON content). Callers must treat None as "fall back to the
static knowledge base" — the explanation feature must never hard-fail a request.
"""

import json
import logging
import re
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("tajweed.llm_client")

_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def _extract_json(content: str) -> dict | None:
    """Parse a JSON object out of a model response, tolerating code fences and
    surrounding prose. Returns None if no valid JSON object is found."""
    if not content:
        return None
    text = _FENCE_RE.sub("", content.strip())
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass
    # Last resort: grab the outermost {...} span.
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _model_chain(settings) -> list[str]:
    """Ordered, de-duplicated list of models to try: primary then fallbacks."""
    chain = [settings.OPENROUTER_MODEL]
    for m in (settings.OPENROUTER_FALLBACK_MODELS or "").split(","):
        m = m.strip()
        if m and m not in chain:
            chain.append(m)
    return chain


async def _try_model(client: httpx.AsyncClient, url: str, headers: dict, body: dict, timeout: float):
    """Returns (parsed_dict, retryable). retryable=True means try the next model."""
    try:
        resp = await client.post(url, headers=headers, json=body, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        logger.warning("OpenRouter HTTP %s (%s): %s", code, body["model"], e.response.text[:200])
        # 404 (slug gone) / 429 (rate-limited) / 5xx are worth trying another model.
        return None, code in (402, 404, 408, 429, 500, 502, 503, 529)
    except httpx.ConnectError:
        logger.warning("OpenRouter not reachable at %s", url)
        return None, False  # network down for all — don't hammer the chain
    except Exception as e:  # noqa: BLE001 — never let the LLM break the request
        logger.error("OpenRouter call failed (%s): %s", body["model"], e)
        return None, True

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        logger.warning("Unexpected OpenRouter response shape: %s", str(data)[:200])
        return None, True

    parsed = _extract_json(content)
    if parsed is None:
        logger.warning("Could not parse JSON from %s: %s", body["model"], str(content)[:200])
        return None, True
    return parsed, False


async def chat_json(
    system: str,
    user: str,
    *,
    temperature: float = 0.3,
    max_tokens: int = 1200,
    timeout: float = 35.0,
) -> dict[str, Any] | None:
    """Ask OpenRouter for a JSON object, trying the configured model then the
    fallback chain (free models 404/429 often).

    Returns the parsed dict, or None if the call is disabled (no key) or every
    model fails — callers must treat None as "use the static knowledge base".
    """
    settings = get_settings()
    if not settings.OPENROUTER_API_KEY:
        logger.info("OPENROUTER_API_KEY not set — skipping LLM call (static fallback).")
        return None

    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    base_headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        # Optional attribution headers recommended by OpenRouter.
        "HTTP-Referer": settings.CLIENT_URL,
        "X-Title": "Tajweed.AI",
    }
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]

    async with httpx.AsyncClient() as client:
        for model in _model_chain(settings):
            body = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
            }
            parsed, retryable = await _try_model(client, url, base_headers, body, timeout)
            if parsed is not None:
                logger.info("OpenRouter explanation served by %s", model)
                return parsed
            if not retryable:
                break
    return None
