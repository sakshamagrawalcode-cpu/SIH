import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

const DOC_TYPES = ["Aadhaar / ID", "Education Certificate", "Skill Certificate", "Other Supporting Document"];

export default function Documents() {
  const navigate = useNavigate();
  const { state } = useJourney();
  const [docs, setDocs] = useState([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const phone = state.profile.phone;

  const load = () => {
    if (!phone) return;
    api.listDocuments({ phone }).then((r) => setDocs(r.documents)).catch(() => {});
  };
  useEffect(load, [phone]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!phone) { setError("No phone on profile — run the call first or set phone in Edit Profile."); return; }
    setError("");
    setBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await api.uploadDocument({
        phone, case_id: state.caseId || null, doc_type: docType,
        filename: file.name, content_type: file.type || "application/octet-stream", data_url: dataUrl,
      });
      load();
    } catch (err) {
      setError(err.message?.includes("413") ? "File too large (max ~2MB in demo)." : "Upload failed.");
    }
    setBusy(false);
    e.target.value = "";
  };

  const remove = async (id) => { await api.deleteDocument(id); load(); };

  return (
    <div className="app-shell">
      <TopBar title="Documents" />
      <div className="screen">
        <h1>Documents</h1>
        <p className="muted">Upload supporting documents. These appear in the officer's view of your case. (Demo storage — not real government verification.)</p>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Document type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <label className="btn btn-primary btn-block" style={{ cursor: "pointer" }}>
            {busy ? "Uploading..." : "＋ Choose File to Upload"}
            <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onFile} disabled={busy} />
          </label>
          {!phone && <p className="muted">Tip: complete a call or set your phone in Edit Profile so documents attach to your profile.</p>}
          {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        </div>

        <div className="card">
          <h3>Uploaded Documents</h3>
          {docs.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No documents yet.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {docs.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                <div>
                  <strong>✓ {d.filename}</strong>
                  <p className="muted" style={{ fontSize: "0.78rem" }}>{d.doc_type} · {d.uploaded_at}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => remove(d.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-outline btn-block" onClick={() => navigate("/portal")}>← Back to Portal</button>
      </div>
    </div>
  );
}
