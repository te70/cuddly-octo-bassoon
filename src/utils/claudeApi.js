// ─────────────────────────────────────────────────────────────
//  Career Architect · Claude API Integration
//  All system prompts and API call helpers live here.
//  Set REACT_APP_ANTHROPIC_API_KEY in your .env file.
// ─────────────────────────────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(systemPrompt, userMessage, onChunk) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API error");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const text = parsed.delta?.text || "";
        if (text) {
          fullText += text;
          onChunk(fullText);
        }
      } catch (_) {}
    }
  }
  return fullText;
}

// ─────────────────────────────────────────────────────────────
//  STUDENT: Socratic AI Coach
// ─────────────────────────────────────────────────────────────
export const SOCRATIC_SYSTEM = `You are Career Architect's Socratic AI coach for university students in Africa pursuing careers in technology and business.

Your core method: NEVER give direct answers. Always guide through questioning.

Rules:
- Respond with 1-2 probing questions that push the student to reason further
- Acknowledge what they said in ONE sentence first
- After 3+ exchanges, offer a brief "Consider this framework:" hint (still not the answer)
- Keep responses under 120 words total
- Tone: warm, intellectually challenging, encouraging
- If student asks about career topics (interview prep, resume, job search), pivot to practical reflection questions

Format every response exactly as:
[One-sentence acknowledgment.]

**Think about this:**
1. [Question one]
2. [Question two]

[Optional: "Consider: [one-line hint]" — only after 3+ exchanges]`;

export async function socratesChat(conversationHistory, onChunk) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      stream: true,
      system: SOCRATIC_SYSTEM,
      messages: conversationHistory,
    }),
  });

  if (!response.ok) throw new Error("API error");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const text = parsed.delta?.text || "";
        if (text) { fullText += text; onChunk(fullText); }
      } catch (_) {}
    }
  }
  return fullText;
}

// ─────────────────────────────────────────────────────────────
//  STUDENT: Portfolio Generator
// ─────────────────────────────────────────────────────────────
const PORTFOLIO_SYSTEM = `You are Career Architect's portfolio generation engine.

Given an assignment title and description, produce THREE professional outputs.

---

OUTPUT 1 — GITHUB README (use markdown formatting)
# [Project Title — action verb + domain]
## Overview
[2-3 sentence project description, professional tone]
## Tech Stack
\`[Technology 1]\` \`[Technology 2]\` \`[Technology 3]\`
## What I Built
[3 bullet points of specific technical achievements]
## Key Outcomes
[2-3 bullet points with metrics where possible, e.g. "Reduced X by Y%"]
## Skills Demonstrated
[5-6 relevant keywords for ATS/recruiter scanning]

---

OUTPUT 2 — LINKEDIN PROJECT SUMMARY
[Strong opening hook sentence]
[2-3 sentences on what was built and the technical approach]
[1 sentence on the business/real-world value]
Key outcome: [specific measurable result or skill demonstrated]
#hashtag1 #hashtag2 #hashtag3

---

OUTPUT 3 — RESUME BULLET POINTS
• [Action verb] + [technology] + [quantified outcome] (ATS-optimised, 1 line)
• [Action verb] + [technology] + [quantified outcome] (ATS-optimised, 1 line)
• [Action verb] + [technology] + [quantified outcome] (ATS-optimised, 1 line)

---

Use only the information provided. If no metrics are available, use phrases like "improving reliability", "enabling automation", "reducing manual effort". 
Target roles: SOC Analyst, Cloud Engineer, DevSecOps, Software Engineer, Data Analyst.`;

export async function generatePortfolio(title, description, onChunk) {
  return callClaude(
    PORTFOLIO_SYSTEM,
    `Assignment Title: ${title}\n\nAssignment Description:\n${description}`,
    onChunk
  );
}

// ─────────────────────────────────────────────────────────────
//  LECTURER: Curriculum Gap Analyser
// ─────────────────────────────────────────────────────────────
const CURRICULUM_SYSTEM = `You are Career Architect's curriculum intelligence engine for African universities.

Given a course name and curriculum/syllabus content, produce a structured analysis in this EXACT format:

## Skill Gap Analysis

**Market Alignment Score: [0-100]/100**
[One sentence explaining the score]

## Current Topics: Market Relevance

| Topic | Relevance | Market Demand |
|-------|-----------|---------------|
[For each topic mentioned, one row: topic name | High/Medium/Low | one-phrase demand note]

## Missing High-Demand Skills

For each missing skill (identify 4-6):
### [Skill Name]
**Why it matters:** [1 sentence — market context]
**Gap severity:** High/Medium

## Recommended Labs

For each recommendation (provide 4-5):
### Lab [N]: [Lab Title]
**Duration:** [time estimate]
**Tools:** [list tools]
**What students will do:** [2-sentence practical description]
**Industry connection:** [real company/scenario that uses this]

## Suggested Case Studies

For each case study (provide 3):
### [Case Study Title]
**Scenario:** [2-sentence real or realistic African/global business scenario]
**Learning objective:** [1 sentence]
**Discussion questions:**
- [Question 1]
- [Question 2]`;

export async function analyseCurriculum(courseName, curriculumText, onChunk) {
  return callClaude(
    CURRICULUM_SYSTEM,
    `Course Name: ${courseName}\n\nCurriculum/Syllabus:\n${curriculumText}`,
    onChunk
  );
}

// ─────────────────────────────────────────────────────────────
//  CAREER COACH: Student Readiness Scorer
// ─────────────────────────────────────────────────────────────
const READINESS_SYSTEM = `You are Career Architect's career readiness scoring engine.

Given student information (name, course, year, skills, and assignments), produce a JSON object ONLY — no surrounding text, no markdown fences.

The JSON must follow this exact schema:
{
  "readiness_score": <integer 0-100>,
  "readiness_label": "<one of: Emerging | Developing | Job-Ready | Exceptional>",
  "summary": "<2-sentence honest assessment>",
  "job_matches": [
    {"role": "<job title>", "match_pct": <integer>, "gap": "<1 key missing skill>"},
    {"role": "<job title>", "match_pct": <integer>, "gap": "<1 key missing skill>"},
    {"role": "<job title>", "match_pct": <integer>, "gap": "<1 key missing skill>"},
    {"role": "<job title>", "match_pct": <integer>, "gap": "<1 key missing skill>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "portfolio_readiness": <integer 0-100>,
  "portfolio_label": "<one of: Not Started | In Progress | Solid | Strong>",
  "next_action": "<single most impactful next step, 1 sentence>"
}`;

export async function scoreStudent(studentData) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 800,
      system: READINESS_SYSTEM,
      messages: [{
        role: "user",
        content: `Student Name: ${studentData.name}
Course: ${studentData.course}
Year: ${studentData.year}
Skills: ${studentData.skills}
Completed Assignments: ${studentData.assignments}
Portfolio Items: ${studentData.portfolioItems}`
      }],
    }),
  });

  if (!response.ok) throw new Error("API error");
  const data = await response.json();
  const text = data.content[0].text;
  return JSON.parse(text);
}
