import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { api } from "../api/client.js";

const STATUS_LABEL = {
  submitted: "New",
  pending_officer_review: "Pending",
  approved: "Approved",
  clarification_requested: "Clarification Requested",
};

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.officerCases().then((res) => {
      setCases(res.cases);
      setLoading(false);
    }).catch(() => {
      setError("Could not load cases — is the backend running?");
      setLoading(false);
    });
  };

  useEffect(load, [location.key]);

  const filtered = filter === "all" ? cases : cases.filter((c) => c.status === filter);
  const counts = {
    all: cases.length,
    submitted: cases.filter((c) => c.status === "submitted").length,
    approved: cases.filter((c) => c.status === "approved").length,
    clarification_requested: cases.filter((c) => c.status === "clarification_requested").length,
  };

  return (
    <div className="app-shell wide">
      <div className="topbar">
        <button className="back" onClick={() => navigate("/")}>← Home</button>
        <span className="brand">SkillCall — Officer Dashboard</span>
        <span />
      </div>
      <div className="nav-tabs">
        <Link to="/officer" className="active-tab">Cases</Link>
        <Link to="/map">Demand Map</Link>
      </div>
      <div className="screen">
        <div className="banner-demo">Demo data — cases created during this session, not real PM-AJAY records</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <FilterChip label={`All (${counts.all})`} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label={`New (${counts.submitted})`} active={filter === "submitted"} onClick={() => setFilter("submitted")} />
          <FilterChip label={`Approved (${counts.approved})`} active={filter === "approved"} onClick={() => setFilter("approved")} />
          <FilterChip label={`Clarification (${counts.clarification_requested})`} active={filter === "clarification_requested"} onClick={() => setFilter("clarification_requested")} />
        </div>

        {loading && <p className="muted">Loading cases...</p>}
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        {!loading && filtered.length === 0 && <p className="muted">No cases in this filter yet. Run the voice demo to create one.</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((c) => (
            <div className="case-list-item" key={c.case_id} onClick={() => navigate(`/officer/case/${c.case_id}`)}>
              <div>
                <strong>{c.name}</strong>
                <p className="muted">{c.occupation} · {c.location} · {c.case_id}</p>
              </div>
              <span className={`status-badge status-${c.status}`}>{STATUS_LABEL[c.status] || c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button className="pill-lang" style={active ? { background: "var(--color-primary)", color: "white", borderColor: "var(--color-primary)" } : {}} onClick={onClick}>
      {label}
    </button>
  );
}
