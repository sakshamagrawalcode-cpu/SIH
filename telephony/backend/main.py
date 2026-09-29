"""
Simple phone <-> laptop audio bridge (Exotel Voicebot applet).

Keypad phone calls the Exotel number
  -> Exotel answers and opens a WebSocket to /exotel
  -> caller's voice is streamed live to the browser page at /dashboard
  -> key presses are shown there too
  -> when the call starts, audio/welcome.* is played to the caller
  -> when the caller presses a key, audio/<key>.* is played to the caller
  -> full call audio is saved as a .wav file when the call ends

Audio files are uploaded from the dashboard (mp3 / wav / flac / ogg).
"""
from datetime import datetime
from pathlib import Path
import asyncio
import base64
import json
import math
import struct
import wave

import miniaudio
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse

BASE_DIR = Path(__file__).parent
RECORDINGS_DIR = BASE_DIR / "recordings"
RECORDINGS_DIR.mkdir(exist_ok=True)
AUDIO_DIR = BASE_DIR / "audio"          # welcome.mp3, 1.mp3, 2.wav, ...
AUDIO_DIR.mkdir(exist_ok=True)
DASHBOARD_HTML = BASE_DIR.parent / "frontend" / "index.html"

SLOTS = ["welcome", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "star", "hash"]
ALLOWED_EXT = {".mp3", ".wav", ".flac", ".ogg"}
CHUNK_MS = 200                           # Exotel: chunks of >= 3.2 KB, multiple of 320

app = FastAPI()
browsers = set()   # open dashboard pages
_pcm_cache = {}    # (slot, sample_rate) -> raw PCM bytes


# -------------------------
# AUDIO FILES
# -------------------------
def slot_for_digit(digit):
    return {"*": "star", "#": "hash"}.get(digit, digit)


def find_audio_file(slot):
    for path in AUDIO_DIR.glob(f"{slot}.*"):
        if path.suffix.lower() in ALLOWED_EXT:
            return path
    return None


def load_pcm(slot, sample_rate):
    """Decode an uploaded file to raw 16-bit mono PCM at the call's sample rate."""
    key = (slot, sample_rate)
    if key not in _pcm_cache:
        path = find_audio_file(slot)
        if path is None:
            return None
        decoded = miniaudio.decode_file(
            str(path),
            output_format=miniaudio.SampleFormat.SIGNED16,
            nchannels=1,
            sample_rate=sample_rate,
        )
        _pcm_cache[key] = decoded.samples.tobytes()
    return _pcm_cache[key]


def beep(sample_rate, seconds=0.6, freq=800):
    """Fallback sound when no welcome file is uploaded."""
    n = int(sample_rate * seconds)
    return b"".join(
        struct.pack("<h", int(8000 * math.sin(2 * math.pi * freq * i / sample_rate)))
        for i in range(n)
    )


# -------------------------
# ONE PHONE CALL
# -------------------------
class Call:
    def __init__(self, websocket):
        self.ws = websocket
        self.stream_sid = None
        self.sample_rate = 8000
        self.send_lock = asyncio.Lock()
        self.player = None       # background task playing a clip

    async def send(self, obj):
        async with self.send_lock:
            await self.ws.send_text(json.dumps(obj))

    async def play(self, pcm, name):
        """Stop whatever is playing, then play `pcm` to the caller."""
        await self.stop()
        self.player = asyncio.create_task(self._stream(pcm, name))

    async def stop(self):
        if self.player and not self.player.done():
            self.player.cancel()
        await self.send({"event": "clear", "stream_sid": self.stream_sid})

    async def _stream(self, pcm, name):
        chunk = self.sample_rate * 2 * CHUNK_MS // 1000
        if len(pcm) % chunk:
            pcm += b"\x00" * (chunk - len(pcm) % chunk)   # pad the last chunk

        await send_to_browsers({"type": "playing", "name": name})
        loop = asyncio.get_running_loop()
        started = loop.time()
        for i, pos in enumerate(range(0, len(pcm), chunk)):
            await self.send({
                "event": "media",
                "stream_sid": self.stream_sid,
                "media": {"payload": base64.b64encode(pcm[pos:pos + chunk]).decode()},
            })
            # stay ~1 second ahead of real time instead of dumping it all at once
            ahead = started + (i + 1) * CHUNK_MS / 1000 - loop.time()
            if ahead > 1.0:
                await asyncio.sleep(ahead - 1.0)
        await self.send({"event": "mark", "stream_sid": self.stream_sid,
                         "mark": {"name": name}})


