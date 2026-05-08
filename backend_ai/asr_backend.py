"""
asr_backend.py — Groq Whisper ASR for Arabic Quran recitation
Sends audio directly to Groq's whisper-large-v3-turbo (accepts WebM, WAV, etc.)
"""

import io
import os
import logging

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    """Lazy-init the Groq client."""
    global _client
    if _client is None:
        from groq import Groq
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise RuntimeError(
                'GROQ_API_KEY is not set. '
                'Get a free key at https://console.groq.com/ '
                'and add it to .env in the project root.'
            )
        _client = Groq(api_key=api_key)
        logger.info('Groq Whisper client initialized')
    return _client


def transcribe(audio_bytes: bytes, language: str = 'ar') -> str:
    """
    Transcribe audio using Groq Whisper API.
    Accepts WebM, WAV, MP3, OGG, FLAC, etc.

    Returns transcribed Arabic text (may be empty for silence/noise).
    """
    client = _get_client()
    buf = io.BytesIO(audio_bytes)
    result = client.audio.transcriptions.create(
        file=('audio.webm', buf),
        model='whisper-large-v3-turbo',
        language=language,
    )
    return (result.text or '').strip()


def is_available() -> bool:
    """Check whether a Groq API key is configured."""
    return bool(os.getenv('GROQ_API_KEY'))
