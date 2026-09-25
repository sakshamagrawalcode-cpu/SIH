const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  matchOccupation: (spoken_text) =>
    request("/api/match-occupation", { method: "POST", body: JSON.stringify({ spoken_text }) }),

  skillQuestions: (occupation) =>
    request(`/api/skill-questions?occupation=${encodeURIComponent(occupation)}`),

  skillGap: (occupation, years_experience, answers) =>
    request("/api/skill-gap", {
      method: "POST",
      body: JSON.stringify({ occupation, years_experience, answers }),
    }),

  recommendations: (occupation, location_block, years_experience, gap) =>
    request("/api/recommendations", {
      method: "POST",
      body: JSON.stringify({ occupation, location_block, years_experience, gap }),
    }),

  careerPath: (occupation) =>
    request(`/api/career-path?occupation=${encodeURIComponent(occupation)}`),

  satyaVerify: (option) =>
    request("/api/satya-verify", { method: "POST", body: JSON.stringify({ option }) }),

  createCase: (payload) =>
    request("/api/cases", { method: "POST", body: JSON.stringify(payload) }),

  getCase: (caseId) => request(`/api/cases/${caseId}`),

  officerCases: (status) =>
    request(`/api/officer/cases${status ? `?status=${status}` : ""}`),

  approveCase: (caseId, note) =>
    request(`/api/officer/cases/${caseId}/approve`, { method: "POST", body: JSON.stringify({ note }) }),

  clarifyCase: (caseId, note) =>
    request(`/api/officer/cases/${caseId}/clarify`, { method: "POST", body: JSON.stringify({ note }) }),

  getFollowups: (caseId) => request(`/api/followup/${caseId}`),

  updateFollowup: (caseId, milestone, payload) =>
    request(`/api/followup/${caseId}/${milestone}`, { method: "POST", body: JSON.stringify(payload) }),

  demandMap: () => request("/api/map"),

  health: () => request("/api/health"),
};
