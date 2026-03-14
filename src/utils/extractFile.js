// ─────────────────────────────────────────────────────────────────
//  Course Architect · File Extraction Utility
//
//  Accepts PDF, DOCX, PPTX, TXT and returns extracted text.
//
//  Strategy:
//    PDF   → Claude document API (handles scanned + text PDFs)
//    DOCX  → mammoth.js (client-side, no API call needed)
//    PPTX  → Claude document API (most reliable cross-browser)
//    TXT   → FileReader (direct)
// ─────────────────────────────────────────────────────────────────

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL   = "claude-sonnet-4-20250514";

const ACCEPTED_TYPES = {
  "application/pdf":                                                         "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
};

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt"];
export const ACCEPTED_MIME = Object.keys(ACCEPTED_TYPES).join(",");

// ── Helpers ───────────────────────────────────────────────────────

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]); // strip data:...;base64,
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ── Claude document extraction (PDF + PPTX) ───────────────────────

async function extractViaClaude(file, mimeType) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error("API key not set. Add REACT_APP_ANTHROPIC_API_KEY to your .env file.");
  }

  const base64 = await readAsBase64(file);

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
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extract ALL course/syllabus content from this document. 
Return ONLY the extracted text — the course title, modules, topics, units, learning objectives, assessments, and any other course content you find.
Do NOT summarise. Do NOT add commentary. Do NOT add formatting that wasn't there.
Just return the raw extracted course content as plain text, preserving the original structure as closely as possible.`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  if (!text.trim()) throw new Error("No text could be extracted from this file.");
  return text.trim();
}

// ── DOCX via mammoth ──────────────────────────────────────────────

async function extractDocx(file) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  if (!result.value.trim()) throw new Error("No text found in this Word document.");
  return result.value.trim();
}

// ── Main entry point ──────────────────────────────────────────────

export async function extractFileContent(file) {
  if (!file) throw new Error("No file provided.");

  // Detect type by MIME or extension fallback
  let type = ACCEPTED_TYPES[file.type];
  if (!type) {
    const ext = file.name.split(".").pop().toLowerCase();
    type = ext; // "pdf", "docx", "pptx", "txt"
  }

  switch (type) {
    case "txt":
      return await readAsText(file);

    case "docx":
      return await extractDocx(file);

    case "pdf":
      return await extractViaClaude(file, "application/pdf");

    case "pptx":
      return await extractViaClaude(
        file,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

    default:
      throw new Error(`Unsupported file type. Please upload a PDF, Word (.docx), PowerPoint (.pptx), or plain text file.`);
  }
}

export function getFileTypeLabel(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  return ext.toUpperCase();
}
