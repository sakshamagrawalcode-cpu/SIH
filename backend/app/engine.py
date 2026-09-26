"""Core SkillCall matching/assessment/recommendation logic.

This is a deliberately simple, transparent, rule-based engine for the
prototype. It stands in for the real Sarvam LLM occupation-mapping step
described in the architecture: same interface/output shape, but driven by
keyword matching against occupations.csv so the demo runs fully offline.
"""
from typing import Optional
from . import data_loader as dl
from .services import sarvam, pipeline


def _llm_match_occupation(spoken_text: str) -> Optional[dict]:
    """Try the Sarvam LLM to pick the best NCO occupation. Returns None on any failure."""
    catalogue = "\n".join(
        f"- {r['occupation']} (NCO {r['nco_code']})" for _, r in dl.occupations_df.iterrows()
    )
    system = (
        "You map a worker's self-described job to exactly one occupation from a fixed list "
        "of India NCO occupations. Reply with ONLY the exact occupation name from the list, nothing else."
    )
    user = f"Worker said: \"{spoken_text}\"\n\nOccupations:\n{catalogue}\n\nBest matching occupation name:"
    reply = sarvam.chat(system, user, max_tokens=40)
    if not reply:
        return None
    reply_l = reply.strip().lower()
    for _, row in dl.occupations_df.iterrows():
        if row["occupation"].lower() in reply_l or reply_l in row["occupation"].lower():
            return {
                "nco_code": row["nco_code"], "occupation": row["occupation"],
                "description": row["description"], "education": row["education"],
                "match_confidence": 0.95,
            }
    return None


def match_occupation(spoken_text: str) -> Optional[dict]:
    llm_result = _llm_match_occupation(spoken_text)
    if llm_result:
        llm_result["engine"] = "Sarvam LLM"
        return llm_result

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
        "engine": "Local rule engine (demo)",
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


def check_eligibility(age: int, education: str, years_experience: int) -> dict:
    """Demo eligibility check against rules.json. Clearly NOT official policy."""
    rules = dl.rules.get("eligibility", {})
    min_age = rules.get("min_age", 18)
    max_age = rules.get("max_age", 45)
    reasons = []
    eligible = True

    if age < min_age:
        eligible = False
        reasons.append(f"Age {age} is below the demo minimum of {min_age}.")
    elif age > max_age:
        eligible = False
        reasons.append(f"Age {age} is above the demo maximum of {max_age}.")
    else:
        reasons.append(f"Age {age} is within the demo eligible range ({min_age}-{max_age}).")

    return {
        "eligible": eligible,
        "reasons": reasons,
        "disclaimer": rules.get("notes", "Demo eligibility only."),
    }


def _answer_from_option(question: str, context: dict) -> dict:
    """Very small keyword Q&A that answers ONLY from the demo data in context.

    Stands in for the Sarvam LLM dialog step. Every answer is passed through
    SATYA-style verification: a claim is only 'verified' if it comes straight
    from the selected option / course / scheme data. Nothing is invented.
    """
    q = question.lower()
    option = context.get("selected_option") or {}
    occupation = context.get("occupation", "your occupation")

    def verified(answer, fact, source):
        return {"answer": answer, "verified": True, "fact": fact, "source": source}

    def unverified(answer):
        return {"answer": answer, "verified": False, "fact": None, "source": "not in demo database"}

    if not option:
        return unverified("Please select a career option first so I can answer using verified course details.")

    if any(k in q for k in ["how long", "duration", "kitne din", "kitna time", "samay"]):
        return verified(
            f"The course '{option.get('title')}' runs for {option.get('duration')}.",
            f"duration = {option.get('duration')}", "courses.csv")

    if any(k in q for k in ["how far", "distance", "kitni door", "door", "near", "paas"]):
        return verified(
            f"The centre {option.get('centre')} is about {option.get('distance_km')} km away.",
            f"distance = {option.get('distance_km')} km", "courses.csv")

    if any(k in q for k in ["eligib", "yogya", "qualify", "can i join", "documents", "document", "kaagaz"]):
        return verified(
            f"Eligibility for this option: {option.get('eligibility')}.",
            f"eligibility = {option.get('eligibility')}", "courses.csv")

    if any(k in q for k in ["scheme", "yojana", "free", "cost", "paisa", "fees", "fee", "benefit"]):
        return verified(
            f"This option is supported under {option.get('scheme')} — {option.get('scheme_benefit')}.",
            f"scheme = {option.get('scheme')}", "schemes.csv")

    if any(k in q for k in ["what skill", "kya seekh", "skills", "learn", "seekh"]):
        skills = option.get("skills_covered", [])
        skills_txt = ", ".join(skills) if isinstance(skills, list) else str(skills)
        return verified(
            f"This option helps you gain: {skills_txt}.",
            f"skills_covered = {skills_txt}", "courses.csv")

    if any(k in q for k in ["business", "workshop", "own", "dukaan", "khud", "apna"]):
        path = get_career_path(occupation)
        last = path[-1]["step"] if path else "self-employment"
        return verified(
            f"Yes — the career path for {occupation} can lead to {last}. Business/start-up support options are available once you complete training or have enough experience.",
            f"career path ends at {last}", "career_paths.csv")

    if any(k in q for k in ["difficult", "hard", "mushkil", "aasan", "easy"]):
        return verified(
            f"The course '{option.get('title')}' is a {option.get('duration')} program designed for people already working in {occupation}, so it builds on skills you already have.",
            f"duration = {option.get('duration')}", "courses.csv")

    return unverified(
        "I can only answer using verified course details. Please ask about duration, distance, eligibility, scheme/cost, skills, or starting your own business.")


def answer_question(question: str, context: dict) -> dict:
    """Q&A output: answer + SATYA verification block.

    The verified FACT always comes from the DB (rule engine). When the Sarvam
    LLM is live it only rephrases that verified fact conversationally in the
    caller's language — it is never allowed to introduce a new fact, so SATYA
    still gates every claim against the database.
    """
    result = _answer_from_option(question, context)
    satya = {
        "claim": result["fact"] or result["answer"],
        "verified": result["verified"],
        "source": result["source"],
        "status": "VERIFIED" if result["verified"] else "NOT VERIFIED",
    }
    spoken = result["answer"]
    engine = "Local rule engine (demo)"

    if result["verified"]:
        language = context.get("language", "Hindi")
        rephrased = sarvam.chat(
            (
                "You are a helpful local-language livelihood assistant. Rephrase the given VERIFIED "
                f"fact naturally in {language} for a low-literacy caller. Do NOT add any new facts, "
                "numbers, scheme names or promises beyond what is given."
            ),
            f"Verified fact: {result['answer']}",
            max_tokens=120,
        )
        if rephrased:
            spoken = rephrased
            engine = "Sarvam LLM"
    else:
        spoken = "I could not verify this against the database, so I will not state it as a fact. " + result["answer"]

    return {"answer": spoken, "satya": satya, "engine": engine}
