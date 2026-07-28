import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Resume from "./pages/Resume";
import ATSScore from "./pages/ATSScore";
import CoverLetter from "./pages/CoverLetter";
import Interview from "./pages/Interview";
import SettingsPage from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Resume />} />
        <Route path="/ats" element={<ATSScore />} />
        <Route path="/cover-letter" element={<CoverLetter />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
