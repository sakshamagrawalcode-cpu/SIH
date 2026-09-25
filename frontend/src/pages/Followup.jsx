import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { api } from "../api/client.js";

const MARKER_COLOR = {
  pending: "#9aa5ab",
  in_progress: "#d98c2b",
  done: "#1a7f5a",
};

const DEMO_EARNINGS = { M1: 3500, M3: 6200, M6: 9800 };
const DEMO_NOTES = {
  M1: "Enrolled at centre, training in progress.",
  M3: "Certification completed, started freelance repair work.",
  M6: "Working independently, earnings stabilising.",
};

export default function Followup() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.getFollowups(caseId).then(setData).catch(() => setData({ error: true }));
  };

  useEffect(load, [caseId]);

  const advance = async (milestone) => {
    setBusy(true);
    await api.updateFollowup(caseId, milestone, {
      status: "done",
      note: DEMO_NOTES[milestone],
      earning_monthly: DEMO_EARNINGS[milestone],
    });
    load();
    setBusy(false);
  };

  if (!data) {
    return (
      <div className="app-shell">
        <TopBar title="Follow-up" />
        <div className="screen"><p className="muted">Loading...</p></div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="app-shell">
        <TopBar title="Follow-up" />
        <div className="screen"><p style={{ color: "var(--color-danger)" }}>No follow-up data for this case.</p></div>
      </div>
    );
  }

  const lastEarning = [...data.milestones].reverse().find((m) => m.earning_monthly)?.earning_monthly;

  return (
    <div className="app-shell">
      <TopBar title="Follow-up & Outcome" />
      <div className="screen">
        <h1>Follow-up Timeline</h1>
        <p className="muted">Check-ins at 1, 3 and 6 months after placement.</p>

        <div className="card">
          {data.milestones.map((m) => (
            <div className="timeline-row" key={m.milestone} style={{ marginBottom: 18 }}>
              <div className="timeline-marker" style={{ background: MARKER_COLOR[m.status] || "#9aa5ab" }}>
                {m.milestone}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{m.milestone} Follow-up</strong>
                  <span className={`status-badge status-${m.status}`}>{m.status.replace(/_/g, " ")}</span>
                </div>
                <p className="muted">{m.note || "Not yet conducted"}</p>
                {m.earning_monthly && <p style={{ marginTop: 4 }}>Reported monthly earning: ₹{m.earning_monthly}</p>}
                {m.status === "pending" && (
                  <button className="btn btn-sm btn-outline" style={{ marginTop: 8 }} disabled={busy} onClick={() => advance(m.milestone)}>
                    Simulate {m.milestone} Check-in
                  </button>
                )}
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

        <button className="btn btn-outline btn-block" onClick={() => navigate(`/officer/case/${caseId}`)}>
          ← Back to Case
        </button>
      </div>
    </div>
  );
}
