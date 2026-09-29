"""
SkillCall conversation logic.

The call goes:
  1. Greeting + language choice by keypad (1 = Hindi, 2 = English)
  2. Livelihood interview, one short question at a time
  3. Profile is extracted as structured JSON after every answer
  4. Summary + goodbye, then the call is ended

If ANTHROPIC_API_KEY is set, Claude runs the interview and extracts the
profile. Without it, a fixed question script runs so you can still demo.

Each function returns the text to SPEAK (or None). `session` is a dict
that lives for the whole call.
"""
import json
import os

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-5")
USING_CLAUDE = bool(os.getenv("ANTHROPIC_API_KEY"))

EMPTY_PROFILE = {
    "name": "",
    "location": "",
    "age": "",
    "education": "",
    "skills": [],
    "skill_sector": "",
    "experience_years": "",
    "work_goal": "",
    "can_travel": "",
    "notes": "",
}

TEXT = {
    "greeting": (
        "Namaste! SkillCall mein aapka swagat hai. "
        "Hindi ke liye 1 dabaiye. For English, press 2. "
        "Ya seedhe boliye."
    ),
    "repeat": {
        "hi": "Maaf kijiye, mujhe theek se sunai nahi diya. Kya aap dobara bol sakte hain?",
        "en": "Sorry, I could not hear that clearly. Could you please say it again?",
    },
    "error": {
        "hi": "Maaf kijiye, thodi dikkat aa gayi. Kripya dobara boliye.",
        "en": "Sorry, something went wrong. Please say that again.",
    },
}

# Used only when there is no Claude key: (profile field, Hindi, English)
SCRIPT = [
    ("name", "Aapka naam kya hai?", "What is your name?"),
    ("location", "Aap kis gaon ya zile se hain?", "Which village or district are you from?"),
    ("skills", "Aapko kaun sa kaam aata hai?", "What kind of work do you know?"),
    ("experience_years", "Yeh kaam aap kitne saal se kar rahe hain?",
     "For how many years have you done this work?"),
    ("education", "Aapne kahan tak padhai ki hai?", "How far have you studied?"),
    ("work_goal", "Aap naukri chahte hain, apna kaam shuru karna chahte hain, ya training lena chahte hain?",
     "Do you want a job, to start your own work, or training?"),
    ("can_travel", "Kya aap kaam ke liye gaon se bahar ja sakte hain?",
     "Can you travel outside your village for work?"),
]

SYSTEM_PROMPT = """You are SkillCall, a warm, patient voice assistant on a PHONE CALL with a \
beneficiary from rural or semi-urban India. They may have little formal education and may \
be using a basic keypad phone. Your job is a short livelihood interview that builds their \
skill profile, so they can later be matched to NSQF-aligned training and local work.

Find out, one question at a time: name, village/district, approximate age, the work and \
skills they already have (including informal work like farming, tailoring, cooking, \
repairs, animal care), years of experience, education level, whether they want a job, \
self-employment, or training, and whether they can travel for work.

How to talk:
- Every reply is spoken aloud by text-to-speech. Keep it to one or two short sentences in \
simple everyday words. No lists, bullet points, symbols, emojis, or abbreviations.
- Ask exactly one question per turn. Briefly acknowledge what they said first.
- The caller's words come from speech recognition and may contain errors. If an answer is \
unclear or does not fit, gently ask again.
- Speak in the caller's language: {language}. For Hindi, write in Devanagari script using \
common spoken Hindi, not formal or Sanskritised words.
- Latency-sensitive; begin your visible answer immediately.

After every turn, return the full profile with everything learned so far (empty string or \
empty list when unknown). Put skills as short plain English labels, and set skill_sector to \
the closest sector (for example Agriculture, Apparel, Construction, Food Processing, \
Beauty and Wellness, Automotive, Electronics, Handicrafts, Retail, Logistics, Healthcare).

When you have the key details, give a one-sentence summary, tell them SkillCall will share \
suitable training and work options, thank them, and set done to true."""

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "reply": {"type": "string"},
        "done": {"type": "boolean"},
        "profile": {
            "type": "object",
            "properties": {
                k: ({"type": "array", "items": {"type": "string"}}
                    if isinstance(v, list) else {"type": "string"})
                for k, v in EMPTY_PROFILE.items()
            },
            "required": list(EMPTY_PROFILE),
            "additionalProperties": False,
        },
    },
    "required": ["reply", "done", "profile"],
    "additionalProperties": False,
}

