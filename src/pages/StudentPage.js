import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { socratesChat, generatePortfolio } from "../utils/claudeApi";

const TABS = ["AI Coach", "Portfolio Generator"];

export default function StudentPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="page">
      <div className="page-header">
        <h2>Student Dashboard</h2>
        <p>Develop your thinking. Build your portfolio.</p>
      </div>
      <div className="tab-bar">
        {TABS.map((t, i) => (
          <button key={i} className={`tab-btn ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 ? <SocraticCoach /> : <PortfolioGen />}
    </div>
  );
}

// ── SOCRATIC COACH ──────────────────────────────────────────────
function SocraticCoach() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome. I'm your Career Architect coach — and I won't be giving you answers.\n\n**Think about this:**\n1. What career challenge or technical topic do you want to work through today?\n2. What do you already know about it, and where does your thinking get stuck?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    setStreaming("");
    try {
      const apiHistory = newHistory.map((m) => ({ role: m.role, content: m.content }));
      let final = "";
      await socratesChat(apiHistory, (text) => {
        setStreaming(text);
        final = text;
      });
      setMessages([...newHistory, { role: "assistant", content: final }]);
      setStreaming("");
    } catch (e) {
      setMessages([...newHistory, { role: "assistant", content: `Error: ${e.message}` }]);
    }
    setLoading(false);
  }

  return (
    <div className="coach-container">
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="msg-avatar">{m.role === "assistant" ? "CA" : "You"}</div>
            <div className="msg-bubble">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {streaming && (
          <div className="chat-msg assistant streaming">
            <div className="msg-avatar">CA</div>
            <div className="msg-bubble">
              <ReactMarkdown>{streaming}</ReactMarkdown>
              <span className="cursor-blink" />
            </div>
          </div>
        )}
        {loading && !streaming && (
          <div className="chat-msg assistant">
            <div className="msg-avatar">CA</div>
            <div className="msg-bubble thinking">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Share your thinking or ask a question…"
          rows={2}
          disabled={loading}
        />
        <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
          {loading ? "…" : "→"}
        </button>
      </div>
      <div className="starter-chips">
        {[
          "How do I design a zero-trust architecture?",
          "I don't know how to prepare for a technical interview",
          "What skills do I need to become a SOC analyst?",
        ].map((s) => (
          <button key={s} className="chip" onClick={() => setInput(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PORTFOLIO GENERATOR ─────────────────────────────────────────
function PortfolioGen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  async function generate() {
    if (!title.trim() || !description.trim() || loading) return;
    setLoading(true);
    setOutput("");
    setActiveSection(0);
    try {
      await generatePortfolio(title, description, (text) => setOutput(text));
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  // Split output into three sections
  const sections = output ? parseOutputSections(output) : [];

  return (
    <div className="portfolio-container">
      <div className="input-panel">
        <div className="field-group">
          <label className="field-label">Assignment title</label>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cloud Security Lab — IAM & S3 Audit"
          />
        </div>
        <div className="field-group">
          <label className="field-label">Assignment description</label>
          <textarea
            className="field-input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you did, what technologies you used, what you built or analysed…"
          />
        </div>
        <button className="action-btn" onClick={generate} disabled={loading || !title || !description}>
          {loading ? "Generating…" : "Generate Portfolio Outputs"}
        </button>
      </div>

      {(output || loading) && (
        <div className="output-panel">
          <div className="output-tabs">
            {["GitHub README", "LinkedIn Summary", "Resume Bullets"].map((t, i) => (
              <button
                key={i}
                className={`output-tab ${activeSection === i ? "active" : ""}`}
                onClick={() => setActiveSection(i)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="output-content">
            {loading && sections.length === 0 ? (
              <div className="generating-state">
                <div className="spinner" />
                <p>Generating your portfolio outputs…</p>
              </div>
            ) : sections[activeSection] ? (
              <div className="markdown-output">
                <ReactMarkdown>{sections[activeSection]}</ReactMarkdown>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(sections[activeSection])}
                >
                  Copy
                </button>
              </div>
            ) : (
              <div className="generating-state">
                <div className="spinner" />
                <p>Building section…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function parseOutputSections(text) {
  // Split on OUTPUT 1, OUTPUT 2, OUTPUT 3 markers
  const parts = text.split(/OUTPUT\s+\d\s*[—–-]/i);
  if (parts.length >= 4) return [parts[1].trim(), parts[2].trim(), parts[3].trim()];
  // Fallback: split on horizontal rules or double newlines between big blocks
  const blocks = text.split(/\n---+\n/);
  if (blocks.length >= 3) return [blocks[0].trim(), blocks[1].trim(), blocks[2].trim()];
  return [text, "", ""];
}
