import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";

export default function Profile() {
  const navigate = useNavigate();
  const { state, update } = useJourney();
  const [years, setYears] = useState(state.yearsExperience || 1);

  if (!state.occupationMatch) {
    return (
      <div className="app-shell">
        <TopBar title="Profile" />
        <div className="screen">
          <p className="muted">No occupation matched yet. Please start from the voice demo.</p>
          <button className="btn btn-primary" onClick={() => navigate("/voice")}>Go to Voice Demo</button>
        </div>
      </div>
    );
  }

  const continueNext = () => {
    update({ yearsExperience: Number(years) });
    navigate("/skill-gap");
  };

  return (
    <div className="app-shell">
      <TopBar title="Profile" />
      <div className="screen">
        <h1>Profile Summary</h1>
        <p className="muted">Collected from missed-call keypad + voice — confirm before we ask skill questions.</p>

        <div className="card">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Row label="Name" value={state.profile.name || "Not captured (demo)"} />
            <Row label="Age" value={state.profile.age} />
            <Row label="Education" value={state.profile.education} />
            <Row label="Location / Block" value={state.profile.location_block} />
            <Row label="Phone" value={state.profile.phone} />
            <Row label="Max travel distance" value={`${state.profile.travel_distance_ok_km} km`} />
            <Row label="Preferred language" value={state.language} />
          </div>
        </div>

        <div className="card">
          <h3>Matched Occupation</h3>
          <p style={{ marginTop: 8 }}><strong>{state.occupationMatch.occupation}</strong></p>
          <p className="muted">NCO Code: {state.occupationMatch.nco_code}</p>
          <p className="muted">{state.occupationMatch.description}</p>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Years of experience (self-reported via voice)</label>
            <input type="number" min="0" value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={continueNext}>
          Continue to Skill Questions →
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="muted">{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}
