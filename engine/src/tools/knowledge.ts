// search_knowledge MCP tool — agent queries its document knowledge base.
//
// Backed by per-agent SQLite+sqlite-vec store. Hybrid search (vector + FTS
// fused with Reciprocal Rank Fusion) retrieves chunks, which include both
// the original content and the Contextual Retrieval prefix (Haiku-generated
// summary of where the chunk sits in the document).

import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { hybridSearch, listDocuments } from "../rag/store.js";
import { embedText, isEmbeddingReady } from "../integrations/tool-embeddings.js";
import { logger } from "../logger.js";

export function buildKnowledgeMcpServer(agentId: number) {
  const searchTool = tool(
    "search_knowledge",
    "Search this agent's private knowledge base — uploaded documents, " +
      "policies, product docs, research notes. Returns the most relevant " +
      "passages with source citations. " +
      "CALL THIS FIRST when the user asks about product features, pricing, " +
      "policies, company info, or anything domain-specific — before web " +
      "search or guessing. Always cite the source document in your response.",
    {
      query: z.string().describe(
        "What you're looking for. Phrase it naturally — e.g. 'what is our HIPAA compliance policy' or 'enterprise tier pricing'."
      ),
      limit: z.number().int().min(1).max(20).optional()
        .describe("Max passages to return (default 5)."),
    },
    async (args) => {
      try {
        const docs = await listDocuments(agentId);
        if (docs.length === 0) {
          return {
            content: [{
              type: "text",
              text: "No documents are indexed for this agent yet. Ask the user to upload relevant files at /agents/<id>/knowledge if they expected indexed content.",
            }],
          };
        }

        if (!isEmbeddingReady()) {
          return {
            content: [{
              type: "text",
              text: "Knowledge search is initializing (embedding model loading). Try again in a moment.",
            }],
            isError: true,
          };
        }

        const queryEmbedding = await embedText(args.query);
        if (!queryEmbedding) {
          return {
            content: [{ type: "text", text: "Failed to embed the query — try again." }],
            isError: true,
          };
        }

        const limit = args.limit ?? 5;
        const results = await hybridSearch(agentId, queryEmbedding, args.query, limit);

        if (results.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No matching passages found for "${args.query}". The knowledge base has ${docs.length} document(s): ${docs.slice(0, 5).map((d) => d.title).join(", ")}${docs.length > 5 ? "..." : ""}. Try a different query or different keywords.`,
            }],
          };
        }

        logger.info(`search_knowledge: "${args.query}" → ${results.length} results`);

        // Format results with clear source citations — agent should cite these
        const formatted = results.map((r, i) => {
          const header = `[${i + 1}] Source: "${r.document_title}" (chunk ${r.chunk_index + 1})`;
          const context = r.context ? `Context: ${r.context}` : "";
          const body = r.content;
          return [header, context, body].filter(Boolean).join("\n");
        }).join("\n\n---\n\n");

        return {
          content: [{
            type: "text",
            text: `Found ${results.length} passage(s) from the knowledge base. Cite the source document title when using this information in your response.\n\n${formatted}`,
          }],
        };
      } catch (err) {
        logger.error("search_knowledge failed", { error: (err as Error).message });
        return {
          content: [{ type: "text", text: `Search failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  return createSdkMcpServer({
    name: "knowledge",
    version: "0.1.0",
    tools: [searchTool],
  });
}
