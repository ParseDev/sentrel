// Canonical "what services can the user connect" list. Source of truth is the
// integration broker's catalog, proxied by Rails at /api/integrations/supported,
// so adding a new integration server-side makes it usable here automatically —
// no code change needed.
//
// Boot fetch + 30-min refresh. If the fetch fails (Rails down, broker API down,
// network blip), we keep the previous cache; on first-boot failure we fall back
// to a small hardcoded set so the agent can still operate.

import { logger } from "../logger.js";

export interface SupportedIntegration {
  slug: string;
  label: string;
}

const FALLBACK: SupportedIntegration[] = [
  { slug: "apollo",         label: "Apollo" },
  { slug: "googlesheets",   label: "Google Sheets" },
  { slug: "gmail",          label: "Gmail" },
  { slug: "linkedin",       label: "LinkedIn" },
  { slug: "hubspot",        label: "HubSpot" },
  { slug: "slack",          label: "Slack" },
  { slug: "notion",         label: "Notion" },
];

let cache: SupportedIntegration[] = [];
let lastFetchOk = 0;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let cachedOrgId: number | null = null;

async function resolveOrgId(): Promise<number | null> {
  if (cachedOrgId) return cachedOrgId;
  const employeeId = process.env.EMPLOYEE_ID;
  if (!employeeId) return null;
  try {
    const { host } = await import("../host/index.js");
    const agent = await host.getAgent(employeeId);
    cachedOrgId = agent.organization_id;
    return cachedOrgId;
  } catch (err) {
    logger.warn("supported integrations: couldn't resolve org_id", { error: (err as Error).message });
    return null;
  }
}

export function getSupportedIntegrations(): SupportedIntegration[] {
  return cache.length > 0 ? cache : FALLBACK;
}

export function getSupportedSlugs(): string[] {
  return getSupportedIntegrations().map((i) => i.slug);
}

export function getSupportedLabel(slug: string): string | null {
  const found = getSupportedIntegrations().find((i) => i.slug === slug.toLowerCase());
  return found?.label ?? null;
}

export async function startSupportedIntegrationsCache(): Promise<void> {
  await refresh();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    refresh().catch((err) => logger.warn("Supported integrations refresh failed", { error: (err as Error).message }));
  }, 30 * 60 * 1000);
  refreshTimer.unref?.();
}

export function stopSupportedIntegrationsCache(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function refresh(): Promise<void> {
  const railsUrl = process.env.RAILS_INTERNAL_URL;
  const secret = process.env.ENGINE_API_SECRET;
  // The agent's org_id is needed because the catalog is org-scoped.
  // Read from EMPLOYEE_ID-resolved agent on first refresh, then cache.
  const orgId = await resolveOrgId();
  if (!railsUrl || !secret || !orgId) {
    if (cache.length === 0) {
      logger.warn("Missing RAILS_INTERNAL_URL / ENGINE_API_SECRET / org_id — using fallback supported integrations");
      cache = [...FALLBACK];
    }
    return;
  }
  try {
    const res = await fetch(`${railsUrl}/api/integrations/supported?organization_id=${orgId}`, {
      headers: { "X-Engine-Secret": secret, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Rails ${res.status}`);
    const data = await res.json() as { items?: SupportedIntegration[] };
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length > 0) {
      cache = items;
      lastFetchOk = Date.now();
      logger.info(`Supported integrations refreshed: ${items.length} services (${items.slice(0, 6).map((i) => i.slug).join(", ")}${items.length > 6 ? ", …" : ""})`);
    } else if (cache.length === 0) {
      logger.warn("Supported integrations: empty list returned, using fallback");
      cache = [...FALLBACK];
    }
  } catch (err) {
    if (cache.length === 0) {
      logger.warn(`Supported integrations: first-boot fetch failed (${(err as Error).message}), using fallback`);
      cache = [...FALLBACK];
    } else {
      logger.warn(`Supported integrations: refresh failed, keeping last cache from ${new Date(lastFetchOk).toISOString()}`);
    }
  }
}
