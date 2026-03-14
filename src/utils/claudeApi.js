// ─────────────────────────────────────────────────────────────────
//  Course Architect · Claude API Integration
//
//  One focused function: analyse course content against
//  current job market demand and return structured intelligence.
//
//  Set REACT_APP_ANTHROPIC_API_KEY in your .env file.
// ─────────────────────────────────────────────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-20250514";

// ─────────────────────────────────────────────────────────────────
//  SYSTEM PROMPT
//
//  This is the heart of the product. Claude acts as a senior
//  curriculum strategist who knows the current job market deeply.
//  The output drives the entire UI — three clear action panels.
// ─────────────────────────────────────────────────────────────────

const EDUCATOR_SYSTEM = `You are Course Architect's senior curriculum intelligence engine.

Your role: help educators who run short courses, masterclasses, and training programmes stay ahead of competitors by making their content precisely aligned with what employers are currently hiring for.

You will receive a course title and its content/syllabus. Your job is to analyse it against current job market demand and produce a structured report in the EXACT format below.

The educator's business goal is: more students enrol because graduates get jobs → the course pays for itself → the educator beats competitors whose content is stale.

---

Produce your report in this EXACT format with these EXACT section headers:

## KEEP

These are topics in the course that are directly relevant to current job demand. Include:
- Topics that appear in active job postings
- Foundational concepts that are prerequisite knowledge for in-demand skills (even if not explicitly in job ads)
- Anything that gives graduates a genuine competitive edge

For each item:
### [Topic Name]
**Why it stays:** [1-2 sentences — specific market reason, mention real tools/roles/companies where relevant]
**Job roles that value this:** [comma-separated list of 2-4 roles]

---

## REMOVE

These are topics that should be cut because they are:
- No longer used in industry
- Replaced by better tools/methods
- Too outdated to be worth the teaching time
- Generic filler with no job market value

Do NOT mark something for removal just because it is foundational — only remove if it is genuinely obsolete or irrelevant. Be specific and honest.

For each item:
### [Topic Name]
**Why it goes:** [1-2 sentences — be specific about what replaced it or why it's obsolete]
**What replaced it:** [the modern equivalent, if applicable]

---

## ADD

These are high-demand topics NOT currently in the course that employers are actively hiring for in this field. Prioritise:
- Skills appearing in large numbers of current job postings
- Emerging technologies with fast-growing demand
- Tools that have become industry standard in the last 2 years
- Topics that differentiate a graduate from self-taught candidates

For each item:
### [Topic Name]
**Why add it:** [1-2 sentences — market demand evidence, specific job titles or companies]
**Suggested placement:** [where in the course this fits best]
**Difficulty to add:** Low / Medium / High
**Sample exercise:** [one concrete hands-on exercise or project idea, 1-2 sentences]

---

## MARKET INTELLIGENCE

Provide a brief strategic summary (3-4 sentences) for the educator:
- Overall market alignment score: X/100
- The single biggest competitive advantage they can gain
- One trend they must address urgently
- Honest assessment of where their course stands vs. the market

---

Be specific. Name real tools, real companies, real job titles. Never be vague.
If the course content is thin or unclear, make reasonable inferences based on the course title and what you know about that field, then note what you assumed.`;

// ─────────────────────────────────────────────────────────────────
//  analyseCourse()
//
//  Streams the analysis back token by token.
//  onChunk(text) is called with the growing full text each time.
//  Returns the complete text when done.
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
//  analyseCourse()
//
//  courseContent  — plain text syllabus (manual input / TXT / PPTX)
//  fileDoc        — { base64, mediaType } for PDF/DOCX, or null
//  Streams the analysis back token by token.
//  onChunk(text) is called with the growing full text each time.
//  Returns the complete text when done.
// ─────────────────────────────────────────────────────────────────

export async function analyseCourse(courseTitle, courseContent, targetAudience, onChunk, fileDoc = null) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("API key not set. Add REACT_APP_ANTHROPIC_API_KEY to your .env file.");
  }

  // Build user message content — either text or document block
  let messageContent;

  if (fileDoc && fileDoc.base64) {
    // PDF or DOCX sent as a native document — Claude reads it directly
    messageContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: fileDoc.mediaType,
          data: fileDoc.base64,
        },
      },
      {
        type: "text",
        text: `Course Title: ${courseTitle}
Target Audience: ${targetAudience || "Professionals looking to upskill"}

The course content is in the document above. Please analyse it and produce the full curriculum intelligence report.`,
      },
    ];
  } else {
    // Plain text (manual input, TXT file, PPTX extracted text)
    messageContent = `Course Title: ${courseTitle}

Target Audience: ${targetAudience || "Professionals looking to upskill"}

Course Content / Syllabus:
${courseContent}`;
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      stream: true,
      system: EDUCATOR_SYSTEM,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  // Stream tokens as they arrive
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const chunk  = parsed.delta?.text || "";
        if (chunk) {
          fullText += chunk;
          onChunk(fullText);
        }
      } catch (_) {}
    }
  }

  return fullText;
}

// ─────────────────────────────────────────────────────────────────
//  parseReport()
//
//  Splits the raw markdown into the four named sections.
//  Returns { keep, remove, add, intelligence } as markdown strings.
// ─────────────────────────────────────────────────────────────────

export function parseReport(text) {
  const section = (name, next) => {
    const pattern = new RegExp(`## ${name}([\\s\\S]*?)(?=## ${next}|$)`, "i");
    const match   = text.match(pattern);
    return match ? match[1].trim() : "";
  };

  return {
    keep:         section("KEEP",                "REMOVE"),
    remove:       section("REMOVE",              "ADD"),
    add:          section("ADD",                 "MARKET INTELLIGENCE"),
    intelligence: section("MARKET INTELLIGENCE", "XXXXXX"),
  };
}

// ─────────────────────────────────────────────────────────────────
//  countItems()
//
//  Counts ### headings in a section — used to show
//  "12 topics to keep", "4 to remove", "8 to add" in the UI.
// ─────────────────────────────────────────────────────────────────

export function countItems(sectionText) {
  if (!sectionText) return 0;
  return (sectionText.match(/^###\s/gm) || []).length;
}
