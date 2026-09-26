# SkillCall — SIH 2026 (PS SIH26097) — Team Cognify

**Ministry:** MoSJE · **Theme:** Agriculture, FoodTech & Rural Development

> "One free phone call that turns skills into the right work."

SkillCall is a free, local-language voice assistant concept that maps a person's
existing skills to suitable livelihood options under PM-AJAY GIA — no app,
no internet, no reading required by the end user. This repo is a **working
functional prototype** for the hackathon demo, not a production system.

## What's in this prototype

- **Frontend** (`frontend/`): React (Vite) app with two sides:
  - **User / phone simulator** — a 3-panel Call Simulator (live profile table ·
    phone + conversation · AI-pipeline status). Full flow: dial saved number →
    call runs and auto-ends → callback → answer → IVR language select
    (Hindi / English / Gujarati, press 1/2/3) → first-time check → keypad +
    voice profile collection (name, age, gender, education, location, travel,
    work, experience) with live table updates → read-back & correct →
    eligibility check → NCO occupation match → occupation-specific questions
    (one at a time, with progress) → HAS/NEEDS/MISSING skill gap →
    recommendations → career path → free Q&A (SATYA-verified) → option select
    → SATYA verification → case creation. Plus **User Portal**, **Edit Profile**
    and **Documents** upload pages.
  - **Officer / admin portal** — dashboard, case detail with status timeline,
    skill gap, recommendation, document viewer, case history, approve /
    request-clarification, follow-up outcomes (M1/M3/M6), and a Leaflet
    **Demand Map**.
  - **Demo controls** bar (Reset · Simulate Missed Call · Answer · Auto-fill
    Ramesh · Auto-fill Sunita · Skip Voice) for fast judging.
- **Backend** (`backend/`): FastAPI service with rule/keyword-based
  occupation-matching, eligibility, skill-gap, recommendation,
  SATYA-verification, Q&A (answers only from verified demo data), profile
  (first-time check by phone), documents, case, officer-approval and
  follow-up engines, backed by SQLite and demo CSV/JSON data.
- **Voice**: simulated in-browser using the Web Speech API (STT + TTS) with a
  typed-text fallback where the browser doesn't support it. This stands in
  for the production stack (Pipecat + Sarvam Saaras/Bulbul/LLM + AI4Bharat
  IndicConformer) described in the architecture doc.

## Model stack (Sarvam · AI4Bharat · Pipecat)

The real tech stack is wired in and **activates automatically when API keys are
present**, falling back to fully-working local/browser engines otherwise. See
the live/simulated status any time on the **Architecture** page (`/architecture`)
or via `GET /api/system/models`.

| Component | Model / tech | Live when… | Fallback (demo) |
|---|---|---|---|
| STT | **Sarvam Saaras** (`saaras:v2.5`) | `SARVAM_API_KEY` set | Browser Web Speech API |
| STT fallback | **AI4Bharat IndicConformer** | `AI4BHARAT_ENDPOINT` set | Browser Web Speech API |
| LLM (NCO map, dialog, Q&A) | **Sarvam LLM** (`sarvam-m` / 30B / 105B) | `SARVAM_API_KEY` set | Local rule/keyword engine |
| TTS | **Sarvam Bulbul** (`bulbul:v2`) | `SARVAM_API_KEY` set | Browser SpeechSynthesis |
| Orchestration | **Pipecat** voice pipeline | (prod) | In-process orchestrator |
| Telephony | **Exotel / Plivo** | `SKILLCALL_TELEPHONY` set | Browser call simulator |
| DB | **PostgreSQL + pgvector** | (prod) | SQLite (bundled) |

Integration lives in `backend/app/services/` (`sarvam.py`, `ai4bharat.py`,
`pipeline.py`, `config.py`). To go live, copy `backend/.env.example` to
`backend/.env` and set `SARVAM_API_KEY` — the LLM then drives occupation
matching and rephrases SATYA-verified answers in the caller's language, and
Bulbul audio replaces browser TTS. **SATYA still gates every fact against the
database, so the LLM can never introduce an unverified government claim.**

All scheme/course/demand data remains clearly-labelled demo/sample data; no
official statistics are invented.

**All scheme names, course details, distances, demand figures and outcomes
are illustrative demo/sample data** — clearly marked in the UI — and must
not be treated as official PM-AJAY/PMKVY statistics or claims.

## Running locally

### Backend
```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python -m uvicorn app.main:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open the frontend URL (default `http://localhost:5173`). The frontend reads
the API base URL from `frontend/.env` (`VITE_API_URL`, defaults to
`http://localhost:8000`).

## Demo flow

1. On the landing page, click **Start Voice Demo — Ramesh (Bike Mechanic)**.
2. Walk through: missed call → callback → language + consent → keypad facts
   → voice skill description → AI occupation match → occupation-specific
   skill questions → skill gap (HAS/NEEDS/MISSING) → recommended options →
   career path → SATYA verification → case creation.
3. From the Case screen, click **Simulate: View as Officer** to see the
   officer dashboard, approve the case, and walk through the M1/M3/M6
   follow-up timeline.
4. Visit the **Demand Map** tab to see block-wise demand (demo data).
5. A second persona (**Sunita — Tailor**) is available from the landing page
   to demonstrate a different occupation path.

## Architecture (prototype vs. target)

| Layer | Target (per problem statement) | This prototype |
|---|---|---|
| Voice orchestration | Pipecat | Browser Web Speech API (STT/TTS) |
| STT | Sarvam Saaras v3 / AI4Bharat IndicConformer | Browser SpeechRecognition |
| TTS | Sarvam Bulbul v3 | Browser SpeechSynthesis |
| Occupation/skill matching | Sarvam LLM (30B/105B) | Rule/keyword engine over demo CSVs (`backend/app/engine.py`) — same input/output contract, swappable later |
| DB | PostgreSQL + pgvector | SQLite (cases, follow-ups) + CSV/JSON reference data |
| Cache/jobs | Redis + Celery | Not needed at prototype scale |
| Map | Leaflet | Leaflet (same) |
| Telephony | Exotel/Plivo | Simulated missed-call/callback UI |

## Data

Demo reference data lives in `backend/app/data/`: `occupations.csv`,
`job_roles.csv`, `competencies.csv`, `courses.csv`, `schemes.csv`,
`career_paths.csv`, and `rules.json`. These are illustrative sample records
only.
