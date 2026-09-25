"""Core SkillCall matching/assessment/recommendation logic.

This is a deliberately simple, transparent, rule-based engine for the
prototype. It stands in for the real Sarvam LLM occupation-mapping step
described in the architecture: same interface/output shape, but driven by
keyword matching against occupations.csv so the demo runs fully offline.
"""
from typing import Optional
from . import data_loader as dl


def match_occupation(spoken_text: str) -> Optional[dict]:
    text = spoken_text.lower()
    best = None
    best_score = 0
    for _, row in dl.occupations_df.iterrows():
        keywords = str(row["keywords"]).lower().split("|")
        score = sum(1 for kw in keywords if kw.strip() and kw.strip() in text)
        if score > best_score:
            best_score = score
            best = row
    if best is None or best_score == 0:
        return None
    return {
        "nco_code": best["nco_code"],
        "occupation": best["occupation"],
        "description": best["description"],
        "education": best["education"],
        "match_confidence": min(0.98, 0.55 + 0.15 * best_score),
    }


def get_skill_questions(occupation: str) -> list[dict]:
    rows = dl.competencies_df[dl.competencies_df["occupation"] == occupation]
    return [
        {"skill": r["skill"], "level": r["level"], "importance": r["importance"]}
        for _, r in rows.iterrows()
    ]


def assess_skill_gap(occupation: str, years_experience: int, answers: dict[str, str]) -> list[dict]:
    """answers: {skill_name: 'confident' | 'partial' | 'none'}"""
    rows = dl.competencies_df[dl.competencies_df["occupation"] == occupation]
    result = []
    for _, r in rows.iterrows():
        skill = r["skill"]
        level = r["level"]
        self_report = answers.get(skill, "partial")

        if self_report == "confident":
            status = "HAS"
        elif self_report == "none":
            status = "MISSING"
        elif level == "advanced" and years_experience < 5:
            status = "MISSING"
        else:
            status = "NEEDS"

        result.append({"skill": skill, "level": level, "importance": r["importance"], "status": status})
    return result


def recommend_options(occupation: str, location_block: str, gap: list[dict], years_experience: int, max_options: int = 4) -> list[dict]:
    needed_skills = {g["skill"] for g in gap if g["status"] in ("NEEDS", "MISSING")}
    courses = dl.courses_df.copy()

    def covers(skills_covered: str) -> int:
        covered = set(skills_covered.split("|"))
        return len(covered & needed_skills)

    courses["overlap"] = courses["skills_covered"].apply(covers)
    courses["block_match"] = (courses["block"] == location_block).astype(int)

    relevant = courses[courses["overlap"] > 0]
    if relevant.empty:
        relevant = courses

    relevant = relevant.sort_values(by=["block_match", "overlap", "distance_km"], ascending=[False, False, True])

    options = []
    for _, r in relevant.head(max_options).iterrows():
        if r["type"] == "Business Support" and years_experience < 3:
            continue
        scheme_row = dl.schemes_df[dl.schemes_df["scheme"] == r["scheme"]]
        scheme_benefit = scheme_row.iloc[0]["benefit"] if not scheme_row.empty else "See scheme details"
        options.append({
            "course_id": r["course_id"],
            "title": r["course"],
            "type": r["type"],
            "centre": r["centre"],
            "location": r["location"],
            "distance_km": float(r["distance_km"]),
            "duration": r["duration"],
            "skills_covered": r["skills_covered"].split("|"),
            "eligibility": r["eligibility"],
            "scheme": r["scheme"],
            "scheme_benefit": scheme_benefit,
        })
    if len(options) < 1:
        # guarantee at least one option so the demo flow never dead-ends
        fallback = courses.sort_values("distance_km").iloc[0]
        options.append({
            "course_id": fallback["course_id"],
            "title": fallback["course"],
            "type": fallback["type"],
            "centre": fallback["centre"],
            "location": fallback["location"],
            "distance_km": float(fallback["distance_km"]),
            "duration": fallback["duration"],
            "skills_covered": fallback["skills_covered"].split("|"),
            "eligibility": fallback["eligibility"],
            "scheme": fallback["scheme"],
            "scheme_benefit": "See scheme details",
        })
    return options[:max_options]


def get_career_path(occupation: str) -> list[dict]:
    rows = dl.career_paths_df[dl.career_paths_df["occupation"] == occupation].sort_values("step_order")
    return [
        {"step_order": int(r["step_order"]), "step": r["step"], "description": r["description"]}
        for _, r in rows.iterrows()
    ]


def satya_verify(option: dict) -> list[dict]:
    """SATYA: verify facts against the demo DB before they can be 'spoken'.
    Never invents data - anything not found in the CSVs is flagged unverified.
    """
    checks = []

    course_row = dl.courses_df[dl.courses_df["course_id"] == option.get("course_id")]
    course_found = not course_row.empty
    checks.append({
        "fact": f"Course '{option.get('title')}' exists at {option.get('centre')}",
        "verified": course_found,
        "source": "courses.csv" if course_found else "not found in database",
    })

    scheme_row = dl.schemes_df[dl.schemes_df["scheme"] == option.get("scheme")]
    scheme_found = not scheme_row.empty
    checks.append({
        "fact": f"Scheme '{option.get('scheme')}' benefit: {option.get('scheme_benefit')}",
        "verified": scheme_found,
        "source": "schemes.csv" if scheme_found else "not found in database",
    })

    distance_ok = isinstance(option.get("distance_km"), (int, float)) and course_found and \
        float(course_row.iloc[0]["distance_km"]) == float(option.get("distance_km"))
    checks.append({
        "fact": f"Distance to centre: {option.get('distance_km')} km",
        "verified": bool(distance_ok),
        "source": "courses.csv" if distance_ok else "mismatch/not found",
    })

    eligibility_ok = course_found and course_row.iloc[0]["eligibility"] == option.get("eligibility")
    checks.append({
        "fact": f"Eligibility: {option.get('eligibility')}",
        "verified": bool(eligibility_ok),
        "source": "courses.csv" if eligibility_ok else "mismatch/not found",
    })

    all_verified = all(c["verified"] for c in checks)
    return {"checks": checks, "all_verified": all_verified}
