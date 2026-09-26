import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import {
  useJourney, DEMO_PROFILES, EDUCATION_OPTIONS, LOCATION_OPTIONS, TRAVEL_OPTIONS,
} from "../context/JourneyContext.jsx";
import { useVoice } from "../hooks/useVoice.js";
import { api } from "../api/client.js";

const SAVED_NUMBER = "1800 891 5566";
const RING_SECONDS = 5;

const IVR_LANGUAGES = [
  { key: "1", label: "Hindi", prompt: "हिंदी के लिए 1 दबाएँ" },
  { key: "2", label: "English", prompt: "For English press 2" },
  { key: "3", label: "Gujarati", prompt: "ગુજરાતી માટે 3 દબાવો" },
];

const S = {
  DIALER: "dialer",
  CALLING: "calling",
  CALL_ENDED: "call_ended",
  INCOMING: "incoming",
  LANGUAGE: "language",
  FIRST_TIME: "first_time",
  NAME: "name",
  AGE: "age",
  GENDER: "gender",
  EDUCATION: "education",
  LOCATION: "location",
  TRAVEL: "travel",
  OCCUPATION_TEXT: "occupation_text",
  EXPERIENCE: "experience",
  READBACK: "readback",
  ELIGIBILITY: "eligibility",
  INELIGIBLE: "ineligible",
  MATCHING: "matching",
  MATCHED: "matched",
  SKILL_Q: "skill_q",
  SKILL_GAP: "skill_gap",
  RECOMMENDATIONS: "recommendations",
  CAREER_PATH: "career_path",
  QA: "qa",
  SELECT: "select",
  FINAL_CONFIRM: "final_confirm",
  CASE_CREATED: "case_created",
};

