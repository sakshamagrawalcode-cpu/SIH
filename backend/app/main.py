from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db
from .routers import conversation, cases, officer, followup, map as map_router

app = FastAPI(title="SkillCall Prototype API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(conversation.router)
app.include_router(cases.router)
app.include_router(officer.router)
app.include_router(followup.router)
app.include_router(map_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SkillCall Prototype API (SIH26097 - Team Cognify)"}
