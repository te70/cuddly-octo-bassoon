// ─────────────────────────────────────────────────────────────────
//  Course Architect · File Extractor
//
//  Accepts uploaded files (PDF, DOCX, PPTX, TXT) and returns
//  either:
//    { text: "...", base64: null, mediaType: null }   → plain text
//    { text: null, base64: "...", mediaType: "..." }  → doc for Claude
//
//  PDF  → sent to Claude as a base64 document (Claude reads it)
//  DOCX → sent to Claude as a base64 document (Claude reads it)
//  PPTX → extracted via pizzip XML parsing in the browser
//  TXT  → read directly as text
// ─────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
};

export const ACCEPT_STRING = ".pdf,.docx,.pptx,.txt";

export function getFileType(file) {
  // Try MIME type first, then fall back to extension
  if (ACCEPTED_TYPES[file.type]) return ACCEPTED_TYPES[file.type];
  const ext = file.name.split(".").pop().toLowerCase();
  if (["pdf", "docx", "pptx", "txt"].includes(ext)) return ext;
  return null;
}

// ─── Read file as ArrayBuffer ─────────────────────────────────────
function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Read file as base64 ──────────────────────────────────────────
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]); // strip data:...;base64,
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Read file as text ────────────────────────────────────────────
function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ─── Extract text from PPTX (zip of XML) ─────────────────────────
async function extractPptxText(file) {
  // Dynamic import to keep bundle lean
  const PizZip = (await import("pizzip")).default;
  const buffer = await readAsArrayBuffer(file);
  const zip = new PizZip(buffer);

  const slideTexts = [];

  // PPTX slides live at ppt/slides/slide1.xml, slide2.xml, ...
  const slideKeys = Object.keys(zip.files)
    .filter(k => k.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)[1]);
      const numB = parseInt(b.match(/slide(\d+)/)[1]);
      return numA - numB;
    });

  for (const key of slideKeys) {
    const xml = zip.files[key].asText();
    // Strip XML tags and collapse whitespace
    const text = xml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) slideTexts.push(text);
  }

  return slideTexts.join("\n\n");
}

// ─── Extract text from DOCX (zip of XML) ─────────────────────────
async function extractDocxText(file) {
  const PizZip = (await import("pizzip")).default;
  const buffer = await readAsArrayBuffer(file);
  const zip = new PizZip(buffer);

  const wordDoc = zip.files["word/document.xml"];
  if (!wordDoc) throw new Error("Could not find document.xml in this DOCX file.");

  const xml = wordDoc.asText();

  // Extract paragraph text preserving line breaks at </w:p> boundaries
  const text = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

// ─────────────────────────────────────────────────────────────────
//  extractFile()  — the main export
//
//  Returns:
//    {
//      text: string | null,
//      base64: string | null,
//      mediaType: string | null,
//      fileName: string,
//      fileType: string,
//    }
// ─────────────────────────────────────────────────────────────────
export async function extractFile(file) {
  const fileType = getFileType(file);

  if (!fileType) {
    throw new Error(`Unsupported file type. Please upload a PDF, Word (.docx), PowerPoint (.pptx), or plain text (.txt) file.`);
  }

  switch (fileType) {
    case "pdf": {
      // Send to Claude as a native document — it reads PDF natively
      const base64 = await readAsBase64(file);
      return {
        text:      null,
        base64,
        mediaType: "application/pdf",
        fileName:  file.name,
        fileType,
      };
    }

    case "docx": {
      // Try client-side XML extraction first (fast, no API call needed)
      try {
        const text = await extractDocxText(file);
        if (text && text.length > 50) {
          return { text, base64: null, mediaType: null, fileName: file.name, fileType };
        }
      } catch (_) {
        // Fall back to sending to Claude as a document
      }
      // Fallback: send as base64 document to Claude
      const base64 = await readAsBase64(file);
      return {
        text:      null,
        base64,
        mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileName:  file.name,
        fileType,
      };
    }

    case "pptx": {
      const text = await extractPptxText(file);
      if (!text || text.length < 20) {
        throw new Error("Could not extract text from this PowerPoint file. Try copying the content to a text file.");
      }
      return { text, base64: null, mediaType: null, fileName: file.name, fileType };
    }

    case "txt": {
      const text = await readAsText(file);
      return { text, base64: null, mediaType: null, fileName: file.name, fileType };
    }

    default:
      throw new Error("Unsupported file type.");
  }
}
