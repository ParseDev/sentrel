// Camoufox provider — wraps the local sibling container at
// http://localhost:9377 (configurable via CAMOFOX_URL). No credential
// required; the sidecar runs on the same machine as the engine.
//
// Provider is "always available" when the env points at a reachable URL;
// we check by hitting /health on first isAvailable() per process.

import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config.js";
import { logger } from "../../logger.js";
import type {
  OpenPageInput, OpenPageOutput,
  SnapshotInput, SnapshotOutput,
  ClickInput, ClickOutput,
  TypeInput, TypeOutput,
  ScreenshotInput, ScreenshotOutput,
  CloseInput, CloseOutput,
} from "./types.js";

const BASE = process.env.CAMOFOX_URL || "http://localhost:9377";
// Camoufox keys sessions by userId so multiple agents on one box don't
// collide. We use the engine's EMPLOYEE_ID so the sidecar isolates tabs
// per agent without us having to manage that here.
const USER_ID = `agent-${config.employeeId}`;

let availabilityChecked = false;
let availabilityResult = false;

async function checkAvailable(): Promise<boolean> {
  if (availabilityChecked) return availabilityResult;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    availabilityResult = res.ok;
  } catch {
    availabilityResult = false;
  }
  availabilityChecked = true;
  if (!availabilityResult) {
    logger.warn(`Camoufox: not reachable at ${BASE} — browser_access provider will skip camoufox`);
  }
  return availabilityResult;
}

export const CamoufoxProvider = {
  name: "camoufox" as const,

  async isAvailable(_agentId: number): Promise<boolean> {
    return checkAvailable();
  },

  async openPage(input: OpenPageInput): Promise<OpenPageOutput> {
    const res = await fetch(`${BASE}/tabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, url: input.url }),
    });
    if (!res.ok) throw new Error(`camoufox openPage failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { tabId: string; title?: string; url?: string };
    return { sessionId: data.tabId, title: data.title, finalUrl: data.url };
  },

  async snapshot(input: SnapshotInput): Promise<SnapshotOutput> {
    const url = `${BASE}/tabs/${encodeURIComponent(input.sessionId)}/snapshot?userId=${encodeURIComponent(USER_ID)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`camoufox snapshot failed: ${res.status} ${await res.text()}`);
    const data = await res.json() as { snapshot: string; title?: string; url?: string };
    return data;
  },

  async click(input: ClickInput): Promise<ClickOutput> {
    const res = await fetch(`${BASE}/tabs/${encodeURIComponent(input.sessionId)}/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, ref: input.ref }),
    });
    if (!res.ok) return { ok: false, note: `${res.status} ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  },

  async type(input: TypeInput): Promise<TypeOutput> {
    const res = await fetch(`${BASE}/tabs/${encodeURIComponent(input.sessionId)}/type`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, ref: input.ref, text: input.text, submit: input.submit ?? false }),
    });
    if (!res.ok) return { ok: false };
    return { ok: true };
  },

  async screenshot(input: ScreenshotInput): Promise<ScreenshotOutput> {
    const url = `${BASE}/tabs/${encodeURIComponent(input.sessionId)}/screenshot?userId=${encodeURIComponent(USER_ID)}${input.fullPage ? "&fullPage=true" : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`camoufox screenshot failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    const dir = path.join(config.dataDir, "workspace", "screenshots");
    await fs.mkdir(dir, { recursive: true });
    const filename = input.filename || `screenshot-${Date.now()}.png`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buf);

    return { filePath, bytes: buf.byteLength };
  },

  async close(input: CloseInput): Promise<CloseOutput> {
    const res = await fetch(`${BASE}/tabs/${encodeURIComponent(input.sessionId)}?userId=${encodeURIComponent(USER_ID)}`, {
      method: "DELETE",
    });
    return { ok: res.ok };
  },
};
