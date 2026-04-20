// search_integrations MCP tool — the LLM calls this when it needs to find
// which connected integrations can help with a task. Uses local embeddings
// for semantic search (no API call, ~5ms).
//
// This is Layer 2 of the tool routing cascade:
//   Layer 1: Audit log tool history (automatic, pre-query)
//   Layer 2: This tool (LLM-driven, on-demand)
//   Layer 3: COMPOSIO_SEARCH_TOOLS (Composio API fallback)

import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { searchToolkits, isEmbeddingReady } from "../integrations/tool-embeddings.js";
import { getActiveToolkits } from "../integrations/composio.js";
import { logger } from "../logger.js";

export function buildIntegrationSearchMcpServer(orgId: number) {
  const searchTool = tool(
    "search_integrations",
    "Search for connected app integrations that can help with a task. " +
      "Call this when you need to interact with an external service like " +
      "Google Sheets, Gmail, Slack, GitHub, etc. Returns matching integrations " +
      "that are connected and ready to use. Once you find the right integration, " +
      "its tools will be available for you to call directly.",
    {
      query: z.string().describe(
        "Describe what you need to do — e.g. 'create a spreadsheet', " +
        "'find a contact email', 'deploy a website', 'send a slack message'"
      ),
    },
    async (args) => {
      try {
        const available = await getActiveToolkits(orgId);

        if (!isEmbeddingReady()) {
          // Graceful degradation: list all connected toolkits
          return {
            content: [{
              type: "text",
              text: `Embedding search not ready. Connected integrations: ${available.join(", ") || "none"}. Try calling the specific toolkit tools directly.`,
            }],
          };
        }

        const matches = await searchToolkits(args.query, available);

        if (matches.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No matching integrations found for "${args.query}". Connected: ${available.join(", ") || "none"}. You can try calling COMPOSIO_SEARCH_TOOLS for a broader search.`,
            }],
          };
        }

        logger.info(`search_integrations: "${args.query}" → ${matches.join(", ")}`);

        return {
          content: [{
            type: "text",
            text: `Found ${matches.length} matching integration(s): ${matches.join(", ")}.\n\n` +
              `These tools are loaded and ready. Look for tool names prefixed with the integration name ` +
              `(e.g. GOOGLESHEETS_*, APOLLO_*, GITHUB_*). Call them directly.`,
          }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Search failed: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  return createSdkMcpServer({
    name: "integrations",
    version: "0.1.0",
    tools: [searchTool],
  });
}
