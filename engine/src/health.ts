import { redis } from "./queue.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

let jobsProcessed = 0;
const startTime = Date.now();
let lastRailsHeartbeatWarnAt = 0;

export function incrementJobCount(): void {
  jobsProcessed++;
}

export function startHealthReporter(): void {
  const report = async () => {
    try {
      await redis.set(
        `health:${config.employeeId}`,
        JSON.stringify({
          timestamp: Date.now(),
          status: "alive",
          jobsProcessed,
          uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        }),
        "EX",
        120
      );
      await reportRailsHeartbeat();
    } catch (err) {
      logger.error("Health report failed", { error: (err as Error).message });
    }
  };

  // Report immediately, then every 60s
  report();
  setInterval(report, 60_000);
  logger.info("Health reporter started");
}

async function reportRailsHeartbeat(): Promise<void> {
  const rails = process.env.RAILS_INTERNAL_URL;
  const secret = process.env.ENGINE_API_SECRET;
  if (!rails || !secret) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const res = await fetch(`${rails}/api/agent_instances/ready`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Engine-Secret": secret,
      },
      body: JSON.stringify({
        employee_id: Number(config.employeeId),
        public_ip: process.env.FLY_PRIVATE_IP || null,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Rails heartbeat HTTP ${res.status}`);
  } catch (err) {
    const now = Date.now();
    if (now - lastRailsHeartbeatWarnAt > 60_000) {
      lastRailsHeartbeatWarnAt = now;
      logger.warn("Rails heartbeat failed", { error: (err as Error).message });
    }
  } finally {
    clearTimeout(timeout);
  }
}
