import { query, startup } from "@anthropic-ai/claude-agent-sdk";
import type { Options, Query, SDKUserMessage, WarmQuery } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../logger.js";

type PromptInput = string | AsyncIterable<SDKUserMessage>;

type WarmSlot = {
  handle: WarmQuery;
  createdAt: number;
};

const enabled = process.env.ENGINE_SDK_PREWARM === "true";
const trafficWindowMs = Number(process.env.ENGINE_PREWARM_TRAFFIC_WINDOW_MS || 10 * 60_000);
const burstWindowMs = Number(process.env.ENGINE_PREWARM_BURST_WINDOW_MS || 60_000);
const maxSlotAgeMs = Number(process.env.ENGINE_PREWARM_SLOT_MAX_AGE_MS || 2 * 60_000);
const minSlots = Math.max(0, Number(process.env.ENGINE_PREWARM_POOL_MIN || 1));
const maxSlots = Math.max(minSlots, Number(process.env.ENGINE_PREWARM_POOL_MAX || 2));
const initializeTimeoutMs = Number(process.env.ENGINE_PREWARM_INIT_TIMEOUT_MS || 45_000);

// Memory/cost model:
// - WarmQuery is a pre-spawned Claude SDK subprocess, so every slot holds real
//   process RSS. Keep maxSlots low until prod RSS is measured.
// - The pool only fills after recent traffic and prunes after maxSlotAgeMs /
//   trafficWindowMs, preserving Fly scale-to-zero behavior when idle.
// - Defaults intentionally bias toward one short-lived slot, not a permanently
//   hot agent.
const slots = new Map<string, WarmSlot[]>();
const inflight = new Map<string, number>();
const lastTrafficAt = new Map<string, number>();
const optionsByKey = new Map<string, Options>();

export async function createSdkQuery(
  prompt: PromptInput,
  options: Options,
  warmKey?: string | null,
): Promise<{ query: Query; warmed: boolean }> {
  if (!enabled || !warmKey) {
    return { query: query({ prompt, options }), warmed: false };
  }

  touchWarmKey(warmKey, options);
  const pool = slots.get(warmKey) ?? [];
  const slot = pool.shift();
  if (pool.length === 0) slots.delete(warmKey);

  if (slot) {
    scheduleRefill(warmKey);
    return { query: slot.handle.query(prompt), warmed: true };
  }

  scheduleRefill(warmKey);
  return { query: query({ prompt, options }), warmed: false };
}

export function touchWarmKey(key: string, options: Options): void {
  if (!enabled) return;
  lastTrafficAt.set(key, Date.now());
  optionsByKey.set(key, options);
  scheduleRefill(key);
}

export function drainWarmQueryPool(keyPrefix?: string): void {
  for (const key of [...slots.keys()]) {
    if (keyPrefix && !key.startsWith(keyPrefix)) continue;
    const pool = slots.get(key) ?? [];
    for (const slot of pool) safeClose(slot.handle, key);
    slots.delete(key);
  }

  for (const key of [...optionsByKey.keys()]) {
    if (!keyPrefix || key.startsWith(keyPrefix)) optionsByKey.delete(key);
  }
  for (const key of [...lastTrafficAt.keys()]) {
    if (!keyPrefix || key.startsWith(keyPrefix)) lastTrafficAt.delete(key);
  }
}

function scheduleRefill(key: string): void {
  if (!enabled) return;
  const options = optionsByKey.get(key);
  if (!options) return;
  if (!hasRecentTraffic(key)) return;

  const pool = slots.get(key) ?? [];
  const pending = inflight.get(key) ?? 0;
  const target = targetSlots(key);
  const missing = target - pool.length - pending;
  if (missing <= 0) return;

  for (let i = 0; i < missing; i++) {
    inflight.set(key, (inflight.get(key) ?? 0) + 1);
    void startup({ options, initializeTimeoutMs })
      .then((handle) => {
        if (!hasRecentTraffic(key)) {
          safeClose(handle, key);
          return;
        }
        const current = slots.get(key) ?? [];
        if (current.length >= maxSlots) {
          safeClose(handle, key);
          return;
        }
        current.push({ handle, createdAt: Date.now() });
        slots.set(key, current);
        logger.info(`WarmQuery pool ready: ${key} (${current.length}/${maxSlots})`);
      })
      .catch((err) => {
        logger.warn("WarmQuery prewarm failed", { key, error: (err as Error).message });
      })
      .finally(() => {
        const next = Math.max(0, (inflight.get(key) ?? 1) - 1);
        if (next === 0) inflight.delete(key);
        else inflight.set(key, next);
      });
  }
}

function hasRecentTraffic(key: string): boolean {
  const last = lastTrafficAt.get(key);
  return Boolean(last && Date.now() - last <= trafficWindowMs);
}

function targetSlots(key: string): number {
  const last = lastTrafficAt.get(key);
  if (!last) return 0;
  return Date.now() - last <= burstWindowMs ? maxSlots : minSlots;
}

function pruneWarmPool(): void {
  if (!enabled) return;
  const now = Date.now();
  for (const [key, pool] of slots) {
    const keep: WarmSlot[] = [];
    const recent = hasRecentTraffic(key);
    for (const slot of pool) {
      if (!recent || now - slot.createdAt > maxSlotAgeMs) {
        safeClose(slot.handle, key);
      } else {
        keep.push(slot);
      }
    }
    if (keep.length > 0) slots.set(key, keep);
    else slots.delete(key);
  }
}

function safeClose(handle: WarmQuery, key: string): void {
  try {
    handle.close();
  } catch (err) {
    logger.warn("WarmQuery close failed", { key, error: (err as Error).message });
  }
}

if (enabled) {
  const interval = setInterval(pruneWarmPool, 60_000);
  (interval as { unref?: () => void }).unref?.();
}
