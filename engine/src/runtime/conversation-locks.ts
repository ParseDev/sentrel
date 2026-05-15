import { logger } from "../logger.js";
import type { JobData } from "../types.js";

const chains = new Map<string, Promise<void>>();
const warnAfterMs = Number(process.env.ENGINE_CONVERSATION_LOCK_WARN_MS || 10_000);
const timeoutMs = Number(process.env.ENGINE_CONVERSATION_LOCK_TIMEOUT_MS || 15 * 60_000);

export function runLockKey(job: JobData): string | null {
  if (job.conversationId) return `conversation:${job.conversationId}`;
  if (job.origin?.conversationId) return `conversation:${job.origin.conversationId}`;
  if (job.channel && job.payload?.from) return `channel:${job.channel}:${job.payload.from}`;
  return null;
}

export async function withConversationRunLock<T>(
  key: string | null,
  jobId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) return fn();

  const previous = chains.get(key) ?? Promise.resolve();
  const queuedAt = Date.now();
  let warned = false;
  const warnTimer = setTimeout(() => {
    warned = true;
    logger.warn(`Conversation lock still waiting after ${warnAfterMs}ms`, { key, jobId });
  }, warnAfterMs);
  (warnTimer as { unref?: () => void }).unref?.();

  let current: Promise<void>;
  const run = previous
    .catch(() => {})
    .then(async () => {
      clearTimeout(warnTimer);
      const waitMs = Date.now() - queuedAt;
      if (warned || waitMs > 250) {
        logger.info(`Conversation lock waited ${waitMs}ms`, { key, jobId });
      }
      return withTimeout(fn(), timeoutMs, key, jobId);
    });

  current = run
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      if (chains.get(key) === current) chains.delete(key);
    });

  chains.set(key, current);
  return run;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, key: string, jobId: string | undefined): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Conversation lock execution timed out after ${ms}ms for ${key} (${jobId || "no jobId"})`));
        }, ms);
        (timeout as { unref?: () => void }).unref?.();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
