import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { api } from "../api/client.js";

const OUTCOMES = [
  { key: "not_started", label: "Not Started" },
  { key: "training", label: "Training" },
  { key: "employed", label: "Employed" },
  { key: "business_started", label: "Business Started" },
  { key: "earning", label: "Earning" },
];

const OUTCOME_COLOR = {
  not_started: "#9aa5ab", training: "#d98c2b", employed: "#1a7f5a",
  business_started: "#1a7f5a", earning: "#125c40",
};

const DEMO = {
  M1: { outcome: "training", note: "Enrolled at centre, training in progress.", earning: 3500 },
  M3: { outcome: "employed", note: "Certification completed, started freelance repair work.", earning: 6200 },
  M6: { outcome: "earning", note: "Working independently, earnings stabilising.", earning: 9800 },
};

export default function Followup() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.getFollowups(caseId).then(setData).catch(() => setData({ error: true }));
  useEffect(() => { load(); }, [caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setOutcome = async (milestone, outcome) => {
    setBusy(true);
    const demo = DEMO[milestone] || {};
    await api.followupUpdate(caseId, milestone, {
      status: outcome === "not_started" ? "pending" : "done",
      outcome,
      note: demo.note,
      earning_monthly: ["employed", "business_started", "earning"].includes(outcome) ? demo.earning : null,
    });
    await load();
    setBusy(false);
  };

  if (!data) return <Shell title="Follow-up"><p className="muted">Loading...</p></Shell>;
  if (data.error) return <Shell title="Follow-up"><p style={{ color: "var(--color-danger)" }}>No follow-up data for this case.</p></Shell>;

  const lastEarning = [...data.milestones].reverse().find((m) => m.earning_monthly)?.earning_monthly;

  return (
    <div className="app-shell">
      <TopBar title="Follow-up & Outcome" />
      <div className="screen">
        <h1>Follow-up Timeline</h1>
        <p className="muted">Check-ins at 1, 3 and 6 months. Officer updates the outcome at each milestone.</p>

        <div className="card">
          {data.milestones.map((m) => (
            <div className="timeline-row" key={m.milestone} style={{ marginBottom: 18 }}>
              <div className="timeline-marker" style={{ background: OUTCOME_COLOR[m.outcome] || "#9aa5ab" }}>{m.milestone}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                  <strong>{m.milestone} Follow-up</strong>
                  <span className="status-badge" style={{ background: "#eef0f4", color: "#56606e" }}>{(m.outcome || "not_started").replace(/_/g, " ")}</span>
                </div>
                {m.note && <p className="muted">{m.note}</p>}
                {m.earning_monthly && <p style={{ marginTop: 4 }}>Reported monthly earning: ₹{m.earning_monthly}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {OUTCOMES.map((o) => (
                    <button
                      key={o.key}
                      className="btn btn-sm"
                      style={{ background: m.outcome === o.key ? "var(--color-primary)" : "var(--color-primary-light)", color: m.outcome === o.key ? "white" : "var(--color-primary-dark)" }}
                      disabled={busy}
                      onClick={() => setOutcome(m.milestone, o.key)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {lastEarning && (
          <div className="card" style={{ background: "var(--color-primary-light)" }}>
            <p className="muted">Latest reported outcome</p>
            <h2 style={{ color: "var(--color-primary-dark)" }}>₹{lastEarning} / month</h2>
            <p className="muted" style={{ fontSize: "0.78rem" }}>Demo/sample outcome data for illustration only.</p>
          </div>
        )}

        <button className="btn btn-outline btn-block" onClick={() => navigate(`/officer/case/${caseId}`)}>← Back to Case</button>
      </div>
    </div>
  );
}

function Shell({ title, children }) {
  return <div className="app-shell"><TopBar title={title} /><div className="screen">{children}</div></div>;
}
