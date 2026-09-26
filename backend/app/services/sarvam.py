"""Sarvam AI client — Saaras (STT), Bulbul (TTS), Sarvam LLM (chat).

Real HTTP integration against the Sarvam API. Every method is guarded by the
presence of SARVAM_API_KEY: with no key configured the methods return None so
callers transparently fall back to the local engine / browser voice. This keeps
the prototype fully runnable offline while being genuinely wired for the live
models the moment a key is provided.

Endpoints target the documented Sarvam API surface; adjust model ids / paths in
services/config.py if the Sarvam API version differs.
"""
from typing import Optional
import base64

import httpx

from . import config

_TIMEOUT = httpx.Timeout(30.0)


def _headers() -> dict:
    return {"api-subscription-key": config.SARVAM_API_KEY}


def available() -> bool:
    return bool(config.SARVAM_API_KEY)


def chat(system_prompt: str, user_prompt: str, max_tokens: int = 512) -> Optional[str]:
    """Call the Sarvam LLM (OpenAI-compatible chat completions). Returns text or None."""
    if not config.ENABLE_LLM:
        return None
    try:
        resp = httpx.post(
            f"{config.SARVAM_BASE_URL}/v1/chat/completions",
            headers={**_headers(), "Content-Type": "application/json"},
            json={
                "model": config.SARVAM_LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": max_tokens,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def text_to_speech(text: str, language: str) -> Optional[str]:
    """Sarvam Bulbul TTS. Returns a base64 wav data-URL, or None to fall back."""
    if not config.ENABLE_TTS:
        return None
    try:
        resp = httpx.post(
            f"{config.SARVAM_BASE_URL}/text-to-speech",
            headers={**_headers(), "Content-Type": "application/json"},
            json={
                "inputs": [text],
                "target_language_code": config.language_to_code(language),
                "speaker": config.SARVAM_TTS_SPEAKER,
                "model": config.SARVAM_TTS_MODEL,
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        audios = resp.json().get("audios", [])
        if not audios:
            return None
        return f"data:audio/wav;base64,{audios[0]}"
    except Exception:
        return None


def speech_to_text(audio_b64: str, language: str) -> Optional[str]:
    """Sarvam Saaras STT. Accepts base64 audio, returns transcript or None."""
    if not config.ENABLE_STT:
        return None
    try:
        audio_bytes = base64.b64decode(audio_b64.split(",")[-1])
        resp = httpx.post(
            f"{config.SARVAM_BASE_URL}/speech-to-text",
            headers=_headers(),
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={"model": config.SARVAM_STT_MODEL, "language_code": config.language_to_code(language)},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("transcript", "").strip() or None
    except Exception:
        return None
