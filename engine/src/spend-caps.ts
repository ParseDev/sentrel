// Per-agent spend caps. Rails owns the source of truth — the engine just
// asks before each run whether it's allowed to proceed and whether it
// should post the "approaching cap" heads-up. Best-effort on network
// blip: callers fall back to running unrestricted when the check fails.

import { logger } from "./logger.js";

export interface SpendCapState {
  daily_cap_usd: number | null;
  monthly_cap_usd: number | null;
  notify_threshold_pct: number;
  notified_today: boolean;
  spend_today_usd: number;
  spend_month_usd: number;
  over_daily: boolean;
  over_monthly: boolean;
  should_notify: boolean;
}

export async function checkSpendCap(agentId: number): Promise<SpendCapState | null> {
  const rails = process.env.RAILS_INTERNAL_URL;
  const secret = process.env.ENGINE_API_SECRET;
  if (!rails || !secret) return null;
  try {
    const res = await fetch(`${rails}/api/spend_caps/check?agent_id=${agentId}`, {
      headers: { "X-Engine-Secret": secret },
      signal: AbortSignal.timeout(2_500),
    });
    if (!res.ok) return null;
    return (await res.json()) as SpendCapState;
  } catch (err) {
    logger.warn("spend cap check failed", { error: (err as Error).message });
    return null;
  }
}

export async function markSpendNotified(agentId: number): Promise<void> {
  const rails = process.env.RAILS_INTERNAL_URL;
  const secret = process.env.ENGINE_API_SECRET;
  if (!rails || !secret) return;
  try {
    await fetch(`${rails}/api/spend_caps/mark_notified?agent_id=${agentId}`, {
      method: "POST",
      headers: { "X-Engine-Secret": secret },
      signal: AbortSignal.timeout(2_500),
    });
  } catch { /* best effort */ }
}
