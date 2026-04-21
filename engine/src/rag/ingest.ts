// Ingest pipeline: extract → chunk → contextualize → embed → store.
//
// Same pipeline for Rails-uploaded docs and future standalone CLI ingestion.
// The caller does text extraction (PDF/URL/etc.) and passes raw text here.

import { chunkText, hashContent } from "./chunker.js";
import { contextualizeChunks } from "./contextualizer.js";
import { embedText, isEmbeddingReady } from "../integrations/tool-embeddings.js";
import * as store from "./store.js";
import { host } from "../host/index.js";
import { logger } from "../logger.js";

export interface IngestInput {
  agentId: number;
  title: string;
  sourceType: store.RagDocument["source_type"];
  sourceUrl?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
  /** Whether to run Contextual Retrieval (Haiku prefix per chunk). Default true. */
  contextualize?: boolean;
}

export interface IngestResult {
  documentId: number;
  chunkCount: number;
  contentHash: string;
  skipped: boolean; // true if the content hash already existed
  durationMs: number;
}

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const start = Date.now();
  const { agentId, title, sourceType, sourceUrl, content, metadata, contextualize = true } = input;

  if (!isEmbeddingReady()) {
    throw new Error("Embedding model not ready — cannot ingest documents yet");
  }

  const contentHash = hashContent(content);

  // Idempotent: if this exact content was already ingested, skip
  const existingDocs = await store.listDocuments(agentId);
  const already = existingDocs.find((d) => d.content_hash === contentHash);
  if (already) {
    return {
      documentId: already.id,
      chunkCount: already.chunk_count,
      contentHash,
      skipped: true,
      durationMs: Date.now() - start,
    };
  }

  // Track whether this is the very first document for this agent —
  // on success we flip the knowledge_base capability on automatically.
  const wasFirstDocument = existingDocs.length === 0;

  // Chunk
  const chunks = chunkText(content);
  logger.info(`RAG ingest: ${title} → ${chunks.length} chunks`);

  // Create the document record first (so chunks can reference it)
  const documentId = await store.upsertDocument(agentId, {
    title, source_type: sourceType, source_url: sourceUrl ?? null,
    content_hash: contentHash, metadata,
  });

  // Contextual Retrieval (Haiku prefix per chunk)
  const contexts = contextualize
    ? await contextualizeChunks(content, chunks)
    : chunks.map(() => "");

  // Embed chunks (embed the contextualized version: context + content)
  const chunkRecords: Parameters<typeof store.insertChunks>[2] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const context = contexts[i] || "";
    const embeddingInput = context ? `${context}\n\n${chunk}` : chunk;
    const embedding = await embedText(embeddingInput);
    if (!embedding) {
      logger.warn(`RAG ingest: failed to embed chunk ${i}, skipping`);
      continue;
    }
    chunkRecords.push({
      chunk_index: i,
      content: chunk,
      context,
      embedding,
      metadata: {},
    });
  }

  await store.insertChunks(agentId, documentId, chunkRecords);

  // First doc? Auto-enable the knowledge_base capability so the agent
  // starts using RAG on the next turn without a manual config flip.
  if (wasFirstDocument) {
    try {
      const flipped = await host.enableCapability(agentId, "knowledge_base");
      if (flipped) {
        logger.info(`RAG: auto-enabled knowledge_base capability for agent ${agentId} (first document ingested)`);
      }
    } catch (err) {
      logger.warn(`RAG: failed to auto-enable knowledge_base for agent ${agentId}`, { error: (err as Error).message });
    }
  }

  const durationMs = Date.now() - start;
  logger.info(`RAG ingest complete: ${title} (${chunkRecords.length} chunks, ${durationMs}ms)`);

  return {
    documentId,
    chunkCount: chunkRecords.length,
    contentHash,
    skipped: false,
    durationMs,
  };
}
