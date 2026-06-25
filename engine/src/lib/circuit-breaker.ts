// Extra N — simple circuit breaker for external API calls.
//
// States:
//   CLOSED  — normal operation, requests pass through
//   OPEN    — too many failures, requests rejected immediately
//   HALF    — after cooldown, one probe request allowed; success → CLOSED, fail → OPEN
//
// Usage:
//   const breaker = new CircuitBreaker("nango", { failThreshold: 3, cooldownMs: 30_000 });
//   const result = await breaker.call(() => nangoApi.list());
//   // On failure: throws CircuitOpenError or the original error
//   // On open circuit: throws immediately without calling fn

import { logger } from "../logger.js";

export class CircuitOpenError extends Error {
  constructor(public name_: string) {
    super(`Circuit breaker "${name_}" is OPEN — request rejected without calling external API`);
    this.name = "CircuitOpenError";
  }
}

interface CircuitBreakerOptions {
  failThreshold?: number;   // consecutive failures before opening (default 3)
  cooldownMs?: number;       // ms to wait before half-open probe (default 30s)
  timeoutMs?: number;        // per-call abort timeout (default 5s, 0 = no timeout)
}

type State = "CLOSED" | "OPEN" | "HALF";

export class CircuitBreaker {
  private state: State = "CLOSED";
  private failures = 0;
  private lastFailure = 0;
  private failThreshold: number;
  private cooldownMs: number;
  private timeoutMs: number;

  constructor(
    private label: string,
    opts: CircuitBreakerOptions = {},
  ) {
    this.failThreshold = opts.failThreshold ?? 3;
    this.cooldownMs = opts.cooldownMs ?? 30_000;
    this.timeoutMs = opts.timeoutMs ?? 5_000;
  }

  async call<T>(fn: (signal?: AbortSignal) => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailure > this.cooldownMs) {
        this.state = "HALF";
        logger.info(`CircuitBreaker[${this.label}]: HALF-OPEN — probing`);
      } else {
        throw new CircuitOpenError(this.label);
      }
    }

    const controller = this.timeoutMs > 0 ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : null;

    try {
      const result = await fn(controller?.signal);
      if (timer) clearTimeout(timer);
      this.onSuccess();
      return result;
    } catch (err) {
      if (timer) clearTimeout(timer);
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state !== "CLOSED") {
      logger.info(`CircuitBreaker[${this.label}]: CLOSED (recovered)`);
    }
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failThreshold) {
      this.state = "OPEN";
      logger.warn(`CircuitBreaker[${this.label}]: OPEN after ${this.failures} consecutive failures`);
    }
  }

  get currentState(): State {
    return this.state;
  }
}
