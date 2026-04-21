// Extract plain text from uploaded document bytes. Dispatched by content
// type + extension. Runs entirely in the engine so the standalone CLI path
// doesn't need Ruby/Rails for ingestion.
//
// Supported:
//   .pdf         → pdf-parse
//   .docx        → mammoth
//   .md/.txt     → utf-8 decode
//   .html/.htm   → strip tags
//
// Everything else: best-effort utf-8 decode.

import { logger } from "../logger.js";

export interface ExtractedDocument {
  text: string;
  sourceType: "pdf" | "markdown" | "text" | "url" | "html";
}

export async function extractFromBytes(
  bytes: Buffer,
  filename: string,
  contentType?: string,
): Promise<ExtractedDocument> {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const ct = (contentType || "").toLowerCase();

  // PDF
  if (ext === "pdf" || ct.includes("pdf")) {
    return { text: await extractPdf(bytes), sourceType: "pdf" };
  }

  // DOCX (and other office openxml — mammoth handles .docx specifically)
  if (ext === "docx" || ct.includes("wordprocessingml")) {
    return { text: await extractDocx(bytes), sourceType: "text" };
  }

  // HTML
  if (ext === "html" || ext === "htm" || ct.includes("html")) {
    return { text: stripHtml(bytes.toString("utf-8")), sourceType: "html" };
  }

  // Markdown / text / anything else — decode as utf-8
  if (ext === "md" || ext === "markdown") {
    return { text: bytes.toString("utf-8"), sourceType: "markdown" };
  }

  return { text: bytes.toString("utf-8"), sourceType: "text" };
}

async function extractPdf(bytes: Buffer): Promise<string> {
  try {
    const mod = await import("pdf-parse");
    // pdf-parse's esm index exports named helpers (pdf, PDFParse, etc.).
    // The default parse function is either `mod.default` (CJS interop) or
    // `mod.pdf` (ESM named export) — try default first, fall back to pdf.
    const fn: any = (mod as any).default ?? (mod as any).pdf ?? mod;
    const result = await fn(bytes);
    return String(result?.text || "");
  } catch (err) {
    logger.error("PDF extraction failed", { error: (err as Error).message });
    throw new Error(`Could not extract PDF text: ${(err as Error).message}`);
  }
}

async function extractDocx(bytes: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await (mammoth as any).extractRawText({ buffer: bytes });
    return String(result?.value || "");
  } catch (err) {
    logger.error("DOCX extraction failed", { error: (err as Error).message });
    throw new Error(`Could not extract DOCX text: ${(err as Error).message}`);
  }
}

function stripHtml(html: string): string {
  // Drop script/style blocks entirely
  const noScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  // Strip remaining tags, decode common entities, collapse whitespace
  return noScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
