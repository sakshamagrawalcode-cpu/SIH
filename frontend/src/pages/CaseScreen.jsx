import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

export default function CaseScreen() {
  const navigate = useNavigate();
  const { state, update } = useJourney();
  const [loading, setLoading] = useState(!state.caseId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (state.caseId || !state.selectedOption) return;
    api.createCase({
      name: state.profile.name || "Demo Caller",
      age: Number(state.profile.age) || 0,
      education: state.profile.education,
      location: state.profile.location_block,
      phone: state.profile.phone,
      language: state.language,
      occupation: state.occupationMatch.occupation,
      years_experience: state.yearsExperience,
      skill_gap: state.gap,
      selected_option: state.selectedOption,
      career_path: state.careerPath,
      satya_checks: state.satya,
    }).then((res) => {
      update({ caseId: res.case_id, csc: res.csc });
      setLoading(false);
    }).catch(() => {
      setError("Could not create case — is the backend running?");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.selectedOption) {
    return (
      <div className="app-shell">
        <TopBar title="Case" />
        <div className="screen">
          <p className="muted">No option selected yet.</p>
          <button className="btn btn-primary" onClick={() => navigate("/recommendations")}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title="Case Created" />
      <div className="screen">
        {loading && <p className="muted">Creating your case...</p>}
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        {state.caseId && (
          <>
            <div className="card center" style={{ background: "var(--color-primary-light)" }}>
              <p className="muted">Case ID</p>
              <h1 style={{ color: "var(--color-primary-dark)" }}>{state.caseId}</h1>
              <span className="status-badge status-submitted">Submitted</span>
            </div>

            <div className="card">
              <h3>Selected Option</h3>
              <p style={{ marginTop: 8 }}><strong>{state.selectedOption.title}</strong></p>
              <p className="muted">{state.selectedOption.centre}</p>
            </div>

            <div className="card">
              <h3>Nearest CSC</h3>
              <p style={{ marginTop: 8 }}>{state.csc}</p>
              <p className="muted">Visit with your Case ID to complete verification and enrollment.</p>
            </div>

            <div className="card">
              <h3>What happens next</h3>
              <ol style={{ paddingLeft: 18, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                <li>Officer reviews and approves your case</li>
                <li>You complete enrollment at the CSC / centre</li>
                <li>Follow-up check-ins at 1, 3 and 6 months</li>
              </ol>
            </div>

            <button className="btn btn-primary btn-block" onClick={() => navigate("/officer")}>
              Simulate: View as Officer →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
