from fastapi import APIRouter
from pydantic import BaseModel
from .. import engine

router = APIRouter(prefix="/api", tags=["conversation"])


class MatchRequest(BaseModel):
    spoken_text: str


@router.post("/match-occupation")
def match_occupation(req: MatchRequest):
    match = engine.match_occupation(req.spoken_text)
    if not match:
        return {"matched": False, "message": "Could not confidently match an occupation. Please describe your work again."}
    return {"matched": True, **match}


@router.get("/skill-questions")
def skill_questions(occupation: str):
    return {"occupation": occupation, "questions": engine.get_skill_questions(occupation)}


class SkillGapRequest(BaseModel):
    occupation: str
    years_experience: int
    answers: dict[str, str]


@router.post("/skill-gap")
def skill_gap(req: SkillGapRequest):
    gap = engine.assess_skill_gap(req.occupation, req.years_experience, req.answers)
    return {"occupation": req.occupation, "gap": gap}


class RecommendRequest(BaseModel):
    occupation: str
    location_block: str
    years_experience: int
    gap: list[dict]


@router.post("/recommendations")
def recommendations(req: RecommendRequest):
    options = engine.recommend_options(req.occupation, req.location_block, req.gap, req.years_experience)
    return {"options": options}


@router.get("/career-path")
def career_path(occupation: str):
    return {"occupation": occupation, "path": engine.get_career_path(occupation)}


class SatyaRequest(BaseModel):
    option: dict


@router.post("/satya-verify")
def satya_verify(req: SatyaRequest):
    return engine.satya_verify(req.option)
