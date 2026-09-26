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
        name: demo.name, age: demo.age, gender: demo.gender, education: demo.education,
        location_block: demo.location_block, phone: demo.phone, travel_distance_ok_km: demo.travel_distance_ok_km,
      },
      spokenSkillsText: demo.spokenSkillsText,
      yearsExperience: demo.yearsExperience,
      skillAnswers: demo.skillAnswers,
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
          <p className="muted">"One free phone call that turns skills into the right work."</p>
        </div>

        <div className="card">
          <p className="muted">
            Any phone. Local-language voice. Keys for facts, voice for skills. AI maps your skills
            to the right livelihood, SATYA verifies information, an officer supports your application,
            and follow-up continues until you are earning.
          </p>
        </div>

        <button className="btn btn-primary btn-block" onClick={() => { reset(); navigate("/voice"); }}>
          📞 Simulate Call
        </button>
        <button className="btn btn-secondary btn-block" onClick={() => navigate("/portal")}>
          👤 Open User Portal
        </button>
        <button className="btn btn-outline btn-block" onClick={() => navigate("/officer")}>
          👨‍💼 Officer Dashboard
        </button>

        <div className="card">
          <h3>Quick demo profiles</h3>
          <p className="muted" style={{ marginBottom: 10 }}>Pre-fill a persona, then run the call.</p>
          <div className="grid-2">
            <button className="btn btn-accent btn-sm" onClick={() => startDemo("ramesh")}>Ramesh — Bike Mechanic</button>
            <button className="btn btn-accent btn-sm" onClick={() => startDemo("sunita")}>Sunita — Tailor</button>
          </div>
        </div>

        <button className="btn btn-outline btn-block" onClick={() => navigate("/map")}>🗺 Demand Map</button>

        <p className="muted center" style={{ fontSize: "0.75rem" }}>
          Ministry of Social Justice &amp; Empowerment · PM-AJAY GIA · Agriculture, FoodTech &amp; Rural Development
        </p>
      </div>
    </div>
  );
}
