import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

const LIFECYCLE = ["submitted", "pending_officer_review", "approved", "active", "closed"];

export default function CaseScreen() {
  const navigate = useNavigate();
  const { state } = useJourney();
  const [caseData, setCaseData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state.caseId) return;
    api.getCase(state.caseId).then(setCaseData).catch(() => setError("Could not load case."));
  }, [state.caseId]);

  if (!state.caseId) {
    return (
      <div className="app-shell">
        <TopBar title="My Case" />
        <div className="screen">
          <p className="muted">No case yet. Complete a call to create one.</p>
          <button className="btn btn-primary" onClick={() => navigate("/voice")}>Start Call</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title="My Case" />
      <div className="screen">
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        <div className="card center" style={{ background: "var(--color-primary-light)" }}>
          <p className="muted">Case ID</p>
          <h1 style={{ color: "var(--color-primary-dark)" }}>{state.caseId}</h1>
          <span className={`status-badge status-${caseData?.status || "submitted"}`}>{(caseData?.status || "submitted").replace(/_/g, " ")}</span>
        </div>

        {caseData && (
          <div className="card">
            <h3>Status</h3>
            <div className="status-timeline">
              {LIFECYCLE.map((s) => {
                const reached = caseData.history?.some((h) => h.stage === s) || s === caseData.status;
                return (
                  <div key={s} className={`status-step ${reached ? "reached" : ""} ${s === caseData.status ? "current" : ""}`}>
                    <span className="dot" /><span className="lbl">{s.replace(/_/g, " ")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card">
          <h3>Selected Option</h3>
          <p style={{ marginTop: 8 }}><strong>{state.selectedOption?.title}</strong></p>
          <p className="muted">{state.csc}</p>
          <p className="muted">Visit with your Case ID to complete verification and enrollment.</p>
        </div>

        {caseData?.documents?.length > 0 && (
          <div className="card">
            <h3>Documents ({caseData.documents.length})</h3>
            {caseData.documents.map((d) => (
              <p key={d.id} className="muted" style={{ marginTop: 4 }}>✓ {d.filename} — {d.doc_type}</p>
            ))}
          </div>
        )}

        <div className="grid-2">
          <button className="btn btn-secondary btn-block" onClick={() => navigate("/documents")}>Upload Documents</button>
          <button className="btn btn-outline btn-block" onClick={() => navigate(`/followup/${state.caseId}`)}>Follow-up</button>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => navigate("/officer")}>View as Officer →</button>
        <button className="btn btn-outline btn-block" onClick={() => navigate("/portal")}>← User Portal</button>
      </div>
    </div>
  );
}
