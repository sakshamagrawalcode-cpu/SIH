import json
import random
import string
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import get_conn, add_case_history

router = APIRouter(prefix="/api/cases", tags=["cases"])


def generate_case_id() -> str:
    suffix = "".join(random.choices(string.digits, k=5))
    return f"SC-2026-{suffix}"


class CaseCreateRequest(BaseModel):
    name: str
    age: int
    gender: str | None = None
    education: str
    location: str
    phone: str
    language: str
    occupation: str
    years_experience: int
    skill_gap: list[dict]
    selected_option: dict
    career_path: list[dict]
    satya_checks: dict
    eligibility: dict | None = None


@router.post("")
def create_case(req: CaseCreateRequest):
    case_id = generate_case_id()
    csc = req.selected_option.get("centre", "Nearest CSC")
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO cases
            (case_id, name, age, gender, education, location, phone, language, occupation,
             years_experience, skill_gap_json, selected_option_json, career_path_json,
             satya_checks_json, eligibility_json, csc, status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (case_id, req.name, req.age, req.gender, req.education, req.location, req.phone, req.language,
             req.occupation, req.years_experience, json.dumps(req.skill_gap),
             json.dumps(req.selected_option), json.dumps(req.career_path),
             json.dumps(req.satya_checks), json.dumps(req.eligibility or {}), csc, "submitted"),
        )
        for milestone in ("M1", "M3", "M6"):
            conn.execute(
                "INSERT INTO followups (case_id, milestone, status, outcome) VALUES (?,?,?,?)",
                (case_id, milestone, "pending", "not_started"),
            )
        add_case_history(conn, case_id, "draft", "Profile drafted during call")
        add_case_history(conn, case_id, "user_confirmed", "User confirmed profile and selected option")
        add_case_history(conn, case_id, "submitted", "Case submitted for officer review")
        # attach any documents uploaded under this phone that aren't linked yet
        conn.execute(
            "UPDATE documents SET case_id=? WHERE phone=? AND (case_id IS NULL OR case_id='')",
            (case_id, req.phone),
        )
        conn.commit()
    return {"case_id": case_id, "csc": csc, "status": "submitted"}


def _row_to_case(row) -> dict:
    return {
        "case_id": row["case_id"],
        "name": row["name"],
        "age": row["age"],
        "gender": row["gender"],
        "education": row["education"],
        "location": row["location"],
        "phone": row["phone"],
        "language": row["language"],
        "occupation": row["occupation"],
        "years_experience": row["years_experience"],
        "skill_gap": json.loads(row["skill_gap_json"]),
        "selected_option": json.loads(row["selected_option_json"]),
        "career_path": json.loads(row["career_path_json"]),
        "satya_checks": json.loads(row["satya_checks_json"]),
        "eligibility": json.loads(row["eligibility_json"]) if row["eligibility_json"] else {},
        "csc": row["csc"],
        "status": row["status"],
        "officer_note": row["officer_note"],
        "created_at": row["created_at"],
    }


@router.get("/{case_id}")
def get_case(case_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM cases WHERE case_id=?", (case_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Case not found")
        history = conn.execute(
            "SELECT stage, note, created_at FROM case_history WHERE case_id=? ORDER BY id ASC", (case_id,)
        ).fetchall()
        docs = conn.execute(
            "SELECT id, doc_type, filename, content_type, uploaded_at FROM documents WHERE case_id=? ORDER BY id DESC",
            (case_id,),
        ).fetchall()
    case = _row_to_case(row)
    case["history"] = [dict(h) for h in history]
    case["documents"] = [dict(d) for d in docs]
    return case
