// Local embedding model — used by RAG ingestion and knowledge search.
//
// Loads all-MiniLM-L6-v2 via @huggingface/transformers (runs in Node, no API,
// free). Text gets embedded into 384-dim vectors for hybrid semantic search
// over the agent/org knowledge base.

import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { logger } from "../logger.js";

// Point the JS transformers library at the image-baked model cache. The
// Dockerfile pre-downloads Xenova/all-MiniLM-L6-v2 into /opt/hf-cache so
// first boot is instant and doesn't hit the Bun streaming-fs hang we saw
// on Fly (transformers.js leaves half-written config.json.tmp.* files and
// never recovers). /opt is in the image, not on /data, so Fly's volume
// mount doesn't shadow it.
env.cacheDir = "/opt/hf-cache";
env.allowLocalModels = true;
env.allowRemoteModels = false; // image is authoritative; never hit the network

let embedder: FeatureExtractionPipeline | null = null;
let initialized = false;

// Initialize the embedding model. Called once on engine startup. Model
// downloads on first run (~25MB), then cached locally by HuggingFace.
export async function initToolEmbeddings(): Promise<void> {
  try {
    logger.info("Embeddings: loading model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });
    initialized = true;
    logger.info("Embeddings: model ready");
  } catch (err) {
    logger.error("Embeddings: failed to initialize", { error: (err as Error).message });
    // Non-fatal: knowledge search/ingest gracefully degrade when not ready.
  }
}

// Check if embeddings are ready (for graceful degradation)
export function isEmbeddingReady(): boolean {
  return initialized;
}

// Embed arbitrary text into a normalized vector (used by RAG ingest + search).
export async function embedText(text: string): Promise<number[] | null> {
  return embed(text);
}

async function embed(text: string): Promise<number[] | null> {
  if (!embedder) return null;
  try {
    const output = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(output.data as Float32Array);
  } catch {
    return null;
  }
}
