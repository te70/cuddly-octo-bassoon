import React, { useState } from "react";
import { scoreStudent } from "../utils/claudeApi";

const DEMO_STUDENTS = [
  {
    name: "Amara Osei",
    course: "MSc Information Security",
    year: "Year 2",
    skills: "Python, Linux, Wireshark, Azure AD, SIEM tools, SQL, network forensics",
    assignments: "Digital Forensics Lab, Network Security Audit, IDS Implementation, Cloud IAM Policy Design",
    portfolioItems: "2",
  },
  {
    name: "Kwame Mensah",
    course: "BSc Computer Science",
    year: "Year 3",
    skills: "Java, Python, HTML/CSS, basic networking",
    assignments: "Data Structures project, Java OOP assignment, Web design lab",
    portfolioItems: "1",
  },
  {
    name: "Zara Njoroge",
    course: "BSc Information Technology",
    year: "Year 4",
    skills: "React, Node.js, PostgreSQL, Docker, REST APIs, Git, AWS basics",
    assignments: "Full-stack web app, Database design project, API integration lab, Cloud deployment assignment",
    portfolioItems: "4",
  },
];

const READINESS_COLORS = {
  "Emerging": "#EF9F27",
  "Developing": "#378ADD",
  "Job-Ready": "#1D9E75",
  "Exceptional": "#534AB7",
};

export default function CareerCoachPage() {
  const [form, setForm] = useState({
    name: "", course: "", year: "Year 1",
    skills: "", assignments: "", portfolioItems: "0",
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDemo, setSelectedDemo] = useState(null);

  function fillDemo(student) {
    setForm(student);
    setSelectedDemo(student.name);
    setResults(null);
  }

  async function score() {
    if (!form.name || !form.course || !form.skills) return;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const data = await scoreStudent(form);
      setResults(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Career Coach Dashboard</h2>
        <p>Score student preparedness and identify gaps.</p>
      </div>

      <div className="coach-layout">
        {/* Input */}
        <div className="coach-input-panel">
          <div className="panel-card">
            <h3 className="panel-title">Student Profile</h3>

            <div className="demo-students">
              <p className="field-label" style={{ marginBottom: 8 }}>Quick load demo student:</p>
              {DEMO_STUDENTS.map((s) => (
                <button
                  key={s.name}
                  className={`demo-student-btn ${selectedDemo === s.name ? "active" : ""}`}
                  onClick={() => fillDemo(s)}
                >
                  <span className="demo-initials">{s.name.split(" ").map(n => n[0]).join("")}</span>
                  <span>
                    <strong>{s.name}</strong>
                    <br />
                    <small>{s.course}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="divider-line" />

            <div className="form-grid">
              <div className="field-group">
                <label className="field-label">Student name</label>
                <input className="field-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" />
              </div>
              <div className="field-group">
                <label className="field-label">Year of study</label>
                <select className="field-input" value={form.year} onChange={e => setForm({...form, year: e.target.value})}>
                  {["Year 1","Year 2","Year 3","Year 4","Postgrad Year 1","Postgrad Year 2"].map(y => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Course / Programme</label>
              <input className="field-input" value={form.course} onChange={e => setForm({...form, course: e.target.value})} placeholder="e.g. MSc Information Security" />
            </div>

            <div className="field-group">
              <label className="field-label">Technical skills</label>
              <textarea className="field-input" rows={3} value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="e.g. Python, Linux, AWS, SQL, SIEM tools…" />
            </div>

            <div className="field-group">
              <label className="field-label">Completed assignments</label>
              <textarea className="field-input" rows={3} value={form.assignments} onChange={e => setForm({...form, assignments: e.target.value})} placeholder="e.g. Network Security Audit, Digital Forensics Lab…" />
            </div>

            <div className="field-group">
              <label className="field-label">Portfolio items (number)</label>
              <input className="field-input" type="number" min="0" max="20" value={form.portfolioItems} onChange={e => setForm({...form, portfolioItems: e.target.value})} />
            </div>

            <button className="action-btn full-width" onClick={score} disabled={loading || !form.name || !form.skills}>
              {loading ? "Scoring…" : "Score Student"}
            </button>
            {error && <p className="error-msg">{error}</p>}
          </div>
        </div>

        {/* Results */}
        <div className="coach-results-panel">
          {!results && !loading && (
            <div className="empty-state">
              <div className="empty-icon">◉</div>
              <p>Fill in a student profile or load a demo student, then click Score Student to see full readiness analytics.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner large" />
              <p>Running career readiness analysis…</p>
            </div>
          )}

          {results && <ReadinessResults data={results} studentName={form.name} />}
        </div>
      </div>
    </div>
  );
}

function ReadinessResults({ data, studentName }) {
  const color = READINESS_COLORS[data.readiness_label] || "#534AB7";

  return (
    <div className="results-container">
      {/* Header */}
      <div className="results-header">
        <div className="student-avatar">{studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
        <div>
          <h3>{studentName}</h3>
          <span className="readiness-badge" style={{ background: color + "22", color }}>
            {data.readiness_label}
          </span>
        </div>
      </div>

      {/* Score row */}
      <div className="score-row">
        <ScoreGauge value={data.readiness_score} label="Career Readiness" color={color} />
        <ScoreGauge value={data.portfolio_readiness} label="Portfolio Readiness" color="#1D9E75" />
      </div>

      <p className="summary-text">{data.summary}</p>

      {/* Job matches */}
      <div className="section-title">Job Match Scores</div>
      <div className="job-matches">
        {data.job_matches.map((j, i) => (
          <div key={i} className="job-match-row">
            <div className="job-info">
              <span className="job-role">{j.role}</span>
              <span className="job-gap">Gap: {j.gap}</span>
            </div>
            <div className="match-bar-wrap">
              <div className="match-bar">
                <div
                  className="match-bar-fill"
                  style={{
                    width: `${j.match_pct}%`,
                    background: j.match_pct >= 75 ? "#1D9E75" : j.match_pct >= 50 ? "#378ADD" : "#EF9F27",
                  }}
                />
              </div>
              <span className="match-pct">{j.match_pct}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Strengths & Gaps */}
      <div className="sg-row">
        <div className="sg-card strengths">
          <div className="sg-title">Strengths</div>
          {data.strengths.map((s, i) => (
            <div key={i} className="sg-item">✓ {s}</div>
          ))}
        </div>
        <div className="sg-card gaps">
          <div className="sg-title">Gaps</div>
          {data.gaps.map((g, i) => (
            <div key={i} className="sg-item">◎ {g}</div>
          ))}
        </div>
      </div>

      {/* Next action */}
      <div className="next-action">
        <span className="next-label">Next action</span>
        <p>{data.next_action}</p>
      </div>
    </div>
  );
}

function ScoreGauge({ value, label, color }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <text x="50" y="55" textAnchor="middle" fill="white" fontSize="18" fontWeight="600" fontFamily="DM Sans">
          {value}
        </text>
      </svg>
      <span className="gauge-label">{label}</span>
    </div>
  );
}
