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

## What is stubbed for later connection

The prototype runs fully offline. These target integrations are simulated and
can be wired in later without changing the app's data contracts:
- **Sarvam STT / TTS / LLM** and **AI4Bharat IndicConformer** → browser Web
  Speech API + a transparent rule/keyword engine (`backend/app/engine.py`).
- **Telephony (Exotel/Plivo)** → simulated missed-call / callback UI.
- **PostgreSQL + pgvector, Redis + Celery** → SQLite; not needed at prototype
  scale.
- **Real government/scheme data & document verification** → clearly-labelled
  demo/sample data; no official statistics are invented.

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
