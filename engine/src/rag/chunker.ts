// Recursive character text splitter — LangChain-style but smaller.
//
// Research (2025 consensus):
// - Chunk size 512-1024 tokens is sweet spot.
// - We use ~900 chars (roughly ~225 tokens for English) — a bit below the
//   floor so chunks stay focused.
// - Overlap 150 chars (~17%) — 10-15% is fine; don't overthink.
// - Split on: paragraphs → sentences → words → chars. Preserves boundaries.

const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_OVERLAP = 150;
const SEPARATORS = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "];

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = opts.overlap ?? DEFAULT_OVERLAP;
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const rawChunks = recursiveSplit(clean, chunkSize, SEPARATORS);
  // Apply overlap by prepending the tail of the previous chunk
  const withOverlap: string[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const current = rawChunks[i]!;
    if (i === 0) {
      withOverlap.push(current);
      continue;
    }
    const prev = rawChunks[i - 1]!;
    const tail = prev.slice(Math.max(0, prev.length - overlap));
    withOverlap.push(`${tail}${current}`);
  }
  return withOverlap;
}

function recursiveSplit(text: string, chunkSize: number, seps: string[]): string[] {
  if (text.length <= chunkSize) return [text];

  // Pick the biggest separator that exists in the text
  const sep = seps.find((s) => text.includes(s)) ?? "";
  if (!sep) {
    // No separator left — hard chop by size
    const result: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      result.push(text.slice(i, i + chunkSize));
    }
    return result;
  }

  const parts = text.split(sep);
  const chunks: string[] = [];
  let buffer = "";

  for (const part of parts) {
    const candidate = buffer ? `${buffer}${sep}${part}` : part;
    if (candidate.length <= chunkSize) {
      buffer = candidate;
      continue;
    }
    // Flush buffer if it has content
    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }
    // If the part itself is bigger than chunkSize, recurse with finer separators
    if (part.length > chunkSize) {
      const finer = seps.slice(seps.indexOf(sep) + 1);
      chunks.push(...recursiveSplit(part, chunkSize, finer));
    } else {
      buffer = part;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.filter((c) => c.trim().length > 0);
}

// Deterministic hash of content — used to skip re-indexing unchanged docs
export function hashContent(content: string): string {
  // Simple FNV-1a hash — fast, no deps, enough for content-change detection
  let h = 2166136261;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
