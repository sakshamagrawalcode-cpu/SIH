import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import PhoneVoice from "./pages/PhoneVoice.jsx";
import Profile from "./pages/Profile.jsx";
import SkillGap from "./pages/SkillGap.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import CareerPath from "./pages/CareerPath.jsx";
import Satya from "./pages/Satya.jsx";
import CaseScreen from "./pages/CaseScreen.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import OfficerCaseDetail from "./pages/OfficerCaseDetail.jsx";
import Followup from "./pages/Followup.jsx";
import DemandMap from "./pages/DemandMap.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/voice" element={<PhoneVoice />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/skill-gap" element={<SkillGap />} />
      <Route path="/recommendations" element={<Recommendations />} />
      <Route path="/career-path" element={<CareerPath />} />
      <Route path="/satya" element={<Satya />} />
      <Route path="/case" element={<CaseScreen />} />
      <Route path="/officer" element={<OfficerDashboard />} />
      <Route path="/officer/case/:caseId" element={<OfficerCaseDetail />} />
      <Route path="/followup/:caseId" element={<Followup />} />
      <Route path="/map" element={<DemandMap />} />
    </Routes>
  );
}
