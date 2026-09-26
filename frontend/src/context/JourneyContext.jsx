import { createContext, useContext, useEffect, useState } from "react";

const JourneyContext = createContext(null);

const STORAGE_KEY = "skillcall_journey_v2";

const initialState = {
  language: "Hindi",
  consent: false,
  profile: {
    name: "",
    age: "",
    gender: "",
    education: "",
    location_block: "",
    phone: "",
    travel_distance_ok_km: 10,
  },
  transcript: [],
  spokenSkillsText: "",
  occupationMatch: null,
  skillQuestions: [],
  skillAnswers: {},
  yearsExperience: 0,
  eligibility: null,
  gap: [],
  options: [],
  selectedOption: null,
  careerPath: [],
  satya: null,
  qaHistory: [],
  caseId: null,
  csc: null,
  // stage flags drive the right-hand status checklist
  stages: {
    occupation_matched: false,
    profile_collected: false,
    eligibility_checked: false,
    skills_collected: false,
    gap_calculated: false,
    options_generated: false,
    satya_verified: false,
    case_created: false,
  },
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return initialState;
}

export function JourneyProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / private mode */
    }
  }, [state]);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const updateProfile = (patch) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  const setStage = (key, value = true) =>
    setState((s) => ({ ...s, stages: { ...s.stages, [key]: value } }));
  const reset = () => {
    setState(initialState);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };
  const addTranscript = (speaker, text) =>
    setState((s) => ({ ...s, transcript: [...s.transcript, { speaker, text, ts: Date.now() }] }));

  return (
    <JourneyContext.Provider value={{ state, update, updateProfile, setStage, reset, addTranscript }}>
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error("useJourney must be used within JourneyProvider");
  return ctx;
}

export const DEMO_PROFILES = {
  ramesh: {
    name: "Ramesh Kumar",
    age: "28",
    gender: "Male",
    education: "Class 10",
    location_block: "Dholka Block",
    phone: "9876500000",
    travel_distance_ok_km: 10,
    spokenSkillsText: "Main paanch saal se bike thik karta hoon. Engine aur brake ka kaam accha aata hai.",
    yearsExperience: 5,
    skillAnswers: {
      "Engine Repair": "confident",
      "Brake Repair": "confident",
      "Electrical Diagnostics": "partial",
      "Advanced Diagnostics (OBD/Fuel Injection)": "none",
      "Customer Handling & Billing": "partial",
    },
  },
  sunita: {
    name: "Sunita Devi",
    age: "32",
    gender: "Female",
    education: "Class 5",
    location_block: "Sanand Block",
    phone: "9876511111",
    travel_distance_ok_km: 8,
    spokenSkillsText: "Main ghar par kapde silti hoon, teen saal se blouse aur salwar suit banati hoon.",
    yearsExperience: 3,
    skillAnswers: {
      "Hand Stitching": "confident",
      "Machine Stitching": "confident",
      "Pattern Cutting": "partial",
      "Fabric Costing & Sizing": "partial",
      "Boutique/Business Management": "none",
    },
  },
};

export const EDUCATION_OPTIONS = [
  { key: "1", label: "No formal education" },
  { key: "2", label: "Class 5" },
  { key: "3", label: "Class 8" },
  { key: "4", label: "Class 10" },
  { key: "5", label: "Class 12" },
  { key: "6", label: "Graduate" },
];

export const LOCATION_OPTIONS = [
  { key: "1", label: "Dholka Block" },
  { key: "2", label: "Sanand Block" },
  { key: "3", label: "Bavla Block" },
];

export const TRAVEL_OPTIONS = [
  { key: "1", label: "5 km", value: 5 },
  { key: "2", label: "10 km", value: 10 },
  { key: "3", label: "20 km", value: 20 },
  { key: "4", label: "Any distance", value: 999 },
];
