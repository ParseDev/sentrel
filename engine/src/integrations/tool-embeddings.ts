// Embedding-based tool routing — replaces regex keyword matching.
//
// Pre-embeds toolkit descriptions on startup using a local model
// (all-MiniLM-L6-v2 via @huggingface/transformers — runs in Node, no API,
// free). The LLM calls search_integrations({ query }) and we return the
// top-K matching toolkits by cosine similarity.
//
// This is the LangGraph BigTool / VoltAgent pattern: the LLM decides WHEN
// to search, and formulates the query itself based on conversation context.

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { logger } from "../logger.js";

// Toolkit descriptions — one entry per integration we support.
// These are what get embedded. Keep descriptions action-oriented so they
// match natural language queries ("create a spreadsheet" ↔ "create sheets").
const TOOLKIT_DESCRIPTIONS: Record<string, string> = {
  googlesheets: "Create, edit, and manage Google Sheets spreadsheets. Batch update cells, import CSV data, read spreadsheet contents, create new workbooks.",
  googlecalendar: "Manage Google Calendar events. Create meetings, check availability, schedule appointments, send invites, list upcoming events.",
  googledrive: "Upload, download, and manage files on Google Drive. Create folders, share documents, search files, organize storage.",
  googledocs: "Create and edit Google Docs documents. Write content, format text, collaborate on documents.",
  gmail: "Send and receive emails via Gmail. Compose messages, create drafts, search inbox, reply to threads, manage labels.",
  github: "Manage GitHub repositories. Create issues, list repos, open pull requests, review code, manage branches, add comments.",
  slack: "Send messages in Slack channels and DMs. Post updates, reply to threads, search messages, manage channels.",
  vercel: "Deploy websites and applications to Vercel. Create deployments, manage domains, list projects, check deployment status.",
  apollo: "Find business contacts and leads. Search people by company, title, or industry. Enrich contacts with email and phone data. Prospect outreach.",
  hubspot: "Manage HubSpot CRM contacts, deals, and pipelines. Create records, update deal stages, track sales activity.",
  stripe: "Process payments with Stripe. Create charges, manage subscriptions, issue refunds, generate invoices, handle billing.",
  linear: "Manage Linear project issues and tickets. Create tasks, update status, assign to team members, track sprints and cycles.",
  notion: "Create and manage Notion pages and databases. Write wiki content, organize knowledge base, query databases.",
  discord: "Send messages in Discord servers and channels. Post updates, manage roles, interact with community.",
  zoom: "Schedule and manage Zoom meetings. Create meeting links, list upcoming calls, manage participants.",
  twitter: "Post tweets on Twitter/X. Search tweets, manage timeline, engage with followers.",
  linkedin: "Manage LinkedIn connections and posts. Send connection requests, post updates, search professionals.",
  trello: "Manage Trello boards and cards. Create tasks, move cards between lists, organize kanban boards.",
  asana: "Manage Asana tasks and projects. Create work items, assign tasks, track project progress.",
  jira: "Manage Jira issues and projects. Create tickets, update status, track sprints, manage backlogs.",
  googlemeet: "Create and manage Google Meet video calls. Generate meeting links, schedule calls.",
  dropbox: "Store and share files on Dropbox. Upload documents, create shared links, manage folders.",
  onedrive: "Store and manage files on OneDrive. Upload, download, share documents and folders.",
  airtable: "Manage Airtable bases and records. Create tables, query data, update records, build views.",
  zendesk: "Manage Zendesk support tickets. Create tickets, reply to customers, track resolution, manage queues.",
};

let embedder: FeatureExtractionPipeline | null = null;
let toolkitEmbeddings: Map<string, number[]> = new Map();
let initialized = false;

// Initialize the embedding model and pre-compute toolkit embeddings.
// Called once on engine startup. Model downloads on first run (~25MB),
// then cached locally by HuggingFace.
export async function initToolEmbeddings(): Promise<void> {
  try {
    logger.info("Tool embeddings: loading model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      dtype: "fp32",
    });

    // Pre-embed all toolkit descriptions
    for (const [slug, desc] of Object.entries(TOOLKIT_DESCRIPTIONS)) {
      const embedding = await embed(`${slug}: ${desc}`);
      if (embedding) toolkitEmbeddings.set(slug, embedding);
    }

    initialized = true;
    logger.info(`Tool embeddings: ${toolkitEmbeddings.size} toolkits indexed`);
  } catch (err) {
    logger.error("Tool embeddings: failed to initialize", { error: (err as Error).message });
    // Non-fatal: Layer 1 (audit log) and Layer 3 (Composio search) still work
  }
}

// Search for matching toolkits by semantic similarity.
// Returns toolkit slugs sorted by relevance, filtered by what the org has connected.
export async function searchToolkits(
  query: string,
  availableToolkits: string[],
  topK = 3,
  threshold = 0.3,
): Promise<string[]> {
  if (!initialized || !embedder) return [];

  const queryEmbedding = await embed(query);
  if (!queryEmbedding) return [];

  const available = new Set(availableToolkits);
  const scores: Array<{ slug: string; score: number }> = [];

  for (const [slug, toolkitEmb] of toolkitEmbeddings) {
    if (!available.has(slug)) continue;
    const score = cosineSimilarity(queryEmbedding, toolkitEmb);
    if (score >= threshold) {
      scores.push({ slug, score });
    }
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.slug);
}

// Check if embeddings are ready (for graceful degradation)
export function isEmbeddingReady(): boolean {
  return initialized;
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

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
