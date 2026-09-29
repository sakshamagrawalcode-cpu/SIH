import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { api } from "../api/client.js";

export default function Architecture() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.systemModels().then(setData).catch(() => setError("Backend not reachable."));
  }, []);

  return (
    <div className="app-shell wide">
      <TopBar title="Architecture & Tech Stack" />
      <div className="screen">
        <div className="banner-demo">
          Live vs. simulated is read from the backend. Set SARVAM_API_KEY (and AI4Bharat endpoint) to flip models to live — no code change.
        </div>
        <h1>System Architecture</h1>
        <p className="muted">The SkillCall voice pipeline and where each model plugs in.</p>

        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}

        {data && (
          <>
            {/* Flowchart */}
            <div className="card">
              <h3>Voice Pipeline (Pipecat orchestrated)</h3>
              <div className="flow">
                {data.pipeline.stages.map((s, i) => (
                  <div key={s.id} style={{ display: "contents" }}>
                    <div className={`flow-node ${s.live ? "live" : "sim"}`}>
                      <div className="flow-label">{s.label}</div>
                      <div className="flow-tech">{s.tech}</div>
                      <span className={`flow-badge ${s.live ? "live" : "sim"}`}>{s.live ? "LIVE" : "DEMO"}</span>
                    </div>
                    {i < data.pipeline.stages.length - 1 && <div className="flow-arrow">↓</div>}
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>{data.pipeline.note}</p>
            </div>

            {/* Active engines */}
            <div className="card">
              <h3>Active Engines (this run)</h3>
              <div className="grid-2" style={{ marginTop: 8 }}>
                <EngineTile label="Speech-to-Text" value={data.engines.stt} />
                <EngineTile label="LLM / Dialog" value={data.engines.llm} />
                <EngineTile label="Text-to-Speech" value={data.engines.tts} />
              </div>
            </div>

            {/* Model table */}
            <div className="card">
              <h3>Tech Stack — Model Status</h3>
              <table className="model-table">
                <thead>
                  <tr><th>Component</th><th>Model / Tech</th><th>Role</th><th>Status</th><th>Fallback</th></tr>
                </thead>
                <tbody>
                  {Object.entries(data.models).map(([k, m]) => (
                    <tr key={k}>
                      <td><strong>{m.name}</strong></td>
                      <td className="muted">{m.model}</td>
                      <td className="muted">{m.role}</td>
                      <td><span className={`flow-badge ${m.status === "live" ? "live" : "sim"}`}>{m.status.toUpperCase()}</span></td>
                      <td className="muted" style={{ fontSize: "0.78rem" }}>{m.fallback}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>{data.note}</p>
            </div>
          </>
        )}

        <button className="btn btn-outline btn-block" onClick={() => navigate("/")}>← Home</button>
      </div>
    </div>
  );
}

function EngineTile({ label, value }) {
  const live = !/demo/i.test(value);
  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)", background: live ? "var(--color-primary-light)" : "white" }}>
      <p className="muted" style={{ fontSize: "0.75rem" }}>{label}</p>
      <p style={{ fontWeight: 700, marginTop: 4 }}>{value}</p>
      <span className={`flow-badge ${live ? "live" : "sim"}`} style={{ marginTop: 6, display: "inline-block" }}>{live ? "LIVE" : "DEMO"}</span>
    </div>
  );
}
