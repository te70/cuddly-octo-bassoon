import React, { useState } from "react";
import StudentPage from "./pages/StudentPage";
import LecturerPage from "./pages/LecturerPage";
import CareerCoachPage from "./pages/CareerCoachPage";
import "./styles.css";

const ROLES = [
  { id: "student", label: "Student", icon: "◈", desc: "AI coaching & portfolio tools" },
  { id: "lecturer", label: "Lecturer", icon: "◆", desc: "Curriculum intelligence" },
  { id: "coach", label: "Career Coach", icon: "◉", desc: "Student readiness analytics" },
];

export default function App() {
  const [role, setRole] = useState(null);

  if (!role) {
    return (
      <div className="landing">
        <div className="landing-bg">
          <div className="bg-orb orb1" />
          <div className="bg-orb orb2" />
          <div className="bg-grid" />
        </div>
        <div className="landing-content">
          <div className="logo-mark">CA</div>
          <h1 className="landing-title">
            Career<br /><em>Architect</em>
          </h1>
          <p className="landing-sub">
            AI-powered career readiness for African universities
          </p>
          <div className="role-cards">
            {ROLES.map((r) => (
              <button key={r.id} className="role-card" onClick={() => setRole(r.id)}>
                <span className="role-icon">{r.icon}</span>
                <span className="role-label">{r.label}</span>
                <span className="role-desc">{r.desc}</span>
                <span className="role-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="back-btn" onClick={() => setRole(null)}>
          ← Career Architect
        </button>
        <div className="header-role">
          {ROLES.find((r) => r.id === role)?.icon}{" "}
          {ROLES.find((r) => r.id === role)?.label}
        </div>
      </header>
      <main className="app-main">
        {role === "student" && <StudentPage />}
        {role === "lecturer" && <LecturerPage />}
        {role === "coach" && <CareerCoachPage />}
      </main>
    </div>
  );
}
