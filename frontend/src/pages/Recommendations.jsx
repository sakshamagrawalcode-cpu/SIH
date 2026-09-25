import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

export default function Recommendations() {
  const navigate = useNavigate();
  const { state, update } = useJourney();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!state.occupationMatch || state.gap.length === 0) return;
    api.recommendations(
      state.occupationMatch.occupation,
      state.profile.location_block,
      state.yearsExperience,
      state.gap
    ).then((res) => {
      update({ options: res.options });
      setLoading(false);
    }).catch(() => {
      setError("Server not reachable.");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.occupationMatch || state.gap.length === 0) {
    return (
      <div className="app-shell">
        <TopBar title="Recommendations" />
        <div className="screen">
          <p className="muted">Complete the skill assessment first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/skill-gap")}>Go Back</button>
        </div>
      </div>
    );
  }

  const selectOption = (opt) => {
    update({ selectedOption: opt });
  };

  const viewCareerPath = (opt) => {
    update({ selectedOption: opt });
    navigate("/career-path");
  };

  return (
    <div className="app-shell">
      <TopBar title="Recommendations" />
      <div className="screen">
        <h1>Personalized Options</h1>
        <p className="muted">
          Based on your skill gap and location — up to 4 nearby verified options for{" "}
          <strong>{state.occupationMatch.occupation}</strong>.
        </p>
        {loading && <p className="muted">Finding nearby options...</p>}
        {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

        {state.options.map((opt) => (
          <div
            className={`option-card ${state.selectedOption?.course_id === opt.course_id ? "selected" : ""}`}
            key={opt.course_id}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{opt.title}</h3>
              <span className="tag tag-demo">{opt.type}</span>
            </div>
            <p className="muted">{opt.centre} · {opt.location} · {opt.distance_km} km away</p>
            <p className="muted">Duration: {opt.duration}</p>
            <p className="muted">Eligibility: {opt.eligibility}</p>
            <p className="muted">Covers: {opt.skills_covered.join(", ")}</p>
            <p style={{ fontSize: "0.85rem" }}><strong>Scheme:</strong> {opt.scheme} — {opt.scheme_benefit}</p>
            <div className="grid-2">
              <button className="btn btn-outline btn-sm" onClick={() => viewCareerPath(opt)}>
                View Career Path
              </button>
              <button
                className={`btn btn-sm ${state.selectedOption?.course_id === opt.course_id ? "btn-primary" : "btn-secondary"}`}
                onClick={() => selectOption(opt)}
              >
                {state.selectedOption?.course_id === opt.course_id ? "Selected ✓" : "Select"}
              </button>
            </div>
          </div>
        ))}

        <button
          className="btn btn-primary btn-block"
          disabled={!state.selectedOption}
          onClick={() => navigate("/satya")}
        >
          Continue with Selected Option →
        </button>
      </div>
    </div>
  );
}
