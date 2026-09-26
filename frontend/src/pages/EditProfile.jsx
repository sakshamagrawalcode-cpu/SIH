import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { useJourney, EDUCATION_OPTIONS, LOCATION_OPTIONS } from "../context/JourneyContext.jsx";
import { api } from "../api/client.js";

export default function EditProfile() {
  const navigate = useNavigate();
  const { state, update, updateProfile } = useJourney();
  const [form, setForm] = useState({
    name: state.profile.name || "",
    age: state.profile.age || "",
    gender: state.profile.gender || "",
    education: state.profile.education || "",
    location_block: state.profile.location_block || "",
    phone: state.profile.phone || "",
    travel_distance_ok_km: state.profile.travel_distance_ok_km || 10,
    occupation: state.occupationMatch?.occupation || "",
    yearsExperience: state.yearsExperience || 0,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const save = async () => {
    setError("");
    updateProfile({
      name: form.name, age: form.age, gender: form.gender, education: form.education,
      location_block: form.location_block, phone: form.phone, travel_distance_ok_km: form.travel_distance_ok_km,
    });
    update({ yearsExperience: Number(form.yearsExperience) });
    if (form.phone) {
      try {
        await api.upsertProfile({
          phone: form.phone, name: form.name, age: Number(form.age), gender: form.gender,
          education: form.education, location: form.location_block,
          travel_distance_km: Number(form.travel_distance_ok_km),
          occupation: form.occupation, years_experience: Number(form.yearsExperience),
          language: state.language,
        });
      } catch { setError("Saved locally, but server not reachable."); }
    }
    setSaved(true);
  };

  return (
    <div className="app-shell">
      <TopBar title="Edit Profile" />
      <div className="screen">
        <h1>Edit Profile</h1>
        <p className="muted">Update your details field by field. Changes flow into recommendations and your case.</p>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name"><input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Age"><input type="number" value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Education">
            <select value={form.education} onChange={(e) => set("education", e.target.value)}>
              <option value="">Select</option>
              {EDUCATION_OPTIONS.map((o) => <option key={o.key} value={o.label}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Location / Block">
            <select value={form.location_block} onChange={(e) => set("location_block", e.target.value)}>
              <option value="">Select</option>
              {LOCATION_OPTIONS.map((o) => <option key={o.key} value={o.label}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Max travel distance (km)"><input type="number" value={form.travel_distance_ok_km} onChange={(e) => set("travel_distance_ok_km", e.target.value)} /></Field>
          <Field label="Occupation"><input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
          <Field label="Years of experience"><input type="number" value={form.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} /></Field>

          {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
          {saved && <p style={{ color: "var(--color-primary)" }}>✓ Changes saved</p>}
          <button className="btn btn-primary btn-block" onClick={save}>Save Changes</button>
        </div>

        <button className="btn btn-outline btn-block" onClick={() => navigate("/portal")}>← Back to Portal</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
