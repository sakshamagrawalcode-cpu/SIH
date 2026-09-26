import json
from fastapi import APIRouter
from pydantic import BaseModel
from ..db import get_conn

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("/{phone}")
def get_profile(phone: str):
    """First-time check: returns exists=False if no profile for this phone."""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM profiles WHERE phone=?", (phone,)).fetchone()
    if not row:
        return {"exists": False, "phone": phone}
    return {"exists": True, **_row_to_profile(row)}


class ProfileUpsert(BaseModel):
    phone: str
    name: str | None = None
    age: int | None = None
    gender: str | None = None
    education: str | None = None
    location: str | None = None
    travel_distance_km: int | None = None
    occupation: str | None = None
    years_experience: int | None = None
    language: str | None = None
    skill_gap: list[dict] | None = None
    selected_option: dict | None = None


@router.post("")
def upsert_profile(req: ProfileUpsert):
    with get_conn() as conn:
        existing = conn.execute("SELECT phone FROM profiles WHERE phone=?", (req.phone,)).fetchone()
        skill_gap_json = json.dumps(req.skill_gap) if req.skill_gap is not None else None
        selected_json = json.dumps(req.selected_option) if req.selected_option is not None else None
        if existing:
            conn.execute(
                """UPDATE profiles SET name=COALESCE(?,name), age=COALESCE(?,age),
                   gender=COALESCE(?,gender), education=COALESCE(?,education),
                   location=COALESCE(?,location), travel_distance_km=COALESCE(?,travel_distance_km),
                   occupation=COALESCE(?,occupation), years_experience=COALESCE(?,years_experience),
                   language=COALESCE(?,language), skill_gap_json=COALESCE(?,skill_gap_json),
                   selected_option_json=COALESCE(?,selected_option_json), updated_at=CURRENT_TIMESTAMP
                   WHERE phone=?""",
                (req.name, req.age, req.gender, req.education, req.location, req.travel_distance_km,
                 req.occupation, req.years_experience, req.language, skill_gap_json, selected_json, req.phone),
            )
        else:
            conn.execute(
                """INSERT INTO profiles (phone, name, age, gender, education, location,
                   travel_distance_km, occupation, years_experience, language,
                   skill_gap_json, selected_option_json)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (req.phone, req.name, req.age, req.gender, req.education, req.location,
                 req.travel_distance_km, req.occupation, req.years_experience, req.language,
                 skill_gap_json, selected_json),
            )
        conn.commit()
        row = conn.execute("SELECT * FROM profiles WHERE phone=?", (req.phone,)).fetchone()
    return _row_to_profile(row)


def _row_to_profile(row) -> dict:
    return {
        "phone": row["phone"],
        "name": row["name"],
        "age": row["age"],
        "gender": row["gender"],
        "education": row["education"],
        "location": row["location"],
        "travel_distance_km": row["travel_distance_km"],
        "occupation": row["occupation"],
        "years_experience": row["years_experience"],
        "language": row["language"],
        "skill_gap": json.loads(row["skill_gap_json"]) if row["skill_gap_json"] else [],
        "selected_option": json.loads(row["selected_option_json"]) if row["selected_option_json"] else None,
        "updated_at": row["updated_at"],
    }
