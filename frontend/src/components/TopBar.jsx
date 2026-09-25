import { useNavigate } from "react-router-dom";

export default function TopBar({ title = "SkillCall", showBack = true, right = null }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      {showBack ? (
        <button className="back" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
      ) : (
        <span style={{ width: 24 }} />
      )}
      <span className="brand">{title}</span>
      <span>{right}</span>
    </div>
  );
}
