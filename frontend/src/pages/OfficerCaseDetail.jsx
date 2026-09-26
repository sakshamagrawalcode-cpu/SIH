import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { api } from "../api/client.js";

const LIFECYCLE = ["draft", "user_confirmed", "submitted", "pending_officer_review", "approved", "active", "closed"];

export default function OfficerCaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const load = () => api.getCase(caseId).then(setCaseData).catch(() => setError("Case not found."));
  useEffect(() => { load(); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async () => { setBusy(true); await api.approveCase(caseId, note || "Approved by officer"); await load(); setBusy(false); };
  const clarify = async () => { setBusy(true); await api.clarifyCase(caseId, note || "Please provide more details"); await load(); setBusy(false); };

  const viewDoc = async (id) => {
    try { const d = await api.getDocument(id); setPreview(d); } catch { setError("Could not load document."); }
  };

  if (error) return <Shell title="Case Detail"><p style={{ color: "var(--color-danger)" }}>{error}</p></Shell>;
  if (!caseData) return <Shell title="Case Detail"><p className="muted">Loading...</p></Shell>;

  return (
    <div className="app-shell wide">
      <TopBar title={`Case ${caseData.case_id}`} />
      <div className="screen">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <h1>{caseData.name}</h1>
            <span className={`status-badge status-${caseData.status}`}>{caseData.status.replace(/_/g, " ")}</span>
          </div>
          <p className="muted">Age {caseData.age} · {caseData.gender || "—"} · {caseData.education} · {caseData.location}</p>
          <p className="muted">Phone: {caseData.phone} · Language: {caseData.language}</p>
        </div>

        {/* Status timeline */}
        <div className="card">
          <h3>Case Status</h3>
          <div className="status-timeline">
            {LIFECYCLE.map((s) => {
              const reached = caseData.history?.some((h) => h.stage === s) || s === caseData.status;
              const isCurrent = s === caseData.status;
              return (
                <div key={s} className={`status-step ${reached ? "reached" : ""} ${isCurrent ? "current" : ""}`}>
                  <span className="dot" />
                  <span className="lbl">{s.replace(/_/g, " ")}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <h3>Work & Occupation</h3>
            <p style={{ marginTop: 8 }}><strong>{caseData.occupation}</strong></p>
            <p className="muted">{caseData.years_experience} years experience</p>
            <p className="muted" style={{ marginTop: 6 }}>
              Eligibility: {caseData.eligibility?.eligible ? "✓ Eligible (demo)" : caseData.eligibility?.eligible === false ? "✕ Not eligible" : "—"}
            </p>
          </div>

          <div className="card">
            <h3>Recommendation</h3>
            <p style={{ marginTop: 8 }}><strong>{caseData.selected_option.title}</strong></p>
            <p className="muted">{caseData.selected_option.centre} · {caseData.selected_option.distance_km} km</p>
            <p className="muted">Scheme: {caseData.selected_option.scheme}</p>
          </div>
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
          <h3>SATYA Verification</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            {caseData.satya_checks?.all_verified ? "✅ All facts verified before speaking to caller" : "⚠️ Some facts unverified"}
          </p>
        </div>

        {/* Documents */}
        <div className="card">
          <h3>Documents ({caseData.documents?.length || 0})</h3>
          {(!caseData.documents || caseData.documents.length === 0) && <p className="muted" style={{ marginTop: 8 }}>No documents uploaded.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {caseData.documents?.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{d.filename}</strong>
                  <p className="muted" style={{ fontSize: "0.78rem" }}>{d.doc_type} · {d.content_type} · {d.uploaded_at}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => viewDoc(d.id)}>View</button>
              </div>
            ))}
          </div>
          {preview && (
            <div style={{ marginTop: 12 }}>
              <p className="muted">Preview: {preview.filename}</p>
              {preview.content_type?.startsWith("image/") ? (
                <img src={preview.data_url} alt={preview.filename} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 6 }} />
              ) : (
                <a className="btn btn-secondary btn-sm" href={preview.data_url} download={preview.filename} style={{ marginTop: 6 }}>Download {preview.filename}</a>
              )}
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => setPreview(null)}>Close</button>
            </div>
          )}
        </div>

        {/* Case history */}
        <div className="card">
          <h3>Case History</h3>
          <div style={{ marginTop: 8 }}>
            {caseData.history?.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                <span className="muted" style={{ minWidth: 140, fontSize: "0.78rem" }}>{h.created_at}</span>
                <span style={{ fontSize: "0.85rem" }}><strong>{h.stage.replace(/_/g, " ")}</strong> — {h.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {["submitted", "pending_officer_review"].includes(caseData.status) ? (
          <div className="card">
            <h3>Officer Action</h3>
            <textarea rows={2} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 8 }} />
            <div className="grid-2" style={{ marginTop: 10 }}>
              <button className="btn btn-primary" disabled={busy} onClick={approve}>Approve</button>
              <button className="btn btn-outline" disabled={busy} onClick={clarify}>Request Clarification</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <p className="muted">Officer note: {caseData.officer_note || "—"}</p>
            <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => navigate(`/followup/${caseData.case_id}`)}>
              View / Update Follow-up →
            </button>
          </div>
        )}

        <button className="btn btn-outline btn-block" onClick={() => navigate("/officer")}>← Back to All Cases</button>
      </div>
    </div>
  );
}

function Shell({ title, children }) {
  return (
    <div className="app-shell">
      <TopBar title={title} />
      <div className="screen">{children}</div>
    </div>
  );
}
