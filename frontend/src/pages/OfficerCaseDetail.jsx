import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { api } from "../api/client.js";

export default function OfficerCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.getCase(caseId).then(setCaseData).catch(() => setError("Case not found."));
  };

  useEffect(load, [caseId]);

  const approve = async () => {
    setBusy(true);
    await api.approveCase(caseId, note || "Approved by officer");
    load();
    setBusy(false);
  };

  const clarify = async () => {
    setBusy(true);
    await api.clarifyCase(caseId, note || "Please provide more details");
    load();
    setBusy(false);
  };

  if (error) {
    return (
      <div className="app-shell">
        <TopBar title="Case Detail" />
        <div className="screen"><p style={{ color: "var(--color-danger)" }}>{error}</p></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="app-shell">
        <TopBar title="Case Detail" />
        <div className="screen"><p className="muted">Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title={`Case ${caseData.case_id}`} />
      <div className="screen">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h1>{caseData.name}</h1>
            <span className={`status-badge status-${caseData.status}`}>{caseData.status.replace(/_/g, " ")}</span>
          </div>
          <p className="muted">Age {caseData.age} · {caseData.education} · {caseData.location}</p>
          <p className="muted">Phone: {caseData.phone} · Language: {caseData.language}</p>
        </div>

        <div className="card">
          <h3>Occupation</h3>
          <p style={{ marginTop: 8 }}><strong>{caseData.occupation}</strong></p>
          <p className="muted">{caseData.years_experience} years experience (self-reported)</p>
        </div>

        <div className="card">
          <h3>Skill Gap</h3>
          <div className="gap-grid" style={{ marginTop: 10 }}>
            {caseData.skill_gap.map((g, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{g.skill}</span>
                <span className={`tag tag-${(g.status || "").toLowerCase()}`}>{g.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Recommendation</h3>
          <p style={{ marginTop: 8 }}><strong>{caseData.selected_option.title}</strong></p>
          <p className="muted">{caseData.selected_option.centre} · {caseData.selected_option.distance_km} km</p>
          <p className="muted">Scheme: {caseData.selected_option.scheme}</p>
        </div>

        <div className="card">
          <h3>SATYA Verification</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {caseData.satya_checks?.all_verified ? "✅ All facts verified before speaking to caller" : "⚠️ Some facts unverified"}
          </p>
        </div>

        {caseData.status === "submitted" || caseData.status === "pending_officer_review" ? (
          <div className="card">
            <h3>Officer Action</h3>
            <textarea rows={2} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 8 }} />
            <div className="grid-2" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" disabled={busy} onClick={approve}>Approve</button>
              <button className="btn btn-outline" disabled={busy} onClick={clarify}>Clarify</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="muted">Officer note: {caseData.officer_note || "—"}</p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => navigate(`/followup/${caseData.case_id}`)}>
              View Follow-up Timeline →
            </button>
          </div>
        )}

        <button className="btn btn-outline btn-block" onClick={() => navigate("/officer")}>← Back to All Cases</button>
      </div>
    </div>
  );
}