async def send_to_browsers(message):
    """Send text (dict) or audio (bytes) to every open dashboard page."""
    for ws in list(browsers):
        try:
            if isinstance(message, bytes):
                await ws.send_bytes(message)
            else:
                await ws.send_text(json.dumps(message))
        except Exception:
            browsers.discard(ws)


# -------------------------
# WEB PAGES
# -------------------------
@app.get("/")
def home():
    return {"status": "SIH phone backend is running"}


@app.get("/dashboard")
def dashboard():
    return FileResponse(DASHBOARD_HTML)


@app.get("/audio")
def list_audio():
    """Which key has which file."""
    return {slot: (p.name if (p := find_audio_file(slot)) else None) for slot in SLOTS}


@app.post("/audio/{slot}")
async def upload_audio(slot: str, request: Request, filename: str = ""):
    """Browser sends the raw file as the request body."""
    ext = Path(filename).suffix.lower()
    if slot not in SLOTS or ext not in ALLOWED_EXT:
        return JSONResponse({"error": "Use mp3, wav, flac or ogg"}, status_code=400)

    data = await request.body()
    try:  # make sure it can actually be decoded before saving
        miniaudio.decode(data, output_format=miniaudio.SampleFormat.SIGNED16,
                         nchannels=1, sample_rate=8000)
    except Exception:
        return JSONResponse({"error": "Could not read this audio file"}, status_code=400)

    old = find_audio_file(slot)
    if old:
        old.unlink()
    (AUDIO_DIR / f"{slot}{ext}").write_bytes(data)
    for key in [k for k in _pcm_cache if k[0] == slot]:
        del _pcm_cache[key]
    print(f"Uploaded audio for '{slot}': {filename}")
    return list_audio()


@app.delete("/audio/{slot}")
def delete_audio(slot: str):
    old = find_audio_file(slot)
    if old:
        old.unlink()
    for key in [k for k in _pcm_cache if k[0] == slot]:
        del _pcm_cache[key]
    return list_audio()


@app.websocket("/dashboard/ws")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    browsers.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        browsers.discard(websocket)


# -------------------------
# EXOTEL
# -------------------------
@app.websocket("/exotel")
async def exotel_websocket(websocket: WebSocket):
    await websocket.accept()
    print("\n==============================")
    print("EXOTEL WEBSOCKET CONNECTED")
    print("==============================")

    call = Call(websocket)
    audio_data = bytearray()

    try:
        while True:
            try:
                data = json.loads(await websocket.receive_text())
            except json.JSONDecodeError:
                continue

            event = data.get("event")

            if event == "connected":
                print("EVENT: connected")

            elif event == "start":
                start = data.get("start", {})
                call.stream_sid = data.get("stream_sid") or start.get("stream_sid")
                call.sample_rate = int(start.get("media_format", {}).get("sample_rate") or 8000)
                print("EVENT: start | Call SID:", start.get("call_sid"),
                      "| From:", start.get("from"))
                await send_to_browsers({"type": "call_started", "from": start.get("from"),
                                        "sample_rate": call.sample_rate})

                welcome = load_pcm("welcome", call.sample_rate)
                await call.play(welcome or beep(call.sample_rate), "welcome")

            elif event == "media":
                payload = data.get("media", {}).get("payload")
                if payload:
                    chunk = base64.b64decode(payload)
                    audio_data.extend(chunk)
                    await send_to_browsers(chunk)          # live audio to browser

            elif event == "dtmf":
                digit = data.get("dtmf", {}).get("digit")
                print("KEY PRESSED:", digit)
                await send_to_browsers({"type": "dtmf", "digit": digit})

                slot = slot_for_digit(digit)
                pcm = load_pcm(slot, call.sample_rate)
                if pcm:
                    print(f"Playing audio for key {digit}")
                    await call.play(pcm, f"key {digit}")

            elif event == "mark":
                name = data.get("mark", {}).get("name")
                await send_to_browsers({"type": "finished", "name": name})

            elif event == "stop":
                print("EVENT: stop")
                break

            else:
                print("EVENT:", event)

    except WebSocketDisconnect:
        print("Exotel WebSocket disconnected")
    except Exception as e:
        print("ERROR:", repr(e))
    finally:
        if call.player:
            call.player.cancel()
        if audio_data:
            path = RECORDINGS_DIR / f"call_{datetime.now():%Y%m%d_%H%M%S}.wav"
            with wave.open(str(path), "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(call.sample_rate)
                wav_file.writeframes(audio_data)
            print("Saved call audio:", path)
        await send_to_browsers({"type": "call_ended"})
