# SkillCall Telephony: real phone calls via Exotel

This folder connects **real phone calls** to SkillCall. A beneficiary dials a
number from **any phone, including a basic keypad phone**. The call reaches our
server, and we can:

- 🎧 **hear the caller live** in a browser dashboard,
- 🔢 **see which keys they press** (DTMF), live,
- 🔊 **play audio back to the caller's phone**: a welcome clip when the call
  connects, and a different clip for each key they press,
- 💾 **save each call's audio** as a `.wav` file.

This replaces the *"Telephony → simulated missed-call/callback UI"* stub in the
main prototype with a working telephony path.

## Status

| Step | Status |
|---|---|
| FastAPI WebSocket server receives Exotel's audio stream | ✅ Working |
| Laptop reachable from the internet via Cloudflare Tunnel (`wss://`) | ✅ Working |
| Exotel flow (Voicebot applet) attached to the trial number | ✅ Working |
| Real mobile call reaches the server | ✅ Working |
| Key presses (DTMF) shown live in the browser | ✅ Working (tested on a real call) |
| Caller's voice streamed live to the browser | ✅ Built |
| Audio played back to the caller (welcome and per-key clips) | ✅ Built and tested with a simulated call |
| Speech-to-text, AI interview, text-to-speech on the call | 🟡 Written and tested with simulated calls, **not wired in yet** (see [`backend/later/`](backend/later/)) |

### Known limitation: the trial number asks for a PIN

On an Exotel **trial** account, the number is shared by many trial accounts.
Callers are first asked to *"enter your PIN followed by #"* so Exotel knows
which account the call belongs to. Our code never asks for a PIN. To remove
this step you need a **dedicated ExoPhone** (a paid plan, with KYC). With a
dedicated number, calls go straight into the flow.

## How it works

```
Keypad phone ──cellular──▶ Exotel ──wss:// (Voicebot applet)──▶ Cloudflare Tunnel
                                                                    │
                                                                    ▼
                                         FastAPI  (telephony/backend/main.py)
                                          ├─ /exotel          ◀─▶ Exotel audio + events
                                          ├─ /dashboard       browser page
                                          ├─ /dashboard/ws    live audio + keys → browser
                                          └─ /audio/{slot}    upload clips per key
```

- Exotel's **Voicebot** applet opens a **two-way** WebSocket. (The *Stream*
  applet is one-way only and does not send key presses.)
- Audio in both directions is raw PCM: **16-bit, 8000 Hz, mono,
  little-endian, base64**.
- Audio sent to the caller goes in chunks that are multiples of 320 bytes
  (we use 3,200 bytes = 200 ms). Uploaded mp3/wav/flac/ogg files are converted
  automatically with `miniaudio` (no ffmpeg needed).
- When a new key is pressed, we send `clear` to stop the current clip, stream
  the new clip, then send a `mark`. Exotel echoes the `mark` back when
  playback finishes.

### Exotel events we handle

| Event | What we do |
|---|---|
| `connected` | log it |
| `start` | read `stream_sid` and the sample rate, notify the dashboard, play the welcome clip (or a beep if none is uploaded) |
| `media` | save the caller audio and forward it live to the browser |
| `dtmf` | show the key on the dashboard, play that key's clip |
| `mark` | clip finished, so clear the "playing" label |
| `stop` | end of call, save the recording |

## Run it

### 1. Start the server
```bash
cd telephony/backend
python -m venv venv
venv\Scripts\activate              # Windows  (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Check that `http://localhost:8000/` returns `{"status":"SIH phone backend is running"}`.

### 2. Make it public with Cloudflare Tunnel
Run this in a second terminal:
```bash
cloudflared tunnel --url http://localhost:8000
```
Copy the `https://<random-words>.trycloudflare.com` URL it prints.
⚠️ You get a **new URL every time** you restart cloudflared.

### 3. Point Exotel at it
1. In Exotel, open **App Bazaar**, then your flow (ours is called *sih idea*).
2. Put the **Voicebot** applet in *Call Start*. Set its URL to
   `wss://<random-words>.trycloudflare.com/exotel`. It must start with `wss://`
   and end with `/exotel`.
3. Leave *Record this?* and *Encrypt DTMF?* **unticked**.
4. Optional: put a **Hangup** applet in *Next*.
5. Click **SAVE**, and make sure the flow is assigned to your ExoPhone.

### 4. Open the dashboard and call
- Open `http://localhost:8000/dashboard` and click **🔊 Click to enable sound**
  (browsers need a click before they play audio).
- Under **🎵 Sounds played to the caller**, upload a clip for *Welcome* and
  for any keys (1–9, 0, \*, #).
- Call the Exotel number from any phone (on a trial number, enter the PIN
  first), then speak and press keys.

## Folder layout

```
telephony/
├── backend/
│   ├── main.py            # the whole phone bridge (Exotel WS, dashboard WS, uploads)
│   ├── requirements.txt   # fastapi, uvicorn, miniaudio
│   ├── audio/             # uploaded clips: welcome.mp3, 1.wav, ... (git-ignored)
│   ├── recordings/        # saved calls (git-ignored, contains real voices)
│   └── later/             # next phase: AI voice interview (not wired in yet)
│       ├── bot.py         # SkillCall interview + profile extraction (Claude, or a fixed script)
│       ├── speech.py      # VAD, STT (Sarvam Saaras / Whisper), TTS (Sarvam Bulbul / edge-tts)
│       ├── requirements.txt
│       └── .env.example   # ANTHROPIC_API_KEY, SARVAM_API_KEY, tuning
└── frontend/
    └── index.html         # dashboard: live listen, keys, per-key clip upload
```

## Next steps

1. **Wire in the AI voice interview** from `backend/later/`. It detects when
   the caller stops speaking, then runs STT (Sarvam Saaras) → interview and
   profile extraction (LLM) → TTS (Sarvam Bulbul) → caller. That code was
   tested end to end with simulated Hindi calls. It needs `SARVAM_API_KEY`
   and `ANTHROPIC_API_KEY`, and falls back to free local Whisper and edge-tts
   without them.
2. Send the extracted profile to the main SkillCall backend (`backend/app/`)
   so a real call feeds occupation matching, skill gap and recommendations.
3. Get a dedicated ExoPhone to remove the trial PIN step.
4. Replace the quick Cloudflare Tunnel with a named tunnel or a deployed
   server, so the Exotel URL stops changing.
