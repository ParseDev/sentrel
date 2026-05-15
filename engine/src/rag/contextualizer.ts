// Anthropic Contextual Retrieval (Sept 2024 paper).
//
// Before embedding each chunk, prepend a 50-100 token Haiku-generated
// context explaining where the chunk sits in the document. This yields
// 35-49% reduction in retrieval failure rate per Anthropic's benchmarks —
// the single highest-ROI RAG technique from 2024.
//
// With prompt caching, cost is ~$1 per million tokens of source documents.
// We cache the full document text as the shared prefix; each chunk call
// reuses the cache so we only pay once for the doc regardless of chunks.

import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "../config.js";
import { logger } from "../logger.js";

const HAIKU_MODEL = process.env.CONTEXTUAL_RETRIEVAL_MODEL || "claude-haiku-4-5-20251001";

// Keep context generation concurrent but bounded so we don't hammer the API
const CONCURRENCY = 4;

export async function contextualizeChunks(
  fullDocument: string,
  chunks: string[],
): Promise<string[]> {
  if (chunks.length === 0) return [];

  const contexts: string[] = new Array(chunks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < chunks.length) {
      const i = cursor++;
      if (i >= chunks.length) break;
      try {
        contexts[i] = await contextualizeOne(fullDocument, chunks[i]!);
      } catch (err) {
        logger.warn(`contextualize chunk ${i} failed`, { error: (err as Error).message });
        contexts[i] = ""; // fall back to no context
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
  return contexts;
}

async function contextualizeOne(fullDocument: string, chunk: string): Promise<string> {
  const prompt =
    `<document>\n${fullDocument}\n</document>\n\n` +
    `Here is a chunk from that document:\n<chunk>\n${chunk}\n</chunk>\n\n` +
    `Write a short (1-2 sentences, under 80 tokens) context that explains where this chunk sits in the document and what it's about, so the chunk can be retrieved accurately by search. Do NOT quote the chunk back. Just return the context, nothing else.`;

  const options: Record<string, unknown> = {
    cwd: config.dataDir,
    systemPrompt:
      "You write ultra-brief context descriptions for document chunks to improve search retrieval. Output only the context — no preamble, no quotes, no meta-commentary.",
    allowedTools: [],
    permissionMode: "bypassPermissions",
    model: HAIKU_MODEL,
  };

  let text = "";
  for await (const message of query({ prompt, options: options as any })) {
    const msg = message as any;
    if (msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === "text" && block.text) text = block.text;
      }
    }
    if (msg.result) text = msg.result;
  }
  return text.trim();
}
