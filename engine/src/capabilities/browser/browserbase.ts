// Browserbase provider — cloud stealth browser. Used when Camoufox sidecar
// isn't running (e.g. constrained deploy environments). Reads a Browserbase
// API key + project id via secrets.get / platform-default fallback.
//
// Sessions live on Browserbase's side and they expose a Playwright-over-CDP
// endpoint. For the MCP surface we only need a thin REST wrapper so the
// agent can navigate / snapshot / click / screenshot — full Playwright power
// is out of scope until users ask.

import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config.js";
import { fetchSecret } from "../../tools/secrets.js";
import { logger } from "../../logger.js";
import type {
  OpenPageInput, OpenPageOutput,
  SnapshotInput, SnapshotOutput,
  ClickInput, ClickOutput,
  TypeInput, TypeOutput,
  ScreenshotInput, ScreenshotOutput,
  CloseInput, CloseOutput,
} from "./types.js";

const API_BASE = "https://www.browserbase.com/v1";

async function authHeaders(agentId: number): Promise<{ apiKey: string; projectId: string } | null> {
  const cred = await fetchSecret({ agentId, provider: "browserbase", kind: "generic" });
  if (!cred) return null;
  const apiKey = cred.fields?.api_key || cred.value;
  const projectId = cred.fields?.project_id || process.env.PLATFORM_BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return { apiKey, projectId };
}

export const BrowserbaseProvider = {
  name: "browserbase" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await authHeaders(agentId)) !== null;
  },

  async openPage(input: OpenPageInput, agentId: number): Promise<OpenPageOutput> {
    const auth = await authHeaders(agentId);
    if (!auth) throw new Error("browserbase: no credential resolved");

    // Create a session if we don't have one, then navigate.
    let sessionId = input.sessionId;
    if (!sessionId) {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: "POST",
        headers: { "X-BB-API-Key": auth.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: auth.projectId }),
      });
      if (!res.ok) throw new Error(`browserbase create session failed: ${res.status}`);
      const data = await res.json() as { id: string };
      sessionId = data.id;
    }
    // NB: Browserbase navigation happens via the CDP/Playwright connect URL,
    // not a REST navigate call. For the MVP we just create the session and
    // return the session id — the agent can use Camoufox for active control
    // until we wire CDP. Most users hit Browserbase via the Playwright SDK
    // directly; surfacing that to the agent is its own follow-up.
    logger.warn("browserbase: openPage returned session id only — full CDP navigation not yet wired");
    return { sessionId, title: undefined, finalUrl: input.url };
  },

  async snapshot(_input: SnapshotInput, _agentId: number): Promise<SnapshotOutput> {
    throw new Error("browserbase snapshot not yet implemented — use camoufox provider for now");
  },
  async click(_input: ClickInput, _agentId: number): Promise<ClickOutput> {
    throw new Error("browserbase click not yet implemented — use camoufox provider for now");
  },
  async type(_input: TypeInput, _agentId: number): Promise<TypeOutput> {
    throw new Error("browserbase type not yet implemented — use camoufox provider for now");
  },

  async screenshot(input: ScreenshotInput, agentId: number): Promise<ScreenshotOutput> {
    const auth = await authHeaders(agentId);
    if (!auth) throw new Error("browserbase: no credential resolved");

    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(input.sessionId)}/screenshot${input.fullPage ? "?fullPage=true" : ""}`, {
      headers: { "X-BB-API-Key": auth.apiKey },
    });
    if (!res.ok) throw new Error(`browserbase screenshot failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    const dir = path.join(config.dataDir, "workspace", "screenshots");
    await fs.mkdir(dir, { recursive: true });
    const filename = input.filename || `screenshot-${Date.now()}.png`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buf);

    return { filePath, bytes: buf.byteLength };
  },

  async close(input: CloseInput, agentId: number): Promise<CloseOutput> {
    const auth = await authHeaders(agentId);
    if (!auth) return { ok: false };
    const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(input.sessionId)}`, {
      method: "POST", // Browserbase: POST with { status: "REQUEST_RELEASE" } completes
      headers: { "X-BB-API-Key": auth.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REQUEST_RELEASE", projectId: auth.projectId }),
    });
    return { ok: res.ok };
  },
};
