from fastapi import APIRouter
from pydantic import BaseModel
from ..services import config, pipeline, sarvam

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/models")
def models():
    """Report the tech stack: which models are live vs simulated, plus the pipeline flowchart."""
    return {
        "models": config.model_status(),
        "pipeline": pipeline.flowchart(),
        "engines": {
            "stt": pipeline.stt_engine(),
            "llm": pipeline.llm_engine(),
            "tts": pipeline.tts_engine(),
        },
        "any_live": any(m["status"] == "live" for m in config.model_status().values()),
        "note": "Set SARVAM_API_KEY (and optionally AI4BHARAT_ENDPOINT) to switch models from simulated to live. No code change needed.",
    }


class TTSRequest(BaseModel):
    text: str
    language: str = "Hindi"


@router.post("/tts")
def tts(req: TTSRequest):
    """Return Sarvam Bulbul audio when live; otherwise signal browser TTS fallback."""
    audio = sarvam.text_to_speech(req.text, req.language)
    if audio:
        return {"engine": "Sarvam Bulbul", "audio": audio, "fallback": False}
    return {"engine": "Browser SpeechSynthesis (demo)", "audio": None, "fallback": True}


class STTRequest(BaseModel):
    audio: str
    language: str = "Hindi"


@router.post("/stt")
def stt(req: STTRequest):
    """Transcribe with Sarvam Saaras, then AI4Bharat, else signal browser STT fallback."""
    from ..services import ai4bharat
    text = sarvam.speech_to_text(req.audio, req.language)
    if text:
        return {"engine": "Sarvam Saaras", "transcript": text, "fallback": False}
    text = ai4bharat.speech_to_text(req.audio, req.language)
    if text:
        return {"engine": "AI4Bharat IndicConformer", "transcript": text, "fallback": False}
    return {"engine": "Browser Web Speech (demo)", "transcript": None, "fallback": True}
