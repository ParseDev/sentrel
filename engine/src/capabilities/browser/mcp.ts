// Browser MCP server — exposes open_page / snapshot / click / type /
// screenshot / close to the agent. Provider routing happens behind the
// MCP boundary so swapping camoufox ↔ browserbase requires no agent-side
// changes.
//
// Sessions: providers issue their own opaque session ids. The agent
// passes that id back in subsequent calls. No engine-side session table.

import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../../logger.js";
import { getActiveBrowserProvider } from "./registry.js";
import type { Agent } from "../../types.js";

export function buildBrowserMcpServer(agent: Agent) {
  // Resolves the active provider per-call. Cheap (cached in registry +
  // cheap fetchSecret) and means rotating providers mid-session works as
  // soon as the agent's capability config flips.
  async function provider() {
    return getActiveBrowserProvider(agent);
  }

  const openPage = tool(
    "open_page",
    "Open a URL in a stealth browser session. Returns a session_id you reuse for subsequent calls. " +
      "Use this for pages that block automated access (LinkedIn, etc.) or interactive workflows.",
    {
      url: z.string().describe("Fully-qualified URL to open."),
      session_id: z.string().optional().describe("Reuse an existing session id to keep cookies + tab state."),
    },
    async (args) => {
      try {
        const p = await provider();
        const out = await p.openPage({ url: args.url, sessionId: args.session_id }, agent.id);
        return {
          content: [{
            type: "text" as const,
            text: `session_id: ${out.sessionId}\ntitle: ${out.title ?? "—"}\nurl: ${out.finalUrl ?? args.url}\n(provider: ${p.name})`,
          }],
        };
      } catch (err) {
        return errorResult("open_page", err);
      }
    },
  );

  const snapshot = tool(
    "snapshot",
    "Read the current page as a compact accessibility-style snapshot. Includes element refs (e1, e2, …) for clicking and typing — much smaller than raw HTML.",
    {
      session_id: z.string().describe("Session id returned by open_page."),
    },
    async (args) => {
      try {
        const p = await provider();
        const out = await p.snapshot({ sessionId: args.session_id }, agent.id);
        return {
          content: [{
            type: "text" as const,
            text: `title: ${out.title ?? "—"}\nurl: ${out.url ?? "—"}\n\n${out.snapshot}`,
          }],
        };
      } catch (err) {
        return errorResult("snapshot", err);
      }
    },
  );

  const click = tool(
    "click",
    "Click an element by its ref (e.g. 'e5') from the latest snapshot.",
    {
      session_id: z.string(),
      ref: z.string().describe("Element ref from a recent snapshot (e1, e2, …)."),
    },
    async (args) => {
      try {
        const p = await provider();
        const out = await p.click({ sessionId: args.session_id, ref: args.ref }, agent.id);
        return { content: [{ type: "text" as const, text: out.ok ? "ok" : `click failed: ${out.note ?? "unknown"}` }], isError: !out.ok };
      } catch (err) {
        return errorResult("click", err);
      }
    },
  );

  const typeIn = tool(
    "type",
    "Type text into an input/textarea by its ref. Set submit=true to press Enter after typing.",
    {
      session_id: z.string(),
      ref: z.string(),
      text: z.string(),
      submit: z.boolean().optional().describe("Press Enter after typing (default false)."),
    },
    async (args) => {
      try {
        const p = await provider();
        const out = await p.type({ sessionId: args.session_id, ref: args.ref, text: args.text, submit: args.submit }, agent.id);
        return { content: [{ type: "text" as const, text: out.ok ? "ok" : "type failed" }], isError: !out.ok };
      } catch (err) {
        return errorResult("type", err);
      }
    },
  );

  const screenshot = tool(
    "screenshot",
    "Take a screenshot of the current page and save it under /data/workspace/screenshots/. Returns the file path you can pass to send_image.",
    {
      session_id: z.string(),
      filename: z.string().optional().describe("Filename inside workspace/screenshots/. Defaults to a timestamped name."),
      full_page: z.boolean().optional().describe("Capture the full scrollable page (default: viewport only)."),
    },
    async (args) => {
      try {
        const p = await provider();
        const out = await p.screenshot(
          { sessionId: args.session_id, filename: args.filename, fullPage: args.full_page },
          agent.id,
        );
        return {
          content: [{
            type: "text" as const,
            text: `Saved ${out.bytes}B → ${out.filePath}\nPass this path to send_image to deliver it to the user.`,
          }],
        };
      } catch (err) {
        return errorResult("screenshot", err);
      }
    },
  );

  const close = tool(
    "close",
    "Close a browser session. Free memory when you're done with a tab.",
    { session_id: z.string() },
    async (args) => {
      try {
        const p = await provider();
        const out = await p.close({ sessionId: args.session_id }, agent.id);
        return { content: [{ type: "text" as const, text: out.ok ? "closed" : "already closed" }] };
      } catch (err) {
        return errorResult("close", err);
      }
    },
  );

  return createSdkMcpServer({
    name: "browser",
    version: "1.0.0",
    tools: [openPage, snapshot, click, typeIn, screenshot, close],
  });
}

function errorResult(op: string, err: unknown) {
  const msg = (err as Error).message ?? String(err);
  logger.warn(`browser.${op} failed`, { error: msg });
  return { content: [{ type: "text" as const, text: `browser.${op} failed: ${msg}` }], isError: true };
}
