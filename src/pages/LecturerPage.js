import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { analyseCurriculum } from "../utils/claudeApi";

export default function LecturerPage() {
  const [courseName, setCourseName] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState("gap"); // gap | labs | cases

  async function analyse() {
    if (!courseName.trim() || !curriculum.trim() || loading) return;
    setLoading(true);
    setOutput("");
    try {
      await analyseCurriculum(courseName, curriculum, (text) => setOutput(text));
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  // Parse output into sections
  const sections = output ? parseSections(output) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Curriculum Intelligence</h2>
        <p>Compare your course against live job market demand.</p>
      </div>

      <div className="lec-layout">
        {/* Input panel */}
        <div className="lec-input-panel">
          <div className="panel-card">
            <h3 className="panel-title">Upload Curriculum</h3>
            <div className="field-group">
              <label className="field-label">Course name</label>
              <input
                className="field-input"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Network Security — Year 2"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Curriculum / Syllabus content</label>
              <textarea
                className="field-input"
                rows={10}
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                placeholder={`Paste your syllabus topics here. Example:\n\nWeek 1-2: Introduction to network security fundamentals\nWeek 3-4: Firewalls and packet filtering\nWeek 5-6: VPN technologies and IPSec\nWeek 7-8: Intrusion detection systems (IDS/IPS)\nWeek 9-10: Public Key Infrastructure (PKI)\nWeek 11-12: Network forensics with Wireshark\nWeek 13-14: Malware analysis basics`}
              />
            </div>
            <button
              className="action-btn full-width"
              onClick={analyse}
              disabled={loading || !courseName || !curriculum}
            >
              {loading ? "Analysing…" : "Analyse Curriculum"}
            </button>

            {/* Quick fill demo */}
            <button
              className="demo-fill-btn"
              onClick={() => {
                setCourseName("Network Security — Year 2");
                setCurriculum(
                  "Week 1-2: Introduction to network security fundamentals\nWeek 3-4: Firewalls and packet filtering\nWeek 5-6: VPN technologies and IPSec\nWeek 7-8: Intrusion detection systems (IDS/IPS)\nWeek 9-10: Public Key Infrastructure (PKI)\nWeek 11-12: Network forensics with Wireshark\nWeek 13-14: Malware analysis and reverse engineering basics\nWeek 15-16: Security auditing and compliance (ISO 27001 overview)\nAssessments: Lab reports, wireshark capture analysis, final exam"
                );
              }}
            >
              Use demo syllabus
            </button>
          </div>
        </div>

        {/* Output panel */}
        <div className="lec-output-panel">
          {!output && !loading && (
            <div className="empty-state">
              <div className="empty-icon">◆</div>
              <p>Upload your curriculum to see a full market gap analysis, recommended labs, and case studies.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="spinner large" />
              <p>Comparing curriculum against current job market…</p>
            </div>
          )}

          {output && sections && (
            <>
              {/* Score card */}
              {sections.score && (
                <div className="score-card">
                  <div className="score-ring">
                    <svg viewBox="0 0 80 80" width="80" height="80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke="var(--accent)"
                        strokeWidth="6"
                        strokeDasharray={`${(sections.score / 100) * 213.6} 213.6`}
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <span className="score-number">{sections.score}</span>
                  </div>
                  <div>
                    <div className="score-label">Market Alignment Score</div>
                    <div className="score-desc">{sections.scoreDesc}</div>
                  </div>
                </div>
              )}

              {/* View selector */}
              <div className="view-tabs">
                {[["gap", "Skill Gap"], ["labs", "Recommended Labs"], ["cases", "Case Studies"]].map(([v, l]) => (
                  <button key={v} className={`view-tab ${activeView === v ? "active" : ""}`} onClick={() => setActiveView(v)}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="markdown-output lec-output">
                <ReactMarkdown>
                  {activeView === "gap" ? sections.gap :
                   activeView === "labs" ? sections.labs :
                   sections.cases}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function parseSections(text) {
  // Extract score
  const scoreMatch = text.match(/Market Alignment Score:\s*(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
  const scoreDescMatch = text.match(/Market Alignment Score[^\n]*\n([^\n#]+)/);
  const scoreDesc = scoreDescMatch ? scoreDescMatch[1].trim() : "";

  // Split into major sections
  const gapMatch = text.match(/(## Skill Gap Analysis[\s\S]*?)(?=## Recommended Labs|## Suggested|$)/i);
  const labsMatch = text.match(/(## Recommended Labs[\s\S]*?)(?=## Suggested Case|$)/i);
  const casesMatch = text.match(/(## Suggested Case Studies[\s\S]*?)$/i);

  return {
    score,
    scoreDesc,
    gap: gapMatch ? gapMatch[1].trim() : text,
    labs: labsMatch ? labsMatch[1].trim() : "Labs section coming…",
    cases: casesMatch ? casesMatch[1].trim() : "Case studies coming…",
  };
}
