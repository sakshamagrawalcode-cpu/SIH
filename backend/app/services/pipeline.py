"""Pipecat-style voice pipeline definition + flowchart for SkillCall.

In production this graph runs inside Pipecat as a real-time voice pipeline
(telephony ↔ STT ↔ LLM ↔ engines ↔ SATYA ↔ TTS). Here it serves two purposes:
 1. A machine-readable stage graph the frontend renders as the architecture
    flowchart.
 2. `active_engine()` helpers so the API can report which real model handled a
    step (Sarvam LLM vs. local rule engine, Bulbul vs. browser TTS, etc.).
"""
from . import config, sarvam, ai4bharat


# Ordered pipeline stages (matches the problem-statement architecture).
PIPELINE = [
    {"id": "telephony", "label": "Missed call / callback", "tech": "Exotel / Plivo",
     "live": bool(config.TELEPHONY_PROVIDER)},
    {"id": "stt", "label": "Speech → Text", "tech": f"Sarvam Saaras ({config.SARVAM_STT_MODEL})",
     "live": config.ENABLE_STT},
    {"id": "stt_fallback", "label": "Indic STT fallback", "tech": "AI4Bharat IndicConformer",
     "live": config.ENABLE_AI4BHARAT},
    {"id": "llm", "label": "Dialog + NCO mapping", "tech": f"Sarvam LLM ({config.SARVAM_LLM_MODEL})",
     "live": config.ENABLE_LLM},
    {"id": "skill_engine", "label": "Skill / gap engine", "tech": "Rule + competency DB", "live": True},
    {"id": "reco_engine", "label": "Recommendation engine", "tech": "Rules + course DB", "live": True},
    {"id": "satya", "label": "SATYA verification", "tech": "DB fact-check layer", "live": True},
    {"id": "tts", "label": "Text → Speech", "tech": f"Sarvam Bulbul ({config.SARVAM_TTS_MODEL})",
     "live": config.ENABLE_TTS},
    {"id": "orchestration", "label": "Voice orchestration", "tech": "Pipecat", "live": False},
    {"id": "db", "label": "Cases / profiles / vectors", "tech": "PostgreSQL + pgvector", "live": False},
    {"id": "officer", "label": "Officer dashboard", "tech": "FastAPI + React", "live": True},
]


def flowchart() -> dict:
    return {
        "stages": PIPELINE,
        "edges": [
            ["telephony", "stt"], ["stt", "stt_fallback"], ["stt", "llm"],
            ["stt_fallback", "llm"], ["llm", "skill_engine"], ["skill_engine", "reco_engine"],
            ["reco_engine", "satya"], ["satya", "tts"], ["tts", "orchestration"],
            ["skill_engine", "db"], ["db", "officer"],
        ],
        "note": "Pipecat orchestrates the real-time loop; anything marked simulated runs on a local fallback until its API key/endpoint is configured.",
    }


def stt_engine() -> str:
    if sarvam.available() and config.ENABLE_STT:
        return "Sarvam Saaras"
    if ai4bharat.available():
        return "AI4Bharat IndicConformer"
    return "Browser Web Speech (demo)"


def llm_engine() -> str:
    return "Sarvam LLM" if (sarvam.available() and config.ENABLE_LLM) else "Local rule engine (demo)"


def tts_engine() -> str:
    return "Sarvam Bulbul" if (sarvam.available() and config.ENABLE_TTS) else "Browser SpeechSynthesis (demo)"