export default function CallSimulator() {
  const navigate = useNavigate();
  const { state, update, updateProfile, setStage, reset, addTranscript } = useJourney();
  const [stage, setStageLocal] = useState(S.DIALER);
  const [dialed, setDialed] = useState(SAVED_NUMBER);
  const [ring, setRing] = useState(RING_SECONDS);
  const [numBuf, setNumBuf] = useState("");
  const [textBuf, setTextBuf] = useState("");
  const [firstTime, setFirstTime] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [qaInput, setQaInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { listen, speak, listening, supported } = useVoice(state.language);
  const t1 = useRef(null);
  const t2 = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => () => { [t1, t2, ringRef].forEach((r) => { clearTimeout(r.current); clearInterval(r.current); }); }, []);

  const say = (text) => { addTranscript("system", text); speak(text); };
  const goto = (s) => { setError(""); setStageLocal(s); };

  // ---------- call handling ----------
  const pressDial = (d) => setDialed((n) => (n.length >= 16 ? n : n + d));
  const placeCall = () => {
    goto(S.CALLING);
    setRing(RING_SECONDS);
    ringRef.current = setInterval(() => setRing((s) => (s <= 1 ? 0 : s - 1)), 1000);
    t1.current = setTimeout(() => {
      clearInterval(ringRef.current);
      goto(S.CALL_ENDED);
      t2.current = setTimeout(() => goto(S.INCOMING), 1800);
    }, RING_SECONDS * 1000);
  };
  const answer = () => { addTranscript("system", "Call connected."); goto(S.LANGUAGE); };

  // ---------- language + first-time ----------
  const selectLanguage = async (lang) => {
    update({ language: lang });
    say(`Namaste! SkillCall mein aapka swagat hai. Bhasha: ${lang}.`);
    const phone = state.profile.phone || dialed.replace(/\s/g, "");
    updateProfile({ phone });
    try {
      const p = await api.getProfile(phone);
      setFirstTime(!p.exists);
    } catch { setFirstTime(true); }
    goto(S.FIRST_TIME);
  };

  const continueFromFirstTime = () => {
    setStage("profile_collected", false);
    say(firstTime
      ? "Yeh aapka pehli baar hai. Hum aapki jaankari lekar sahi kaam dhundhenge."
      : "Aapka profile pehle se hai. Hum use aage badha rahe hain.");
    goto(S.NAME);
  };

  // ---------- numeric helpers ----------
  const numPress = (d) => setNumBuf((n) => (n.length >= 3 ? n : n + d));
  const numBack = () => setNumBuf((n) => n.slice(0, -1));

  const afterField = (nextStage) => {
    if (correcting) { setCorrecting(false); goto(S.READBACK); }
    else goto(nextStage);
  };

  const commitName = () => {
    if (!textBuf.trim()) { setError("Please enter a name."); return; }
    updateProfile({ name: textBuf.trim() });
    addTranscript("user", textBuf.trim());
    setTextBuf("");
    afterField(S.AGE);
  };
  const commitAge = () => {
    if (!numBuf) { setError("Enter age using keypad."); return; }
    updateProfile({ age: numBuf });
    addTranscript("user", `Age: ${numBuf}`);
    setNumBuf("");
    afterField(S.GENDER);
  };
  const commitGender = (g) => { updateProfile({ gender: g }); addTranscript("user", g); afterField(S.EDUCATION); };
  const commitEducation = (label) => { updateProfile({ education: label }); addTranscript("user", label); afterField(S.LOCATION); };
  const commitLocation = (label) => { updateProfile({ location_block: label }); addTranscript("user", label); afterField(S.TRAVEL); };
  const commitTravel = (opt) => { updateProfile({ travel_distance_ok_km: opt.value }); addTranscript("user", `Travel: ${opt.label}`); afterField(S.OCCUPATION_TEXT); };

  const handleMic = () => listen({ onResult: (txt) => { setTextBuf(txt); addTranscript("user", txt); } });

  const commitOccupationText = () => {
    if (!textBuf.trim()) { setError("Describe your work (speak or type)."); return; }
    update({ spokenSkillsText: textBuf.trim() });
    addTranscript("user", textBuf.trim());
    afterField(S.EXPERIENCE);
  };
  const commitExperience = () => {
    const yrs = Number(numBuf || 0);
    update({ yearsExperience: yrs });
    addTranscript("user", `Experience: ${yrs} years`);
    setNumBuf("");
    setStage("profile_collected", true);
    goto(S.READBACK);
  };

  // ---------- readback / correction ----------
  const startCorrection = (field) => {
    setCorrecting(true);
    goto(field);
  };

  const confirmReadback = async () => {
    setBusy(true);
    try {
      const el = await api.eligibility(Number(state.profile.age), state.profile.education, state.yearsExperience);
      update({ eligibility: el });
      setStage("eligibility_checked", true);
      goto(S.ELIGIBILITY);
    } catch { setError("Server not reachable."); }
    setBusy(false);
  };

  // ---------- eligibility -> matching ----------
  const afterEligibility = async () => {
    if (!state.eligibility?.eligible) { goto(S.INELIGIBLE); return; }
    say("Ab bataiye — aap kaam kya karte hain? Aapke shabdon mein.");
    setBusy(true);
    try {
      const result = await api.matchOccupation(state.spokenSkillsText);
      if (!result.matched) { setError(result.message); setBusy(false); goto(S.OCCUPATION_TEXT); return; }
      update({ occupationMatch: result });
      setStage("occupation_matched", true);
      say(`AI ne pehchaana: ${result.occupation}.`);
      goto(S.MATCHED);
    } catch { setError("Server not reachable."); }
    setBusy(false);
  };

  const loadQuestions = async () => {
    const res = await api.skillQuestions(state.occupationMatch.occupation);
    setQuestions(res.questions);
    setQIndex(0);
    goto(S.SKILL_Q);
  };

  const answerQuestion = (value) => {
    const skill = questions[qIndex].skill;
    const answers = { ...state.skillAnswers, [skill]: value };
    update({ skillAnswers: answers });
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
    } else {
      buildGap(answers);
    }
  };

  const buildGap = async (answers) => {
    setBusy(true);
    try {
      const res = await api.skillGap(state.occupationMatch.occupation, state.yearsExperience, answers);
      update({ gap: res.gap });
      setStage("skills_collected", true);
      setStage("gap_calculated", true);
      goto(S.SKILL_GAP);
    } catch { setError("Server not reachable."); }
    setBusy(false);
  };

  const loadRecommendations = async () => {
    setBusy(true);
    try {
      const res = await api.recommendations(state.occupationMatch.occupation, state.profile.location_block, state.yearsExperience, state.gap);
      update({ options: res.options });
      setStage("options_generated", true);
      const cp = await api.careerPath(state.occupationMatch.occupation);
      update({ careerPath: cp.path });
      goto(S.RECOMMENDATIONS);
    } catch { setError("Server not reachable."); }
    setBusy(false);
  };

  const selectOption = (opt) => update({ selectedOption: opt });

  const runSatya = async () => {
    if (!state.selectedOption) { setError("Select an option first."); return; }
    setBusy(true);
    try {
      const res = await api.satyaVerify(state.selectedOption);
      update({ satya: res });
      setStage("satya_verified", res.all_verified);
      goto(S.FINAL_CONFIRM);
    } catch { setError("Server not reachable."); }
    setBusy(false);
  };

  const askQuestion = async () => {
    if (!qaInput.trim()) return;
    const q = qaInput.trim();
    setQaInput("");
    addTranscript("user", q);
    try {
      const res = await api.ask(q, {
        occupation: state.occupationMatch?.occupation,
        selected_option: state.selectedOption,
        language: state.language,
      });
      addTranscript("system", res.answer);
      speak(res.answer);
      update({ qaHistory: [...state.qaHistory, { q, ...res }] });
    } catch { setError("Server not reachable."); }
  };

  const createCase = async () => {
    setBusy(true);
    try {
      // persist profile keyed by phone
      await api.upsertProfile({
        phone: state.profile.phone,
        name: state.profile.name, age: Number(state.profile.age),
        gender: state.profile.gender, education: state.profile.education,
        location: state.profile.location_block, travel_distance_km: Number(state.profile.travel_distance_ok_km),
        occupation: state.occupationMatch.occupation, years_experience: state.yearsExperience,
        language: state.language, skill_gap: state.gap, selected_option: state.selectedOption,
      });
      const res = await api.createCase({
        name: state.profile.name || "Demo Caller", age: Number(state.profile.age) || 0,
        gender: state.profile.gender, education: state.profile.education,
        location: state.profile.location_block, phone: state.profile.phone,
        language: state.language, occupation: state.occupationMatch.occupation,
        years_experience: state.yearsExperience, skill_gap: state.gap,
        selected_option: state.selectedOption, career_path: state.careerPath,
        satya_checks: state.satya, eligibility: state.eligibility,
      });
      update({ caseId: res.case_id, csc: res.csc });
      setStage("case_created", true);
      goto(S.CASE_CREATED);
    } catch { setError("Could not create case."); }
    setBusy(false);
  };

  // ---------- demo controls ----------
  const resetDemo = () => { reset(); setStageLocal(S.DIALER); setDialed(SAVED_NUMBER); setNumBuf(""); setTextBuf(""); setQuestions([]); setQIndex(0); };
  const autoFill = (key) => {
    const d = DEMO_PROFILES[key];
    reset();
    update({
      language: "Hindi",
      profile: {
        name: d.name, age: d.age, gender: d.gender, education: d.education,
        location_block: d.location_block, phone: d.phone, travel_distance_ok_km: d.travel_distance_ok_km,
      },
      spokenSkillsText: d.spokenSkillsText, yearsExperience: d.yearsExperience, skillAnswers: d.skillAnswers,
    });
    setFirstTime(true);
    setStage("profile_collected", true);
    setStageLocal(S.READBACK);
  };
  const skipVoice = () => {
    if (stage === S.OCCUPATION_TEXT) setTextBuf(state.spokenSkillsText || DEMO_PROFILES.ramesh.spokenSkillsText);
    if (stage === S.NAME) setTextBuf(state.profile.name || "Demo Caller");
  };

  // ---------- render helpers ----------
  const phoneNumber = state.profile.phone || dialed.replace(/\s/g, "");

  return (
    <div className="app-shell wide">
      <TopBar title="SkillCall — Call Simulator" />
      <DemoControls
        onReset={resetDemo}
        onMissed={() => { resetDemo(); setTimeout(placeCall, 50); }}
        onAnswer={() => stage === S.INCOMING && answer()}
        onFillRamesh={() => autoFill("ramesh")}
        onFillSunita={() => autoFill("sunita")}
        onSkipVoice={skipVoice}
      />
      <div className="sim-layout">
        <LiveProfilePanel state={state} />

        <div className="sim-center">
          <div className="phone-mock">
            {stage === S.DIALER && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                <p className="muted center" style={{ color: "#c8d6ce" }}>Give SkillCall a missed call.</p>
                <div className="center" style={{ fontSize: "1.5rem", letterSpacing: 2, color: "white" }}>{dialed}</div>
                <div className="keypad">
                  {["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) => (
                    <button key={d} type="button" onClick={() => pressDial(d)}>{d}</button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
                  <button type="button" className="btn btn-outline btn-sm" style={{ borderColor: "rgba(255,255,255,0.4)", color: "white" }} onClick={() => setDialed((n) => n.slice(0, -1))}>⌫</button>
                  <button type="button" className="mic-btn" style={{ width: 60, height: 60, fontSize: "1.3rem", background: "#1a7f5a" }} onClick={placeCall}>📞</button>
                </div>
              </div>
            )}

            {stage === S.CALLING && (
              <div className="center" style={{ margin: "auto" }}>
                <div style={{ fontSize: "2.4rem" }}>📞</div>
                <h2>Calling {dialed}...</h2>
                <p className="muted" style={{ color: "#c8d6ce" }}>Ringing... {ring}s</p>
              </div>
            )}
            {stage === S.CALL_ENDED && (
              <div className="center" style={{ margin: "auto" }}>
                <div style={{ fontSize: "2.4rem" }}>📵</div>
                <h2>Call Ended</h2>
                <p className="muted" style={{ color: "#c8d6ce" }}>No answer — SkillCall will call you back...</p>
              </div>
            )}
            {stage === S.INCOMING && (
              <div className="center" style={{ margin: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="mic-btn listening" style={{ fontSize: "2rem" }}>☎️</div>
                <h2>Incoming Call</h2>
                <p className="muted" style={{ color: "#c8d6ce" }}>SkillCall Assistant · {SAVED_NUMBER}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
                  <button onClick={resetDemo} style={roundBtn("var(--color-danger)")}>✕</button>
                  <button onClick={answer} style={roundBtn("var(--color-primary)")}>✓</button>
                </div>
              </div>
            )}

            {stage === S.LANGUAGE && (
              <div>
                <h3 style={{ color: "white" }}>भाषा चुनें / Choose language</h3>
                <p className="muted" style={{ color: "#c8d6ce", marginTop: 6, fontSize: "0.8rem" }}>{IVR_LANGUAGES.map((l) => l.prompt).join(" · ")}</p>
                <div className="keypad" style={{ marginTop: 14, maxWidth: 260 }}>
                  {IVR_LANGUAGES.map((l) => (
                    <button key={l.key} type="button" onClick={() => selectLanguage(l.label)} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 0" }}>
                      <span style={{ fontSize: "1.3rem", fontWeight: 700 }}>{l.key}</span>
                      <span style={{ fontSize: "0.7rem" }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {stage === S.FIRST_TIME && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <p style={{ color: "white" }}>
                    {firstTime
                      ? "This is your first time using SkillCall. No previous information is recorded."
                      : "Welcome back — we found your previous profile."}
                  </p>
                  <p className="muted" style={{ color: "#c8d6ce", marginTop: 8 }}>
                    SkillCall will ask about your education, experience, skills and goals to find suitable livelihood options. To enquire about your career path, press 1.
                  </p>
                  <div className="grid-2" style={{ marginTop: 10 }}>
                    <button className="btn btn-accent btn-sm" onClick={continueFromFirstTime}>1 · Continue</button>
                    <button className="btn btn-outline btn-sm" style={outlineLight} onClick={resetDemo}>2 · Exit</button>
                  </div>
                </div>
              </ConvoFrame>
            )}

            {stage === S.NAME && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="What is your name? (speak or type)">
                  <button className={`mic-btn ${listening ? "listening" : ""}`} style={{ width: 60, height: 60, fontSize: "1.3rem", alignSelf: "center" }} onClick={handleMic} type="button">🎤</button>
                  <input value={textBuf} onChange={(e) => setTextBuf(e.target.value)} placeholder="Name" />
                  {error && <p style={errStyle}>{error}</p>}
                  <button className="btn btn-accent btn-block btn-sm" onClick={commitName}>Continue</button>
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.AGE && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="What is your age? (enter using keypad)">
                  <NumPad value={numBuf} onPress={numPress} onBack={numBack} onConfirm={commitAge} />
                  {error && <p style={errStyle}>{error}</p>}
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.GENDER && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="Gender? Press 1 Male · 2 Female · 3 Other">
                  <MenuButtons items={[{ key: "1", label: "Male" }, { key: "2", label: "Female" }, { key: "3", label: "Other" }]} onPick={(i) => commitGender(i.label)} />
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.EDUCATION && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="Education level? Press the number.">
                  <MenuButtons items={EDUCATION_OPTIONS} onPick={(i) => commitEducation(i.label)} />
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.LOCATION && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="Your location / block?">
                  <MenuButtons items={LOCATION_OPTIONS} onPick={(i) => commitLocation(i.label)} />
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.TRAVEL && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="How far can you travel for training/work?">
                  <MenuButtons items={TRAVEL_OPTIONS} onPick={(i) => commitTravel(i)} />
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.OCCUPATION_TEXT && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="What work do you currently do? (speak or type)">
                  <button className={`mic-btn ${listening ? "listening" : ""}`} style={{ width: 60, height: 60, fontSize: "1.3rem", alignSelf: "center" }} onClick={handleMic} type="button">🎤</button>
                  <p className="muted center" style={{ color: "#c8d6ce", fontSize: "0.75rem" }}>{supported ? "Tap mic or type" : "Voice unsupported — type"}</p>
                  <textarea rows={2} value={textBuf} onChange={(e) => setTextBuf(e.target.value)} placeholder='e.g. "Main 5 saal se bike thik karta hoon"' />
                  {error && <p style={errStyle}>{error}</p>}
                  <button className="btn btn-accent btn-block btn-sm" onClick={commitOccupationText}>Continue</button>
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.EXPERIENCE && (
              <ConvoFrame transcript={state.transcript}>
                <PromptCard text="How many years of experience? (keypad)">
                  <NumPad value={numBuf} onPress={numPress} onBack={numBack} onConfirm={commitExperience} />
                </PromptCard>
              </ConvoFrame>
            )}

            {stage === S.READBACK && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>Please confirm</h3>
                  <ul style={{ color: "#dfeae4", paddingLeft: 16, margin: "8px 0", fontSize: "0.85rem" }}>
                    <li>Name: {state.profile.name || "—"}</li>
                    <li>Age: {state.profile.age || "—"}</li>
                    <li>Education: {state.profile.education || "—"}</li>
                    <li>Location: {state.profile.location_block || "—"}</li>
                    <li>Work: {state.spokenSkillsText || "—"}</li>
                    <li>Experience: {state.yearsExperience} years</li>
                  </ul>
                  <div className="grid-2">
                    <button className="btn btn-accent btn-sm" disabled={busy} onClick={confirmReadback}>1 · Confirm</button>
                    <button className="btn btn-outline btn-sm" style={outlineLight} onClick={() => goto(S.CORRECT || "correct_menu")}>2 · Correct</button>
                  </div>
                  <CorrectionMenu onEdit={startCorrection} S={S} />
                </div>
              </ConvoFrame>
            )}

            {stage === S.ELIGIBILITY && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>Eligibility Check (demo)</h3>
                  <p style={{ color: state.eligibility?.eligible ? "#8ce0b6" : "#ffb4a8", marginTop: 8 }}>
                    {state.eligibility?.eligible ? "✓ Eligible" : "✕ Not eligible"}
                  </p>
                  {state.eligibility?.reasons?.map((r, i) => <p key={i} className="muted" style={{ color: "#c8d6ce", fontSize: "0.8rem" }}>{r}</p>)}
                  <p className="muted" style={{ color: "#8fa199", fontSize: "0.7rem", marginTop: 6 }}>{state.eligibility?.disclaimer}</p>
                  <button className="btn btn-accent btn-block btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={afterEligibility}>Continue</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.INELIGIBLE && (
              <div className="center" style={{ margin: "auto" }}>
                <div style={{ fontSize: "2rem" }}>🙏</div>
                <h3 style={{ color: "white" }}>Not eligible (demo)</h3>
                <p className="muted" style={{ color: "#c8d6ce" }}>{state.eligibility?.reasons?.join(" ")}</p>
                <button className="btn btn-outline btn-sm" style={{ ...outlineLight, marginTop: 12 }} onClick={resetDemo}>End Call</button>
              </div>
            )}

            {stage === S.MATCHED && state.occupationMatch && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <p style={{ color: "white" }}>Matched: <strong>{state.occupationMatch.occupation}</strong></p>
                  <p className="muted" style={{ color: "#c8d6ce" }}>NCO {state.occupationMatch.nco_code} · {Math.round(state.occupationMatch.match_confidence * 100)}% confidence</p>
                  <span className={`tag ${/demo/i.test(state.occupationMatch.engine || "") ? "tag-demo" : "tag-has"}`} style={{ marginTop: 4 }}>via {state.occupationMatch.engine || "rule engine"}</span>
                  <button className="btn btn-accent btn-block btn-sm" style={{ marginTop: 10 }} onClick={loadQuestions}>Start Skill Questions →</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.SKILL_Q && questions[qIndex] && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <p className="muted" style={{ color: "#c8d6ce" }}>Question {qIndex + 1} / {questions.length}</p>
                  <h3 style={{ color: "white", marginTop: 4 }}>{questions[qIndex].skill}?</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    <button className="btn btn-accent btn-sm" onClick={() => answerQuestion("confident")}>1 · Yes, confidently</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => answerQuestion("partial")}>3 · Some experience</button>
                    <button className="btn btn-outline btn-sm" style={outlineLight} onClick={() => answerQuestion("none")}>2 · No</button>
                  </div>
                </div>
              </ConvoFrame>
            )}

            {stage === S.SKILL_GAP && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>Skill Profile</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {state.gap.map((g) => (
                      <div key={g.skill} style={{ display: "flex", justifyContent: "space-between", color: "#dfeae4", fontSize: "0.82rem" }}>
                        <span>{g.skill}</span>
                        <span className={`tag tag-${g.status.toLowerCase()}`}>{g.status}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-accent btn-block btn-sm" style={{ marginTop: 10 }} disabled={busy} onClick={loadRecommendations}>See Options →</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.RECOMMENDATIONS && (
              <ConvoFrame transcript={state.transcript}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {state.options.map((opt, i) => (
                    <div key={opt.course_id} className="card" style={{ ...convoCard, borderColor: state.selectedOption?.course_id === opt.course_id ? "var(--color-accent)" : "transparent" }}>
                      <p style={{ color: "white", fontSize: "0.9rem" }}><strong>{i + 1}. {opt.title}</strong></p>
                      <p className="muted" style={{ color: "#c8d6ce", fontSize: "0.75rem" }}>{opt.type} · {opt.centre} · {opt.distance_km} km · {opt.duration}</p>
                      <button className="btn btn-sm" style={{ marginTop: 6, background: state.selectedOption?.course_id === opt.course_id ? "var(--color-accent)" : "rgba(255,255,255,0.12)", color: "white" }} onClick={() => selectOption(opt)}>
                        {state.selectedOption?.course_id === opt.course_id ? "Selected ✓" : "Select"}
                      </button>
                    </div>
                  ))}
                  <div className="grid-2">
                    <button className="btn btn-outline btn-sm" style={outlineLight} onClick={() => goto(S.CAREER_PATH)}>Career Path</button>
                    <button className="btn btn-outline btn-sm" style={outlineLight} onClick={() => goto(S.QA)}>Ask a Question</button>
                  </div>
                  <button className="btn btn-accent btn-block btn-sm" disabled={!state.selectedOption || busy} onClick={runSatya}>Verify with SATYA →</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.CAREER_PATH && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>Career Path</h3>
                  <div style={{ marginTop: 8 }}>
                    {state.careerPath.map((s, i) => (
                      <p key={s.step_order} style={{ color: "#dfeae4", fontSize: "0.82rem" }}>{i > 0 ? "↓ " : ""}<strong>{s.step}</strong></p>
                    ))}
                  </div>
                  <button className="btn btn-accent btn-block btn-sm" style={{ marginTop: 10 }} onClick={() => goto(S.RECOMMENDATIONS)}>Back to Options</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.QA && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>Ask SkillCall</h3>
                  <p className="muted" style={{ color: "#c8d6ce", fontSize: "0.75rem" }}>Answers are SATYA-verified against the database.</p>
                  <textarea rows={2} value={qaInput} onChange={(e) => setQaInput(e.target.value)} placeholder="e.g. How long is the course?" style={{ marginTop: 8 }} />
                  <button className="btn btn-accent btn-block btn-sm" style={{ marginTop: 8 }} onClick={askQuestion}>Ask</button>
                  {state.qaHistory.slice(-2).map((qa, i) => (
                    <div key={i} style={{ marginTop: 8, fontSize: "0.78rem" }}>
                      <p style={{ color: "#c8d6ce" }}>Q: {qa.q}</p>
                      <p style={{ color: "white" }}>A: {qa.answer}</p>
                      <span className={`tag ${qa.satya.verified ? "tag-has" : "tag-missing"}`}>SATYA: {qa.satya.status}</span>
                      {qa.engine && <span className={`tag ${/demo/i.test(qa.engine) ? "tag-demo" : "tag-has"}`} style={{ marginLeft: 6 }}>{qa.engine}</span>}
                    </div>
                  ))}
                  <button className="btn btn-outline btn-block btn-sm" style={{ ...outlineLight, marginTop: 8 }} onClick={() => goto(S.RECOMMENDATIONS)}>Back to Options</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.FINAL_CONFIRM && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>SATYA Verified</h3>
                  {state.satya?.checks?.map((c, i) => (
                    <p key={i} style={{ color: "#dfeae4", fontSize: "0.78rem" }}>{c.verified ? "✅" : "⚠️"} {c.fact}</p>
                  ))}
                  <p style={{ color: state.satya?.all_verified ? "#8ce0b6" : "#ffb4a8", marginTop: 6, fontSize: "0.82rem" }}>
                    {state.satya?.all_verified ? "All facts verified. Press 1 to confirm and create your case." : "Some facts unverified."}
                  </p>
                  <button className="btn btn-accent btn-block btn-sm" style={{ marginTop: 8 }} disabled={busy || !state.satya?.all_verified} onClick={createCase}>1 · Confirm & Create Case</button>
                </div>
              </ConvoFrame>
            )}

            {stage === S.CASE_CREATED && (
              <div className="center" style={{ margin: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: "2rem" }}>✅</div>
                <h3 style={{ color: "white" }}>Case Created</h3>
                <p style={{ color: "#8ce0b6", fontSize: "1.4rem", fontWeight: 700 }}>{state.caseId}</p>
                <p className="muted" style={{ color: "#c8d6ce" }}>Nearest CSC: {state.csc}</p>
                <button className="btn btn-accent btn-sm" onClick={() => navigate(`/case`)}>View Case Details →</button>
                <button className="btn btn-outline btn-sm" style={outlineLight} onClick={() => navigate("/documents")}>Upload Documents</button>
                <button className="btn btn-outline btn-sm" style={outlineLight} onClick={() => navigate("/officer")}>View as Officer</button>
              </div>
            )}

            {stage === "correct_menu" && (
              <ConvoFrame transcript={state.transcript}>
                <div className="card" style={convoCard}>
                  <h3 style={{ color: "white" }}>What would you like to correct?</h3>
                  <CorrectionMenu onEdit={startCorrection} S={S} expanded />
                  <button className="btn btn-outline btn-block btn-sm" style={{ ...outlineLight, marginTop: 8 }} onClick={() => goto(S.READBACK)}>Back</button>
                </div>
              </ConvoFrame>
            )}
          </div>
        </div>

        <StagePanel stages={state.stages} />
      </div>
    </div>
  );
}

// ---------- sub-components ----------
const convoCard = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" };
const outlineLight = { borderColor: "rgba(255,255,255,0.4)", color: "white" };
const errStyle = { color: "#ffb4a8", fontSize: "0.8rem" };
const roundBtn = (bg) => ({ width: 56, height: 56, borderRadius: "50%", border: "none", background: bg, color: "white", fontSize: "1.3rem", cursor: "pointer" });

function ConvoFrame({ transcript, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 120, overflowY: "auto" }}>
        {transcript.slice(-4).map((t, i) => (
          <div key={i} className={`transcript-bubble ${t.speaker}`} style={{ fontSize: "0.8rem" }}>{t.text}</div>
        ))}
      </div>
      {children}
    </div>
  );
}

function PromptCard({ text, children }) {
  return (
    <div className="card" style={{ ...convoCard, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: "white" }}>{text}</p>
      {children}
    </div>
  );
}

function NumPad({ value, onPress, onBack, onConfirm }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="center" style={{ fontSize: "1.6rem", color: "white", minHeight: 32 }}>{value || "—"}</div>
      <div className="keypad">
        {["1","2","3","4","5","6","7","8","9"].map((d) => <button key={d} type="button" onClick={() => onPress(d)}>{d}</button>)}
        <button type="button" onClick={onBack}>⌫</button>
        <button type="button" onClick={() => onPress("0")}>0</button>
        <button type="button" onClick={onConfirm} style={{ background: "var(--color-accent)" }}>✓</button>
      </div>
    </div>
  );
}

function MenuButtons({ items, onPick }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((i) => (
        <button key={i.key} className="btn btn-sm" style={{ background: "rgba(255,255,255,0.12)", color: "white", justifyContent: "flex-start" }} onClick={() => onPick(i)}>
          <strong style={{ marginRight: 8 }}>{i.key}</strong> {i.label}
        </button>
      ))}
    </div>
  );
}

