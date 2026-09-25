import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

const OPTIONS = [
  { value: "confident", label: "I can do this confidently" },
  { value: "partial", label: "I can do this a little" },
  { value: "none", label: "I have not done this" },
];

export default function SkillGap() {
  const navigate = useNavigate();
  const { state, update } = useJourney();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [gapReady, setGapReady] = useState(state.gap.length > 0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state.occupationMatch) return;
    api.skillQuestions(state.occupationMatch.occupation).then((res) => {
      setQuestions(res.questions);
      setLoading(false);
    }).catch(() => setError("Could not load skill questions."));
  }, [state.occupationMatch]);

  if (!state.occupationMatch) {
    return (
      <div className="app-shell">
        <TopBar title="Skill Assessment" />
        <div className="screen">
          <p className="muted">No occupation matched yet.</p>
          <button className="btn btn-primary" onClick={() => navigate("/voice")}>Go to Voice Demo</button>
        </div>
      </div>
    );
  }

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.skill]);

  const submitAnswers = async () => {
    setError("");
    try {
      const res = await api.skillGap(state.occupationMatch.occupation, state.yearsExperience, answers);
      update({ skillAnswers: answers, gap: res.gap });
      setGapReady(true);
    } catch {
      setError("Server not reachable. Is the backend running?");
    }
  };

  const goRecommendations = () => navigate("/recommendations");

  return (
    <div className="app-shell">
      <TopBar title="Skill Assessment" />
      <div className="screen">
        {!gapReady ? (
          <>
            <h1>Occupation-Specific Skill Questions</h1>
            <p className="muted">
              Asked one by one over the call for <strong>{state.occupationMatch.occupation}</strong>.
            </p>
            {loading && <p className="muted">Loading questions...</p>}
            {questions.map((q) => (
              <div className="card" key={q.skill}>
                <h3>{q.skill}</h3>
                <p className="muted" style={{ marginBottom: 10 }}>
                  Level: {q.level} · Importance: {q.importance}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="pill-lang"
                      style={{
                        textAlign: "left",
                        background: answers[q.skill] === opt.value ? "var(--color-primary)" : "white",
                        color: answers[q.skill] === opt.value ? "white" : "var(--color-ink)",
                        borderColor: answers[q.skill] === opt.value ? "var(--color-primary)" : "var(--color-border)",
                      }}
                    >
                      <input
                        type="radio"
                        name={q.skill}
                        value={opt.value}
                        checked={answers[q.skill] === opt.value}
                        onChange={() => setAnswers((a) => ({ ...a, [q.skill]: opt.value }))}
                        style={{ display: "none" }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
            <button className="btn btn-primary btn-block" disabled={!allAnswered} onClick={submitAnswers}>
              Build Skill Profile →
            </button>
          </>
        ) : (
          <>
            <h1>Skill Profile</h1>
            <p className="muted">Gap between what you have and what the occupation needs.</p>
            <div className="gap-grid">
              {state.gap.map((g) => (
                <div className="card" key={g.skill} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3>{g.skill}</h3>
                    <p className="muted">Importance: {g.importance}</p>
                  </div>
                  <span className={`tag tag-${g.status.toLowerCase()}`}>{g.status}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-block" onClick={goRecommendations}>
              See Recommended Options →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
