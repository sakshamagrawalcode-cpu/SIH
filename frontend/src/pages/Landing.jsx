import { useNavigate } from "react-router-dom";
import { useJourney, DEMO_PROFILES } from "../context/JourneyContext.jsx";

export default function Landing() {
  const navigate = useNavigate();
  const { reset, update } = useJourney();

  const startDemo = (key) => {
    reset();
    const demo = DEMO_PROFILES[key];
    update({
      profile: {
        name: demo.name,
        age: demo.age,
        education: demo.education,
        location_block: demo.location_block,
        phone: demo.phone,
        travel_distance_ok_km: demo.travel_distance_ok_km,
      },
      spokenSkillsText: demo.spokenSkillsText,
      yearsExperience: demo.yearsExperience,
    });
    navigate("/voice");
  };

  return (
    <div className="app-shell">
      <div className="screen">
        <div className="banner-demo">SIH 2026 · PS SIH26097 · Team Cognify — Prototype with demo/sample data</div>
        <div className="landing-hero">
          <div className="logo-badge">📞</div>
          <h1>SkillCall</h1>
          <p className="muted">
            "One free phone call that turns skills into the right work."
          </p>
        </div>

        <div className="card">
          <h3>How it works</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Give a missed call. We call back, ask a few questions by keypad and voice
            in your own language, and match your existing skills to real training,
            certification and business support options near you — no app, no internet,
            no reading needed.
          </p>
        </div>

        <button className="btn btn-primary btn-block" onClick={() => startDemo("ramesh")}>
          ▶ Start Voice Demo — Ramesh (Bike Mechanic)
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => startDemo("sunita")}>
          ▶ Second Demo — Sunita (Tailor)
        </button>
        <button className="btn btn-outline btn-block" onClick={() => { reset(); navigate("/voice"); }}>
          ⌨ Try With Keypad Only
        </button>

        <div className="grid-2">
          <button className="btn btn-outline btn-block" onClick={() => navigate("/officer")}>
            👨‍💼 Officer Dashboard
          </button>
          <button className="btn btn-outline btn-block" onClick={() => navigate("/map")}>
            🗺 Demand Map
          </button>
        </div>

        <p className="muted center" style={{ fontSize: "0.75rem" }}>
          Ministry of Social Justice &amp; Empowerment · PM-AJAY GIA · Agriculture, FoodTech &amp; Rural Development
        </p>
      </div>
    </div>
  );
}