function CorrectionMenu({ onEdit, S, expanded }) {
  if (!expanded) return null;
  const fields = [
    { label: "Name", stage: S.NAME },
    { label: "Age", stage: S.AGE },
    { label: "Education", stage: S.EDUCATION },
    { label: "Location", stage: S.LOCATION },
    { label: "Work", stage: S.OCCUPATION_TEXT },
    { label: "Experience", stage: S.EXPERIENCE },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {fields.map((f) => (
        <button key={f.label} className="btn btn-sm" style={{ background: "rgba(255,255,255,0.12)", color: "white" }} onClick={() => onEdit(f.stage)}>{f.label}</button>
      ))}
    </div>
  );
}

function LiveProfilePanel({ state }) {
  const rows = [
    ["Name", state.profile.name],
    ["Age", state.profile.age],
    ["Gender", state.profile.gender],
    ["Education", state.profile.education],
    ["Location", state.profile.location_block],
    ["Travel", state.profile.travel_distance_ok_km ? `${state.profile.travel_distance_ok_km} km` : ""],
    ["Occupation", state.occupationMatch?.occupation],
    ["Experience", state.yearsExperience ? `${state.yearsExperience} yrs` : ""],
    ["Language", state.language],
  ];
  return (
    <div className="sim-side">
      <div className="card">
        <h3>Live Profile</h3>
        <p className="muted" style={{ fontSize: "0.72rem", marginBottom: 8 }}>What SkillCall has understood</p>
        <table className="profile-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}><td className="muted">{k}</td><td>{v || "—"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StagePanel({ stages }) {
  const items = [
    ["occupation_matched", "Occupation matched"],
    ["profile_collected", "Profile collected"],
    ["eligibility_checked", "Eligibility checked"],
    ["skills_collected", "Skills collected"],
    ["gap_calculated", "Skill gap calculated"],
    ["options_generated", "Options generated"],
    ["satya_verified", "SATYA verified"],
    ["case_created", "Case created"],
  ];
  return (
    <div className="sim-side">
      <div className="card">
        <h3>AI Processing</h3>
        <p className="muted" style={{ fontSize: "0.72rem", marginBottom: 8 }}>Pipeline status</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(([k, label]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
              <span>{stages[k] ? "✅" : "⬜"}</span>
              <span style={{ color: stages[k] ? "var(--color-ink)" : "var(--color-ink-muted)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoControls({ onReset, onMissed, onAnswer, onFillRamesh, onFillSunita, onSkipVoice }) {
  return (
    <div className="demo-controls">
      <span className="demo-label">DEMO</span>
      <button onClick={onReset}>Reset</button>
      <button onClick={onMissed}>Simulate Missed Call</button>
      <button onClick={onAnswer}>Answer</button>
      <button onClick={onFillRamesh}>Auto-fill Ramesh</button>
      <button onClick={onFillSunita}>Auto-fill Sunita</button>
      <button onClick={onSkipVoice}>Skip Voice</button>
    </div>
  );
}
