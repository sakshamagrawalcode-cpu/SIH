import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

export default function CareerPath() {
  const navigate = useNavigate();
  const { state, update } = useJourney();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.occupationMatch) return;
    api.careerPath(state.occupationMatch.occupation).then((res) => {
      update({ careerPath: res.path });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.occupationMatch) {
    return (
      <div className="app-shell">
        <TopBar title="Career Path" />
        <div className="screen">
          <p className="muted">No occupation matched yet.</p>
          <button className="btn btn-primary" onClick={() => navigate("/voice")}>Go to Voice Demo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title="Career Path" />
      <div className="screen">
        <h1>Career Path</h1>
        <p className="muted">Where this option can take you over time.</p>
        {loading && <p className="muted">Loading...</p>}

        <div className="card">
          <div className="path-track">
            {state.careerPath.map((step, i) => (
              <div className={`path-step ${i === 1 ? "current" : ""}`} key={step.step_order}>
                <div className="dot" />
                <div>
                  <h3>{step.step}</h3>
                  <p className="muted">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {state.selectedOption && (
          <div className="card">
            <p className="muted">Path enabled by selected option:</p>
            <strong>{state.selectedOption.title}</strong>
          </div>
        )}

        <button className="btn btn-primary btn-block" onClick={() => navigate("/recommendations")}>
          Back to Options →
        </button>
      </div>
    </div>
  );
}
