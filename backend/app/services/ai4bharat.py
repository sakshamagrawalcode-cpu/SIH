"""AI4Bharat IndicConformer — Indic STT fallback.

Used when Sarvam Saaras is unavailable/low-confidence. Guarded by
AI4BHARAT_ENDPOINT; returns None (→ browser Web Speech) when not configured.
"""
from typing import Optional
import base64

import httpx

from . import config

_TIMEOUT = httpx.Timeout(30.0)


def available() -> bool:
    return config.ENABLE_AI4BHARAT


def speech_to_text(audio_b64: str, language: str) -> Optional[str]:
    if not config.ENABLE_AI4BHARAT:
        return None
    try:
        audio_bytes = base64.b64decode(audio_b64.split(",")[-1])
        headers = {}
        if config.AI4BHARAT_API_KEY:
            headers["Authorization"] = f"Bearer {config.AI4BHARAT_API_KEY}"
        resp = httpx.post(
            config.AI4BHARAT_ENDPOINT,
            headers=headers,
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={"language": config.language_to_code(language)},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("transcript", "").strip() or None
    except Exception:
        return None
