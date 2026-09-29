"""
Speech helpers: voice-activity detection, speech-to-text, text-to-speech.

All audio here is raw PCM: 16-bit signed, little-endian, mono
(exactly what Exotel sends/expects, "slin").

If SARVAM_API_KEY is set:   STT = Sarvam Saaras,  TTS = Sarvam Bulbul
Otherwise (free fallback):  STT = local Whisper,  TTS = edge-tts
"""
import io
import os
import wave

import numpy as np

# -------------------------
# CONFIG (set in backend/.env or as environment variables)
# -------------------------
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v3")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
SARVAM_SPEAKER = os.getenv("SARVAM_SPEAKER", "priya")

STT_MODEL = os.getenv("STT_MODEL", "small")  # Whisper fallback: tiny/base/small/medium
EDGE_VOICES = {"hi": "hi-IN-SwaraNeural", "en": "en-IN-NeerjaNeural"}

VAD_THRESHOLD = int(os.getenv("VAD_THRESHOLD", "500"))  # RMS level counted as speech
VAD_SILENCE_MS = int(os.getenv("VAD_SILENCE_MS", "800"))  # pause that ends a sentence

USING_SARVAM = bool(SARVAM_API_KEY)


# -------------------------
# VOICE ACTIVITY DETECTION
# -------------------------
class UtteranceDetector:
    """
    Feed raw PCM in; get back a complete utterance (bytes) whenever the
    caller finishes speaking (i.e. a pause of VAD_SILENCE_MS after speech).
    """

    def __init__(self, sample_rate, frame_ms=20, min_speech_ms=300,
                 max_speech_ms=20000, preroll_ms=200):
        self.frame_bytes = int(sample_rate * frame_ms / 1000) * 2
        self.min_speech_frames = min_speech_ms // frame_ms
        self.max_frames = max_speech_ms // frame_ms
        self.silence_frames_needed = VAD_SILENCE_MS // frame_ms
        self.preroll_frames = preroll_ms // frame_ms
        self.reset()

    def reset(self):
        self.leftover = b""
        self.preroll = []
        self.speech = []
        self.in_speech = False
        self.voiced_frames = 0
        self.silent_frames = 0

    def feed(self, pcm):
        """Returns (speech_started, finished_utterance_or_None)."""
        started = False
        finished = None
        data = self.leftover + pcm
        n = len(data) // self.frame_bytes * self.frame_bytes
        self.leftover = data[n:]

        for i in range(0, n, self.frame_bytes):
            frame = data[i:i + self.frame_bytes]
            samples = np.frombuffer(frame, dtype=np.int16).astype(np.float32)
            voiced = np.sqrt(np.mean(samples ** 2)) > VAD_THRESHOLD

            if not self.in_speech:
                self.preroll.append(frame)
                self.preroll = self.preroll[-self.preroll_frames:]
                self.voiced_frames = self.voiced_frames + 1 if voiced else 0
                if self.voiced_frames >= 3:  # 60 ms of sound -> speech began
                    self.in_speech = True
                    started = True
                    self.speech = list(self.preroll)
                    self.silent_frames = 0
                continue

            self.speech.append(frame)
            if voiced:
                self.voiced_frames += 1
                self.silent_frames = 0
            else:
                self.silent_frames += 1

            if (self.silent_frames >= self.silence_frames_needed
                    or len(self.speech) >= self.max_frames):
                if self.voiced_frames >= self.min_speech_frames:
                    finished = b"".join(self.speech)
                self.in_speech = False
                self.voiced_frames = 0
                self.preroll = []
                self.speech = []

        return started, finished


# -------------------------
# AUDIO UTILS
# -------------------------
def pcm_to_wav(pcm, sample_rate):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm)
    return buf.getvalue()


def resample(pcm, from_rate, to_rate):
    if from_rate == to_rate:
        return pcm
    audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32)
    n = int(len(audio) * to_rate / from_rate)
    out = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio)
    return out.astype(np.int16).tobytes()


# -------------------------
# SPEECH -> TEXT
# -------------------------
_whisper = None


def load_stt():
    """Pre-load the local Whisper model (only used without a Sarvam key)."""
    global _whisper
    if USING_SARVAM:
        print("STT: Sarvam", SARVAM_STT_MODEL)
        return None
    if _whisper is None:
        from faster_whisper import WhisperModel
        print(f"STT: loading Whisper '{STT_MODEL}' (first time downloads it)...")
        _whisper = WhisperModel(STT_MODEL, device="cpu", compute_type="int8")
        print("STT: Whisper ready.")
    return _whisper


def transcribe(pcm, sample_rate, lang="hi"):
    """Blocking. Run it with asyncio.to_thread(). lang: "hi" / "en" / None=auto."""
    if USING_SARVAM:
        return _sarvam_stt(pcm, sample_rate, lang)

    audio = np.frombuffer(resample(pcm, sample_rate, 16000), dtype=np.int16)
    audio = audio.astype(np.float32) / 32768.0
    segments, _info = load_stt().transcribe(audio, language=lang, beam_size=1)
    return " ".join(s.text.strip() for s in segments).strip()


def _sarvam_stt(pcm, sample_rate, lang):
    import httpx

    resp = httpx.post(
        "https://api.sarvam.ai/speech-to-text",
        headers={"api-subscription-key": SARVAM_API_KEY},
        files={"file": ("audio.wav", pcm_to_wav(pcm, sample_rate), "audio/wav")},
        data={
            "model": SARVAM_STT_MODEL,
            "mode": "transcribe",
            "language_code": f"{lang}-IN" if lang else "unknown",
        },
        timeout=30,
    )
    resp.raise_for_status()
    return (resp.json().get("transcript") or "").strip()


# -------------------------
# TEXT -> SPEECH
# -------------------------
_tts_cache = {}


async def synthesize(text, sample_rate, lang="hi"):
    """Returns raw 16-bit mono PCM at `sample_rate`, ready to send to Exotel."""
    key = (text, sample_rate, lang)
    if key in _tts_cache:
        return _tts_cache[key]

    if USING_SARVAM:
        pcm = await _sarvam_tts(text, sample_rate, lang)
    else:
        pcm = await _edge_tts(text, sample_rate, lang)

    if len(_tts_cache) < 200:
        _tts_cache[key] = pcm
    return pcm


async def _sarvam_tts(text, sample_rate, lang):
    import base64
    import httpx

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            headers={"api-subscription-key": SARVAM_API_KEY},
            json={
                "text": text,
                "language_code": f"{lang}-IN",
                "model": SARVAM_TTS_MODEL,
                "speaker": SARVAM_SPEAKER,
                "speech_sample_rate": sample_rate,
                "output_audio_codec": "wav",
            },
        )
    resp.raise_for_status()
    pcm = b""
    for audio_b64 in resp.json()["audios"]:
        with wave.open(io.BytesIO(base64.b64decode(audio_b64))) as w:
            chunk = w.readframes(w.getnframes())
            pcm += resample(chunk, w.getframerate(), sample_rate)
    return pcm


async def _edge_tts(text, sample_rate, lang):
    import edge_tts
    import miniaudio

    mp3 = bytearray()
    voice = EDGE_VOICES.get(lang, EDGE_VOICES["hi"])
    async for chunk in edge_tts.Communicate(text, voice).stream():
        if chunk["type"] == "audio":
            mp3.extend(chunk["data"])

    decoded = miniaudio.decode(
        bytes(mp3),
        output_format=miniaudio.SampleFormat.SIGNED16,
        nchannels=1,
        sample_rate=sample_rate,
    )
    return decoded.samples.tobytes()
