import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

export default function Satya() {
  const navigate = useNavigate();
  const { state, update } = useJourney();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(state.satya);

  useEffect(() => {
    if (!state.selectedOption) return;
    api.satyaVerify(state.selectedOption).then((res) => {
      setResult(res);
      update({ satya: res });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.selectedOption) {
    return (
      <div className="app-shell">
        <TopBar title="SATYA Verification" />
        <div className="screen">
          <p className="muted">No option selected yet.</p>
          <button className="btn btn-primary" onClick={() => navigate("/recommendations")}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar title="SATYA Verification" />
      <div className="screen">
        <h1>SATYA — Fact Verification</h1>
        <p className="muted">
          Before SkillCall speaks any government fact out loud, SATYA checks it against the database.
          Nothing is invented — unverified facts are never spoken to the caller.
        </p>

        {loading && <p className="muted">Verifying facts against database...</p>}

        {result && (
          <>
            <div className="card">
              {result.checks.map((c, i) => (
                <div className="check-row" key={i}>
                  <span className="check-icon">{c.verified ? "✅" : "⚠️"}</span>
                  <div>
                    <p>{c.fact}</p>
                    <p className="muted" style={{ fontSize: "0.8rem" }}>
                      Source: {c.source} · {c.verified ? "Verified" : "NOT verified — would not be spoken to caller"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background: result.all_verified ? "var(--color-primary-light)" : "var(--color-danger-light)" }}>
              <strong>
                {result.all_verified
                  ? "All facts verified. Safe to present to the user."
                  : "Some facts could not be verified. Would be flagged before speaking."}
              </strong>
            </div>

            <button
              className="btn btn-primary btn-block"
              disabled={!result.all_verified}
              onClick={() => navigate("/case")}
            >
              User Confirms — Create Case →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
