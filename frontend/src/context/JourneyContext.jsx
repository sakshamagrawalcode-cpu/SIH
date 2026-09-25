import { createContext, useContext, useState } from "react";

const JourneyContext = createContext(null);

const initialState = {
  language: "Hindi",
  consent: false,
  profile: {
    name: "",
    age: "",
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
  gap: [],
  options: [],
  selectedOption: null,
  careerPath: [],
  satya: null,
  caseId: null,
  csc: null,
};

export function JourneyProvider({ children }) {
  const [state, setState] = useState(initialState);

  const update = (patch) => setState((s) => ({ ...s, ...patch }));
  const reset = () => setState(initialState);
  const addTranscript = (speaker, text) =>
    setState((s) => ({ ...s, transcript: [...s.transcript, { speaker, text, ts: Date.now() }] }));

  return (
    <JourneyContext.Provider value={{ state, update, reset, addTranscript }}>
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
    education: "Class 8",
    location_block: "Rampur Block",
    phone: "9876500000",
    travel_distance_ok_km: 10,
    spokenSkillsText: "Main paanch saal se bike thik karta hoon. Engine aur brake ka kaam accha aata hai.",
    yearsExperience: 5,
  },
  sunita: {
    name: "Sunita Devi",
    age: "32",
    education: "Class 5",
    location_block: "Sultanpur Block",
    phone: "9876511111",
    travel_distance_ok_km: 8,
    spokenSkillsText: "Main ghar par kapde silti hoon, teen saal se blouse aur salwar suit banati hoon.",
    yearsExperience: 3,
  },
};
