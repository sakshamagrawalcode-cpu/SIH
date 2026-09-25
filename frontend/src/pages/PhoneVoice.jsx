import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { useVoice } from "../hooks/useVoice.js";
import { api } from "../api/client.js";

const SAVED_NUMBER = "1800 891 5566";

const IVR_LANGUAGES = [
  { key: "1", label: "Hindi", prompt: "हिंदी के लिए 1 दबाएँ" },
  { key: "2", label: "English", prompt: "For English press 2" },
  { key: "3", label: "Gujarati", prompt: "ગુજરાતી માટે 3 દબાવો" },
];

const STAGES = {
  DIALER: "dialer",
  CALLING: "calling",
  CALL_ENDED: "call_ended",
  INCOMING_CALL: "incoming_call",
  LANGUAGE: "language",
  CONSENT: "consent",
  KEYPAD: "keypad",
  VOICE_SKILLS: "voice_skills",
  MATCHING: "matching",
  MATCHED: "matched",
};

const RING_SECONDS = 5;

export default function PhoneVoice() {
  const navigate = useNavigate();
  const { state, update, addTranscript } = useJourney();
  const [stage, setStage] = useState(STAGES.DIALER);
  const [dialedNumber, setDialedNumber] = useState(SAVED_NUMBER);
  const [ringSecondsLeft, setRingSecondsLeft] = useState(RING_SECONDS);
  const [typedSkills, setTypedSkills] = useState(state.spokenSkillsText || "");
  const [keypadValues, setKeypadValues] = useState({
    age: state.profile.age || "",
    education: state.profile.education || "1",
    location_block: state.profile.location_block || "",
    travel_distance_ok_km: state.profile.travel_distance_ok_km || "10",
  });
  const [error, setError] = useState("");
  const { listen, speak, listening, supported } = useVoice(state.language);
  const timerRef = useRef(null);
  const ringIntervalRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearInterval(ringIntervalRef.current);
  }, []);

  const pressDigit = (d) => {
    if (dialedNumber.replace(/\s/g, "").length >= 12) return;
    setDialedNumber((n) => (n + d).length > 14 ? n : n + d);
  };
  const backspace = () => setDialedNumber((n) => n.slice(0, -1));

  const placeCall = () => {
    setStage(STAGES.CALLING);
    setRingSecondsLeft(RING_SECONDS);
    ringIntervalRef.current = setInterval(() => {
      setRingSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(ringIntervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    timerRef.current = setTimeout(() => {
      setStage(STAGES.CALL_ENDED);
      timerRef.current = setTimeout(() => setStage(STAGES.INCOMING_CALL), 1800);
    }, RING_SECONDS * 1000);
  };

  const acceptIncomingCall = () => {
    addTranscript("system", "Call connected.");
    setStage(STAGES.LANGUAGE);
  };

  const declineIncomingCall = () => {
    setStage(STAGES.DIALER);
    setDialedNumber(SAVED_NUMBER);
  };

  const selectLanguage = (lang) => {
    update({ language: lang });
    addTranscript("system", `Namaste! SkillCall mein aapka swagat hai. Bhasha: ${lang}.`);
    setStage(STAGES.CONSENT);
  };

  const giveConsent = () => {
    update({ consent: true });
    addTranscript("user", "Consent given (Press 1)");
    addTranscript("system", "Dhanyavaad. Ab kuch jaankari keypad se lijiye.");
    setStage(STAGES.KEYPAD);
  };

  const submitKeypad = (e) => {
    e.preventDefault();
    if (!keypadValues.age || !keypadValues.location_block) {
      setError("Please fill age and location/block.");
      return;
    }
    setError("");
    update({
      profile: {
        ...state.profile,
        age: keypadValues.age,
        education: keypadValues.education,
        location_block: keypadValues.location_block,
        travel_distance_ok_km: keypadValues.travel_distance_ok_km,
      },
    });
    addTranscript("system", "Jaankari mil gayi. Ab bataiye — aap kaam kya karte hain?");
    setStage(STAGES.VOICE_SKILLS);
  };

  const handleMic = () => {
    listen({
      onResult: (text) => {
        setTypedSkills(text);
        addTranscript("user", text);
      },
    });
  };

  const runMatch = async () => {
    const text = typedSkills.trim();
    if (!text) {
      setError("Please describe your work (speak or type).");
      return;
    }
    setError("");
    update({ spokenSkillsText: text });
    setStage(STAGES.MATCHING);
    try {
      const result = await api.matchOccupation(text);
      if (!result.matched) {
        setError(result.message || "Could not match. Try describing your work differently.");
        setStage(STAGES.VOICE_SKILLS);
        return;
      }
      update({ occupationMatch: result, yearsExperience: state.yearsExperience || 3 });
      const line = `AI ne pehchaana: ${result.occupation}. Kya yeh sahi hai?`;
      addTranscript("system", line);
      speak(line);
      setStage(STAGES.MATCHED);
    } catch {
      setError("Server not reachable. Is the backend running?");
      setStage(STAGES.VOICE_SKILLS);
    }
  };

  return (
    <div className="app-shell">
      <TopBar title="SkillCall" />
      <div className="screen">
        <div className="phone-mock">
          {stage === STAGES.DIALER && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <p className="muted center" style={{ color: "#c8d6ce" }}>
                Give SkillCall a missed call — enter or confirm the number and press call.
              </p>
              <div className="center" style={{ fontSize: "1.6rem", letterSpacing: 2, color: "white" }}>
                {dialedNumber || " "}
              </div>
              <div className="keypad">
                {["1","2","3","4","5","6","7","8","9","*","0","#"].map((d) => (
                  <button key={d} type="button" onClick={() => pressDigit(d)}>{d}</button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ borderColor: "rgba(255,255,255,0.4)", color: "white" }}
                  onClick={backspace}
                >
                  ⌫ Delete
                </button>
                <button
                  type="button"
                  className="mic-btn"
                  style={{ width: 64, height: 64, fontSize: "1.4rem", background: "#1a7f5a" }}
                  onClick={placeCall}
                  title="Call"
                >
                  📞
                </button>
              </div>
            </div>
          )}

          {stage === STAGES.CALLING && (
            <div className="center" style={{ margin: "auto" }}>
              <div style={{ fontSize: "2.4rem" }}>📞</div>
              <h2>Calling {dialedNumber}...</h2>
              <p className="muted" style={{ color: "#c8d6ce" }}>Ringing... {ringSecondsLeft}s</p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 14, borderColor: "rgba(255,255,255,0.4)", color: "white" }} onClick={() => { clearInterval(ringIntervalRef.current); clearTimeout(timerRef.current); setStage(STAGES.DIALER); }}>
                Cancel
              </button>
            </div>
          )}

          {stage === STAGES.CALL_ENDED && (
            <div className="center" style={{ margin: "auto" }}>
              <div style={{ fontSize: "2.4rem" }}>📵</div>
              <h2>Call Ended</h2>
              <p className="muted" style={{ color: "#c8d6ce" }}>No answer — SkillCall will call you back shortly...</p>
            </div>
          )}

          {stage === STAGES.INCOMING_CALL && (
            <div className="center" style={{ margin: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: "2.4rem" }} className="mic-btn listening" >☎️</div>
              <h2>Incoming Call</h2>
              <p className="muted" style={{ color: "#c8d6ce" }}>SkillCall Assistant · {SAVED_NUMBER}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={declineIncomingCall}
                  style={{ width: 60, height: 60, borderRadius: "50%", border: "none", background: "var(--color-danger)", color: "white", fontSize: "1.4rem" }}
                  title="Decline"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={acceptIncomingCall}
                  style={{ width: 60, height: 60, borderRadius: "50%", border: "none", background: "var(--color-primary)", color: "white", fontSize: "1.4rem" }}
                  title="Accept"
                >
                  ✓
                </button>
              </div>
              <p className="muted" style={{ color: "#8fa199", fontSize: "0.8rem" }}>Tap ✓ to pick up</p>
            </div>
          )}

          {stage === STAGES.LANGUAGE && (
            <div>
              <h3 style={{ color: "white" }}>भाषा चुनें / Choose your language</h3>
              <p className="muted" style={{ color: "#c8d6ce", marginTop: 6 }}>
                {IVR_LANGUAGES.map((l) => l.prompt).join(" · ")}
              </p>
              <div className="keypad" style={{ marginTop: 16, maxWidth: 260 }}>
                {IVR_LANGUAGES.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => selectLanguage(l.label)}
                    style={{ display: "flex", flexDirection: "column", gap: 4, padding: "14px 0" }}
                  >
                    <span style={{ fontSize: "1.3rem", fontWeight: 700 }}>{l.key}</span>
                    <span style={{ fontSize: "0.7rem" }}>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === STAGES.CONSENT && (
            <div className="center" style={{ margin: "auto" }}>
              <h3 style={{ color: "white" }}>Consent</h3>
              <p className="muted" style={{ color: "#c8d6ce", marginTop: 10 }}>
                "Hum aapki jaankari sirf sahi kaam dhundhne ke liye istemal karenge.
                Kya aap aage badhna chahte hain? Press 1 for Yes."
              </p>
              <button className="btn btn-accent" style={{ marginTop: 16 }} onClick={giveConsent}>
                Press 1 — Yes, Continue
              </button>
            </div>
          )}

          {stage === STAGES.KEYPAD && (
            <form onSubmit={submitKeypad} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ color: "white" }}>Keypad Facts</h3>
              <div className="field">
                <label style={{ color: "#c8d6ce" }}>Age</label>
                <input
                  type="number"
                  value={keypadValues.age}
                  onChange={(e) => setKeypadValues((v) => ({ ...v, age: e.target.value }))}
                  placeholder="e.g. 28"
                />
              </div>
              <div className="field">
                <label style={{ color: "#c8d6ce" }}>Education</label>
                <select
                  value={keypadValues.education}
                  onChange={(e) => setKeypadValues((v) => ({ ...v, education: e.target.value }))}
                >
                  <option value="No formal education">No formal education (Press 1)</option>
                  <option value="Class 5">Up to Class 5 (Press 2)</option>
                  <option value="Class 8">Up to Class 8 (Press 3)</option>
                  <option value="Class 10">Up to Class 10 (Press 4)</option>
                  <option value="Class 12 or above">Class 12 or above (Press 5)</option>
                </select>
              </div>
              <div className="field">
                <label style={{ color: "#c8d6ce" }}>Location / Block</label>
                <select
                  value={keypadValues.location_block}
                  onChange={(e) => setKeypadValues((v) => ({ ...v, location_block: e.target.value }))}
                >
                  <option value="">Select block</option>
                  <option value="Rampur Block">Rampur Block (Press 1)</option>
                  <option value="Sultanpur Block">Sultanpur Block (Press 2)</option>
                  <option value="Bhairahatta Block">Bhairahatta Block (Press 3)</option>
                </select>
              </div>
              <div className="field">
                <label style={{ color: "#c8d6ce" }}>Max travel distance you can manage (km)</label>
                <input
                  type="number"
                  value={keypadValues.travel_distance_ok_km}
                  onChange={(e) => setKeypadValues((v) => ({ ...v, travel_distance_ok_km: e.target.value }))}
                />
              </div>
              {error && <p style={{ color: "#ffb4a8" }}>{error}</p>}
              <button className="btn btn-accent btn-block" type="submit">Continue</button>
            </form>
          )}

          {(stage === STAGES.VOICE_SKILLS || stage === STAGES.MATCHING || stage === STAGES.MATCHED) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <h3 style={{ color: "white" }}>Tell us about your work</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 160, overflowY: "auto" }}>
                {state.transcript.slice(-5).map((t, i) => (
                  <div key={i} className={`transcript-bubble ${t.speaker}`}>{t.text}</div>
                ))}
              </div>

              {stage === STAGES.VOICE_SKILLS && (
                <>
                  <button
                    className={`mic-btn ${listening ? "listening" : ""}`}
                    onClick={handleMic}
                    type="button"
                    title={supported ? "Tap to speak" : "Voice recognition not supported in this browser — type instead"}
                  >
                    🎤
                  </button>
                  <p className="muted center" style={{ color: "#c8d6ce" }}>
                    {supported ? "Tap mic and speak, or type below" : "Voice recognition unsupported here — type below"}
                  </p>
                  <textarea
                    rows={2}
                    placeholder='e.g. "Main 5 saal se bike thik karta hoon"'
                    value={typedSkills}
                    onChange={(e) => setTypedSkills(e.target.value)}
                  />
                  {error && <p style={{ color: "#ffb4a8" }}>{error}</p>}
                  <button className="btn btn-accent btn-block" onClick={runMatch} type="button">
                    Send to AI Matching
                  </button>
                </>
              )}

              {stage === STAGES.MATCHING && (
                <p className="muted center" style={{ color: "#c8d6ce" }}>Matching your skills to an occupation...</p>
              )}

              {stage === STAGES.MATCHED && state.occupationMatch && (
                <div className="card" style={{ background: "rgba(255,255,255,0.08)", border: "none" }}>
                  <p style={{ color: "white" }}>
                    <strong>{state.occupationMatch.occupation}</strong>
                  </p>
                  <p className="muted" style={{ color: "#c8d6ce" }}>NCO Code: {state.occupationMatch.nco_code}</p>
                  <p className="muted" style={{ color: "#c8d6ce" }}>
                    Match confidence: {Math.round(state.occupationMatch.match_confidence * 100)}%
                  </p>
                  <button
                    className="btn btn-primary btn-block"
                    style={{ marginTop: 12 }}
                    onClick={() => navigate("/profile")}
                  >
                    Confirm & Continue →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
