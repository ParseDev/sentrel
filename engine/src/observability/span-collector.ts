// Observability — capture timing/cost/meta for every agent run.
//
// Used by agent-runner to record what happened during a query. The full
// span list is persisted to audit_logs.spans and rendered as a waterfall
// in the Rails /ops dashboard. Matches OpenTelemetry-style start/end timing
// so we can export to Jaeger/Honeycomb later if we want.
//
// Usage:
//   const spans = new SpanCollector();
//   const token = spans.start("tool_use", { name: "WebSearch" });
//   // ... do work ...
//   spans.end(token, { ok: true });
//   // At end: spans.serialize() → save to audit_logs.spans

export interface Span {
  id: number;
  name: string;
  start_ms: number;   // ms since run start
  end_ms: number | null;
  duration_ms: number | null;
  meta: Record<string, unknown>;
  parent_id: number | null;
}

export class SpanCollector {
  private readonly t0: number;
  private readonly spans: Span[] = [];
  private nextId = 1;
  private stack: number[] = []; // for parent-child relationships

  constructor() {
    this.t0 = Date.now();
  }

  start(name: string, meta: Record<string, unknown> = {}): number {
    const id = this.nextId++;
    const parent = this.stack[this.stack.length - 1] ?? null;
    this.spans.push({
      id,
      name,
      start_ms: Date.now() - this.t0,
      end_ms: null,
      duration_ms: null,
      meta: { ...meta },
      parent_id: parent,
    });
    this.stack.push(id);
    return id;
  }

  end(id: number, extraMeta: Record<string, unknown> = {}): void {
    const span = this.spans.find((s) => s.id === id);
    if (!span) return;
    span.end_ms = Date.now() - this.t0;
    span.duration_ms = span.end_ms - span.start_ms;
    span.meta = { ...span.meta, ...extraMeta };
    // Pop from stack if this is the top; otherwise caller used nested spans out of order
    const top = this.stack[this.stack.length - 1];
    if (top === id) this.stack.pop();
  }

  // One-shot event (zero duration) — for things like "emit_done" or errors
  event(name: string, meta: Record<string, unknown> = {}): void {
    const id = this.nextId++;
    const parent = this.stack[this.stack.length - 1] ?? null;
    const now = Date.now() - this.t0;
    this.spans.push({
      id,
      name,
      start_ms: now,
      end_ms: now,
      duration_ms: 0,
      meta: { ...meta },
      parent_id: parent,
    });
  }

  // Close any open spans (defensive — called at run end)
  finalize(): void {
    const now = Date.now() - this.t0;
    for (const s of this.spans) {
      if (s.end_ms === null) {
        s.end_ms = now;
        s.duration_ms = s.end_ms - s.start_ms;
        s.meta = { ...s.meta, unclosed: true };
      }
    }
    this.stack = [];
  }

  serialize(): Span[] {
    return this.spans;
  }

  // Total run duration in ms from t0 to now
  totalMs(): number {
    return Date.now() - this.t0;
  }

  // Time to first assistant event (first "text" or "tool_use" span)
  firstTokenMs(): number | null {
    const first = this.spans.find((s) =>
      s.name === "text_delta" || s.name === "text_block" || s.name.startsWith("tool_use:")
    );
    return first ? first.start_ms : null;
  }
}

// Pricing per million tokens (Claude Sonnet 4 as of 2026-04).
// Update as models/prices change.
const PRICING: Record<string, { input: number; output: number; cache_read: number; cache_write: number }> = {
  "claude-fable-5": { input: 5.0, output: 25.0, cache_read: 0.50, cache_write: 6.25 },
  "claude-opus-4-8": { input: 5.0, output: 25.0, cache_read: 0.50, cache_write: 6.25 },
  "claude-opus-4-7": { input: 5.0, output: 25.0, cache_read: 0.50, cache_write: 6.25 },
  "claude-opus-4-6": { input: 5.0, output: 25.0, cache_read: 0.50, cache_write: 6.25 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cache_read: 0.30, cache_write: 3.75 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0, cache_read: 0.30, cache_write: 3.75 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0, cache_read: 0.10, cache_write: 1.25 },
  // Fallback to Sonnet 4 pricing for unknown models
  default: { input: 3.0, output: 15.0, cache_read: 0.30, cache_write: 3.75 },
};

export function computeCostUSD(
  modelId: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number,
): number {
  const p = PRICING[modelId || "default"] ?? PRICING.default!;
  return (
    (inputTokens * p.input) +
    (outputTokens * p.output) +
    (cacheReadTokens * p.cache_read) +
    (cacheCreationTokens * p.cache_write)
  ) / 1_000_000;
}