_client = None


def _claude():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic()
    return _client


# -------------------------
# CALL START
# -------------------------
def on_start(session):
    session["lang"] = "hi"
    session["lang_chosen"] = False
    session["profile"] = json.loads(json.dumps(EMPTY_PROFILE))
    session["messages"] = []   # Claude conversation history
    session["step"] = 0        # position in SCRIPT (fallback mode)
    session["last_question"] = TEXT["greeting"]
    return TEXT["greeting"]


# -------------------------
# KEYPAD
# -------------------------
def on_dtmf(digit, session):
    if not session["lang_chosen"] and digit in ("1", "2"):
        session["lang"] = "hi" if digit == "1" else "en"
        session["lang_chosen"] = True
        return _first_question(session)
    if digit in ("9", "*"):          # repeat last question
        return session["last_question"]
    return None


def _first_question(session):
    if USING_CLAUDE:
        return _ask_claude(session, "(The caller has chosen their language. Start the interview.)")
    return _script_question(session)


# -------------------------
# CALLER SPOKE (blocking - main.py runs it in a thread)
# -------------------------
def on_speech(text, session):
    if not text or len(text.strip()) < 2:
        return TEXT["repeat"][session["lang"]]

    if not session["lang_chosen"]:
        session["lang_chosen"] = True   # they just started talking: go on in Hindi
        if not USING_CLAUDE:
            return _script_question(session)

    if USING_CLAUDE:
        return _ask_claude(session, text)

    # Fallback script: store raw answer, ask next question
    field = SCRIPT[session["step"]][0]
    if field == "skills":
        session["profile"]["skills"].append(text)
    else:
        session["profile"][field] = text
    session["step"] += 1
    return _script_question(session)


def _script_question(session):
    lang = session["lang"]
    if session["step"] >= len(SCRIPT):
        session["end_call"] = True
        return ("Dhanyavaad! Aapki jaankari mil gayi hai. SkillCall jald hi aapko "
                "training aur kaam ke vikalp batayega. Namaste!"
                if lang == "hi" else
                "Thank you! We have your details. SkillCall will soon share "
                "training and work options with you. Goodbye!")
    _, hi, en = SCRIPT[session["step"]]
    question = hi if lang == "hi" else en
    session["last_question"] = question
    return question


def _ask_claude(session, caller_text):
    import anthropic

    language = "Hindi" if session["lang"] == "hi" else "Indian English"
    session["messages"].append({"role": "user", "content": caller_text})

    try:
        response = _claude().beta.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=4000,
            system=SYSTEM_PROMPT.format(language=language),
            messages=session["messages"],
            output_config={
                "effort": "low",   # phone call: speed matters more than depth
                "format": {"type": "json_schema", "schema": RESPONSE_SCHEMA},
            },
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.APIError as e:
        print("Claude error:", repr(e))
        session["messages"].pop()
        return TEXT["error"][session["lang"]]

    if response.stop_reason == "refusal":
        session["messages"].pop()
        return TEXT["error"][session["lang"]]

    raw = next((b.text for b in response.content if b.type == "text"), "{}")
    session["messages"].append({"role": "assistant", "content": raw})
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return TEXT["error"][session["lang"]]

    session["profile"] = result["profile"]
    session["last_question"] = result["reply"]
    if result["done"]:
        session["end_call"] = True
    return result["reply"]
