import React, { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { analyseCourse, parseReport, countItems } from "./utils/claudeApi";
import { extractFile, ACCEPT_STRING } from "./utils/fileExtractor";
import "./styles.css";

const DEMO_COURSES = [
  {
    label: "Cybersecurity Fundamentals",
    title: "Cybersecurity Fundamentals — 6-Week Bootcamp",
    audience: "IT professionals and recent graduates entering cybersecurity",
    content: `Module 1: Introduction to cybersecurity concepts and CIA triad
Module 2: Networking fundamentals — TCP/IP, OSI model, subnetting
Module 3: Firewalls and perimeter security
Module 4: Antivirus software and endpoint protection
Module 5: Password security and basic authentication
Module 6: Introduction to penetration testing with Kali Linux
Module 7: Vulnerability scanning with Nessus
Module 8: Security incident response basics
Module 9: Introduction to SIEM tools — Splunk basics
Module 10: Compliance frameworks — ISO 27001 overview
Module 11: Social engineering and phishing awareness
Module 12: Basic cryptography — symmetric and asymmetric encryption
Assessment: Final practical exam using virtual lab environment`,
  },
  {
    label: "Data Analytics",
    title: "Data Analytics for Business — Masterclass",
    audience: "Business professionals and analysts looking to upskill",
    content: `Week 1: Introduction to data analytics and business intelligence
Week 2: Excel for data analysis — pivot tables, VLOOKUP, charts
Week 3: Introduction to SQL — SELECT, WHERE, JOIN, GROUP BY
Week 4: Data visualisation with Tableau Desktop
Week 5: Statistics for analysts — mean, median, standard deviation
Week 6: Introduction to Python for data analysis — pandas basics
Week 7: Data cleaning and preparation techniques
Week 8: Dashboard design principles
Week 9: Presenting data to stakeholders
Week 10: Introduction to machine learning concepts (theoretical only)
Final project: Build a business dashboard from a provided dataset`,
  },
  {
    label: "Digital Marketing",
    title: "Digital Marketing Professional Course",
    audience: "Marketing professionals and small business owners",
    content: `Unit 1: Digital marketing strategy and planning
Unit 2: Search engine optimisation (SEO) — on-page and off-page
Unit 3: Google Ads and pay-per-click advertising
Unit 4: Social media marketing — Facebook, Instagram, Twitter
Unit 5: Email marketing with Mailchimp
Unit 6: Content marketing and blogging
Unit 7: Google Analytics — tracking and reporting
Unit 8: Affiliate marketing basics
Unit 9: Influencer marketing
Unit 10: Website design basics with WordPress
Unit 11: Conversion rate optimisation
Unit 12: Digital marketing metrics and KPIs
Final project: Create a full digital marketing campaign`,
  },
];

// ─── STAGES ────────────────────────────────────────────────────
const STAGE_INPUT    = "input";
const STAGE_LOADING  = "loading";
const STAGE_RESULTS  = "results";

export default function App() {
  const [stage,      setStage]      = useState(STAGE_INPUT);
  const [courseTitle,  setCourseTitle]  = useState("");
  const [audience,     setAudience]     = useState("");
  const [content,      setContent]      = useState("");
  const [rawOutput,    setRawOutput]    = useState("");
  const [report,       setReport]       = useState(null);
  const [activeTab,    setActiveTab]    = useState("keep");
  const [error,        setError]        = useState("");
  const [streamPreview,setStreamPreview]= useState("");
  const [uploadedFile, setUploadedFile] = useState(null);   // { fileName, fileType, text, base64, mediaType }
  const [fileLoading,  setFileLoading]  = useState(false);
  const contentRef = useRef(null);

  function loadDemo(demo) {
    setCourseTitle(demo.title);
    setAudience(demo.audience);
    setContent(demo.content);
    setUploadedFile(null);
  }

  const handleFileUpload = useCallback(async (file) => {
    setFileLoading(true);
    setError("");
    try {
      const extracted = await extractFile(file);
      setUploadedFile(extracted);
      // If text was extracted, populate the textarea so the user can review/edit
      if (extracted.text) {
        setContent(extracted.text);
      } else {
        // PDF/DOCX going to Claude — clear textarea to avoid confusion
        setContent("");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setFileLoading(false);
    }
  }, []);

  function clearFile() {
    setUploadedFile(null);
    setContent("");
  }

  async function runAnalysis() {
    if (!courseTitle.trim()) return;
    // Need either uploaded file or manual content
    const hasContent = content.trim() || (uploadedFile && uploadedFile.base64);
    if (!hasContent) return;

    setStage(STAGE_LOADING);
    setError("");
    setRawOutput("");
    setStreamPreview("");

    try {
      const fileDoc = uploadedFile?.base64
        ? { base64: uploadedFile.base64, mediaType: uploadedFile.mediaType }
        : null;

      const full = await analyseCourse(courseTitle, content, audience, (text) => {
        setRawOutput(text);
        setStreamPreview(text.slice(-200).replace(/^[^\n]*\n/, ""));
      }, fileDoc);

      const parsed = parseReport(full);
      setReport(parsed);
      setActiveTab("keep");
      setStage(STAGE_RESULTS);
    } catch (e) {
      setError(e.message);
      setStage(STAGE_INPUT);
    }
  }

  function reset() {
    setStage(STAGE_INPUT);
    setReport(null);
    setRawOutput("");
    setError("");
    setUploadedFile(null);
  }

  if (stage === STAGE_LOADING) {
    return <LoadingScreen preview={streamPreview} />;
  }

  if (stage === STAGE_RESULTS && report) {
    return (
      <ResultsScreen
        report={report}
        courseTitle={courseTitle}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={reset}
      />
    );
  }

  return (
    <InputScreen
      courseTitle={courseTitle}   setCourseTitle={setCourseTitle}
      audience={audience}         setAudience={setAudience}
      content={content}           setContent={setContent}
      onAnalyse={runAnalysis}
      onDemo={loadDemo}
      error={error}
      contentRef={contentRef}
      uploadedFile={uploadedFile}
      fileLoading={fileLoading}
      onFileUpload={handleFileUpload}
      onFileClear={clearFile}
    />
  );
}

// ─── INPUT SCREEN ───────────────────────────────────────────────

function InputScreen({ courseTitle, setCourseTitle, audience, setAudience,
                       content, setContent, onAnalyse, onDemo, error, contentRef,
                       uploadedFile, fileLoading, onFileUpload, onFileClear }) {

  const hasContent = content.trim() || (uploadedFile && uploadedFile.base64);
  const ready = courseTitle.trim() && (hasContent || fileLoading === false && uploadedFile);

  // Determine ready state properly
  const canAnalyse = courseTitle.trim() && (
    content.trim() ||
    (uploadedFile && (uploadedFile.text || uploadedFile.base64))
  );

  return (
    <div className="page-input">
      <div className="input-left">
        <div className="brand">
          <span className="brand-mark">CA</span>
          <span className="brand-name">Course Architect</span>
        </div>

        <div className="hero">
          <h1>
            Make your course<br />
            <em>more employable</em><br />
            than your competitors'
          </h1>
          <p className="hero-sub">
            Upload your course content. Our AI analyses it against
            live job market demand — telling you exactly what to keep,
            what to cut, and what to add to win more enrolments.
          </p>
        </div>

        <div className="value-props">
          {[
            ["◈", "Stay ahead", "Know what employers are hiring for before your competitors do"],
            ["◆", "Cut the waste", "Remove outdated content that makes your course look stale"],
            ["◉", "Grow enrolments", "Students choose courses that get them hired — become that course"],
          ].map(([icon, title, desc]) => (
            <div key={title} className="value-prop">
              <span className="vp-icon">{icon}</span>
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="input-right">
        <div className="input-card">
          <h2>Analyse your course</h2>

          <div className="demo-row">
            <span className="demo-label">Try a demo:</span>
            {DEMO_COURSES.map(d => (
              <button key={d.label} className="demo-chip" onClick={() => onDemo(d)}>
                {d.label}
              </button>
            ))}
          </div>

          <div className="divider" />

          <div className="field">
            <label>Course title <span className="req">*</span></label>
            <input
              value={courseTitle}
              onChange={e => setCourseTitle(e.target.value)}
              placeholder="e.g. Cybersecurity Fundamentals — 6-Week Bootcamp"
            />
          </div>

          <div className="field">
            <label>Target audience</label>
            <input
              value={audience}
              onChange={e => setAudience(e.target.value)}
              placeholder="e.g. IT professionals looking to enter cybersecurity"
            />
          </div>

          {/* ── Upload Zone ── */}
          <UploadZone
            uploadedFile={uploadedFile}
            fileLoading={fileLoading}
            onFileUpload={onFileUpload}
            onFileClear={onFileClear}
          />

          {/* ── Manual textarea — hidden when PDF/DOCX uploaded (Claude reads those) ── */}
          {(!uploadedFile || uploadedFile.text !== null) && (
            <div className="field">
              <label>
                Course content / syllabus <span className="req">*</span>
                {uploadedFile && <span className="field-note"> — extracted from file (edit if needed)</span>}
              </label>
              <textarea
                ref={contentRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={uploadedFile ? 6 : 10}
                placeholder={`Paste your syllabus, module list, or course outline here.

You can paste:
• A list of modules or topics
• Your full syllabus document
• A bullet-point outline
• Even rough notes about what you teach

The more detail you provide, the more precise the analysis.`}
              />
            </div>
          )}

          {/* When PDF/DOCX uploaded, show a note instead of the textarea */}
          {uploadedFile && uploadedFile.base64 && (
            <div className="file-ready-note">
              <span className="file-ready-icon">✓</span>
              <span>
                <strong>{uploadedFile.fileName}</strong> will be read directly by the AI — no text extraction needed.
              </span>
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}

          <button
            className={`analyse-btn ${canAnalyse ? "ready" : ""}`}
            onClick={onAnalyse}
            disabled={!canAnalyse || fileLoading}
          >
            {fileLoading
              ? "Reading file…"
              : canAnalyse
                ? "Analyse Course →"
                : "Add course title and content to begin"
            }
          </button>

          <p className="privacy-note">
            Your content is sent only to Anthropic's API and is not stored by Course Architect.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── UPLOAD ZONE ────────────────────────────────────────────────

const FILE_TYPE_LABELS = {
  pdf:  { icon: "📄", label: "PDF",        color: "#c0392b" },
  docx: { icon: "📝", label: "Word",       color: "#2563eb" },
  pptx: { icon: "📊", label: "PowerPoint", color: "#d97706" },
  txt:  { icon: "📃", label: "Text",       color: "#4a4a38" },
};

function UploadZone({ uploadedFile, fileLoading, onFileUpload, onFileClear }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileUpload(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    if (file) onFileUpload(file);
    e.target.value = ""; // allow re-uploading same file
  }

  if (uploadedFile) {
    const meta = FILE_TYPE_LABELS[uploadedFile.fileType] || { icon: "📄", label: uploadedFile.fileType, color: "#4a4a38" };
    return (
      <div className="upload-zone uploaded">
        <div className="upload-file-info">
          <span className="upload-file-icon">{meta.icon}</span>
          <div className="upload-file-details">
            <span className="upload-file-name">{uploadedFile.fileName}</span>
            <span className="upload-file-type" style={{ color: meta.color }}>{meta.label} file loaded</span>
          </div>
          <button className="upload-clear-btn" onClick={onFileClear} title="Remove file">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="field">
      <label>Upload course file <span className="field-note optional"> — optional</span></label>
      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""} ${fileLoading ? "loading" : ""}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !fileLoading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.txt"
          onChange={handleChange}
          style={{ display: "none" }}
        />
        {fileLoading ? (
          <div className="upload-loading">
            <div className="upload-spinner" />
            <span>Reading file…</span>
          </div>
        ) : (
          <div className="upload-idle">
            <div className="upload-icon">↑</div>
            <div className="upload-main-text">
              {dragOver ? "Drop file here" : "Drop a file or click to browse"}
            </div>
            <div className="upload-sub-text">PDF · Word (.docx) · PowerPoint (.pptx) · Plain text (.txt)</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LOADING SCREEN ─────────────────────────────────────────────

function LoadingScreen({ preview }) {
  return (
    <div className="page-loading">
      <div className="loading-inner">
        <div className="loading-orb" />
        <h2>Analysing your course…</h2>
        <p>Comparing against current job market demand</p>
        {preview && (
          <div className="stream-preview">
            <div className="stream-dot" />
            <span>{preview}</span>
          </div>
        )}
        <div className="loading-steps">
          {["Extracting course topics", "Scanning job market data", "Identifying gaps", "Building recommendations"].map((s, i) => (
            <div key={s} className="loading-step" style={{ animationDelay: `${i * 0.8}s` }}>
              <span className="step-dot" />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ─────────────────────────────────────────────

const TABS = [
  { id: "keep",         label: "Keep",            color: "green",  icon: "✓" },
  { id: "remove",       label: "Remove",          color: "red",    icon: "✕" },
  { id: "add",          label: "Add",             color: "amber",  icon: "+" },
  { id: "intelligence", label: "Market Summary",  color: "blue",   icon: "◎" },
];

function ResultsScreen({ report, courseTitle, activeTab, setActiveTab, onReset }) {
  const counts = {
    keep:   countItems(report.keep),
    remove: countItems(report.remove),
    add:    countItems(report.add),
  };

  const activeContent = report[activeTab];

  return (
    <div className="page-results">
      {/* Header */}
      <header className="results-header">
        <div className="results-brand">
          <span className="brand-mark small">CA</span>
          <span>Course Architect</span>
        </div>
        <div className="results-course-title">{courseTitle}</div>
        <button className="new-analysis-btn" onClick={onReset}>
          ← New analysis
        </button>
      </header>

      {/* Score strip */}
      <div className="score-strip">
        <ScorePill icon="✓" count={counts.keep}   label="topics to keep"   color="green" onClick={() => setActiveTab("keep")} />
        <div className="score-divider" />
        <ScorePill icon="✕" count={counts.remove} label="topics to remove" color="red"   onClick={() => setActiveTab("remove")} />
        <div className="score-divider" />
        <ScorePill icon="+" count={counts.add}    label="topics to add"    color="amber" onClick={() => setActiveTab("add")} />
        <div className="score-divider" />
        <button className="intelligence-pill" onClick={() => setActiveTab("intelligence")}>
          ◎ Market Summary
        </button>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab ${t.color} ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
            {counts[t.id] !== undefined && counts[t.id] > 0 && (
              <span className="tab-count">{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="results-body">
        <div className={`results-content ${activeTab}`}>
          {activeTab === "intelligence" ? (
            <div className="intelligence-panel">
              <div className="intel-icon">◎</div>
              <div className="markdown-output">
                <ReactMarkdown>{activeContent || "Market summary not available."}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="markdown-output">
              {activeContent
                ? <ReactMarkdown>{activeContent}</ReactMarkdown>
                : <p className="empty-section">No items in this section.</p>
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScorePill({ icon, count, label, color, onClick }) {
  return (
    <button className={`score-pill ${color}`} onClick={onClick}>
      <span className="pill-icon">{icon}</span>
      <span className="pill-count">{count}</span>
      <span className="pill-label">{label}</span>
    </button>
  );
}
