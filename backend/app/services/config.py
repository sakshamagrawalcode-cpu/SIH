"""Environment-driven configuration for the SkillCall model stack.

Every external model (Sarvam STT/TTS/LLM, AI4Bharat) is OFF by default and the
prototype runs fully on local fallbacks. Set the matching environment variable
(e.g. SARVAM_API_KEY) to switch that model to "live". Nothing here logs or
exposes the key itself.
"""
import os
from pathlib import Path


def _load_dotenv():
    """Minimal .env loader (backend/.env) so no extra dependency is needed."""
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    try:
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val
    except Exception:
        pass


_load_dotenv()


def _bool(name: str, default: bool = True) -> bool:
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes", "on")


# --- Sarvam AI (STT Saaras, TTS Bulbul, LLM Sarvam-M / 30B / 105B) ---
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "").strip()
SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai").rstrip("/")
SARVAM_STT_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v2.5")          # Sarvam Saaras
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v2")            # Sarvam Bulbul
SARVAM_LLM_MODEL = os.getenv("SARVAM_LLM_MODEL", "sarvam-m")             # Sarvam LLM (M / 30B / 105B family)
SARVAM_TTS_SPEAKER = os.getenv("SARVAM_TTS_SPEAKER", "anushka")

# --- AI4Bharat IndicConformer (STT fallback) ---
AI4BHARAT_ENDPOINT = os.getenv("AI4BHARAT_ENDPOINT", "").strip()
AI4BHARAT_API_KEY = os.getenv("AI4BHARAT_API_KEY", "").strip()

# --- feature flags ---
ENABLE_LLM = _bool("SKILLCALL_ENABLE_LLM", True) and bool(SARVAM_API_KEY)
ENABLE_TTS = _bool("SKILLCALL_ENABLE_TTS", True) and bool(SARVAM_API_KEY)
ENABLE_STT = _bool("SKILLCALL_ENABLE_STT", True) and bool(SARVAM_API_KEY)
ENABLE_AI4BHARAT = bool(AI4BHARAT_ENDPOINT)

# Telephony / infra (declared for the architecture view; not called in prototype)
TELEPHONY_PROVIDER = os.getenv("SKILLCALL_TELEPHONY", "")  # exotel | plivo | ""


def language_to_code(language: str) -> str:
    return {
        "Hindi": "hi-IN", "English": "en-IN", "Gujarati": "gu-IN",
        "Marathi": "mr-IN", "Tamil": "ta-IN", "Telugu": "te-IN", "Bengali": "bn-IN",
    }.get(language, "hi-IN")


def model_status() -> dict:
    """Report which parts of the stack are live vs. simulated (no secrets)."""
    return {
        "stt": {
            "name": "Sarvam Saaras", "model": SARVAM_STT_MODEL,
            "role": "Speech-to-text (Indic)",
            "status": "live" if ENABLE_STT else "simulated",
            "fallback": "Browser Web Speech API + AI4Bharat IndicConformer",
        },
        "stt_fallback": {
            "name": "AI4Bharat IndicConformer", "model": "indic-conformer",
            "role": "Indic STT fallback",
            "status": "live" if ENABLE_AI4BHARAT else "simulated",
            "fallback": "Browser Web Speech API",
        },
        "llm": {
            "name": "Sarvam LLM", "model": SARVAM_LLM_MODEL,
            "role": "Occupation mapping, dialog & Q&A",
            "status": "live" if ENABLE_LLM else "simulated",
            "fallback": "Local rule/keyword engine",
        },
        "tts": {
            "name": "Sarvam Bulbul", "model": SARVAM_TTS_MODEL,
            "role": "Text-to-speech (Indic)",
            "status": "live" if ENABLE_TTS else "simulated",
            "fallback": "Browser SpeechSynthesis",
        },
        "orchestration": {
            "name": "Pipecat", "model": "voice pipeline",
            "role": "Real-time STT↔LLM↔TTS orchestration",
            "status": "simulated",
            "fallback": "In-process pipeline orchestrator",
        },
        "telephony": {
            "name": "Exotel / Plivo", "model": TELEPHONY_PROVIDER or "n/a",
            "role": "Missed-call / callback telephony",
            "status": "live" if TELEPHONY_PROVIDER else "simulated",
            "fallback": "Browser call simulator",
        },
        "database": {
            "name": "PostgreSQL + pgvector", "model": "n/a",
            "role": "Cases, profiles, vector search",
            "status": "simulated",
            "fallback": "SQLite (bundled)",
        },
    }
