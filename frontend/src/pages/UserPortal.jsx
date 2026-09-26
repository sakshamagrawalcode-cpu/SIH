import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";

export default function UserPortal() {
  const navigate = useNavigate();
  const { state } = useJourney();

  return (
    <div className="app-shell">
      <TopBar title="User Portal" />
      <div className="screen">
        <h1>User Portal</h1>
        <p className="muted">Web access for family/CSC using mobile number. (Demo — OTP simulated.)</p>

        <div className="card">
          <h3>Your Profile</h3>
          {state.profile.name ? (
            <div style={{ marginTop: 8 }}>
              <p><strong>{state.profile.name}</strong></p>
              <p className="muted">{state.occupationMatch?.occupation || "Occupation not set"} · {state.profile.location_block || "—"}</p>
              {state.caseId && <p className="muted">Case: {state.caseId}</p>}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 8 }}>No profile yet. Start a call to build one.</p>
          )}
        </div>

        <button className="btn btn-primary btn-block" onClick={() => navigate("/voice")}>📞 Simulate Call</button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate("/profile-edit")}>✎ Edit Profile</button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate("/documents")}>📎 Documents</button>
        {state.caseId && (
          <>
            <button className="btn btn-outline btn-block" onClick={() => navigate("/case")}>📋 My Case</button>
            <button className="btn btn-outline btn-block" onClick={() => navigate(`/followup/${state.caseId}`)}>📅 Follow-up Status</button>
          </>
        )}
        <button className="btn btn-outline btn-block" onClick={() => navigate("/")}>← Home</button>
      </div>
    </div>
  );
}
