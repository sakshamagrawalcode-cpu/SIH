# SkillCall — SIH 2026 (PS SIH26097) — Team Cognify

**Ministry:** MoSJE · **Theme:** Agriculture, FoodTech & Rural Development

> "One free phone call that turns skills into the right work."

SkillCall is a free, local-language voice assistant concept that maps a person's
existing skills to suitable livelihood options under PM-AJAY GIA — no app,
no internet, no reading required by the end user. This repo is a **working
functional prototype** for the hackathon demo, not a production system.

## What's in this prototype

- **Frontend** (`frontend/`): React (Vite) app implementing the full 11-screen
  user + officer journey: Landing → Phone/Voice → Profile → Skill Gap →
  Recommendations → Career Path → SATYA → Case → Officer Dashboard →
  Follow-up → Demand Map (Leaflet).
- **Backend** (`backend/`): FastAPI service with a rule/keyword-based
  occupation-matching, skill-gap, recommendation, SATYA-verification, case,
  officer-approval and follow-up engine, backed by SQLite and demo CSV data.
- **Voice**: simulated in-browser using the Web Speech API (STT + TTS) with a
  typed-text fallback where the browser doesn't support it. This stands in
  for the production stack (Pipecat + Sarvam Saaras/Bulbul/LLM + AI4Bharat
  IndicConformer) described in the architecture doc.

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
