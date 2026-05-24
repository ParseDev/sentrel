// Browser provider registry. Preference order: Camoufox (free local
// sidecar) → Browserbase (paid cloud).
//
// `agent.capabilities.browser_access.provider = "auto"` walks the list
// and picks the first one whose `isAvailable()` returns true. Setting a
// specific provider locks the agent to that one and surfaces a clear
// NoCredentialError when its key/sidecar is missing.

import { CamoufoxProvider } from "./camoufox.js";
import { BrowserbaseProvider } from "./browserbase.js";
import { resolveCapabilities } from "../../capabilities.js";
import type { Agent } from "../../types.js";

type BrowserProvider = typeof CamoufoxProvider | typeof BrowserbaseProvider;

const REGISTRY: ReadonlyArray<BrowserProvider> = [CamoufoxProvider, BrowserbaseProvider];

export async function getActiveBrowserProvider(agent: Agent): Promise<BrowserProvider> {
  const cap = resolveCapabilities(agent).browser_access;
  const desired = cap.provider || "auto";

  if (desired !== "auto") {
    const explicit = REGISTRY.find((p) => p.name === desired);
    if (!explicit) throw new Error(`browser provider "${desired}" not registered`);
    if (!(await explicit.isAvailable(agent.id))) {
      throw new Error(`browser provider "${desired}" unavailable — check sidecar (camoufox) or credential (browserbase)`);
    }
    return explicit;
  }

  for (const p of REGISTRY) {
    if (await p.isAvailable(agent.id)) return p;
  }
  throw new Error("no browser provider available — Camoufox sidecar isn't reachable and no Browserbase credential is configured");
}

export const BROWSER_REGISTRY = REGISTRY;
