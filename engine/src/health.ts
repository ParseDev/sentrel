import { redis } from "./queue.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

let jobsProcessed = 0;
const startTime = Date.now();

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
    } catch (err) {
      logger.error("Health report failed", { error: (err as Error).message });
    }
  };

  // Report immediately, then every 60s
  report();
  setInterval(report, 60_000);
  logger.info("Health reporter started");
}
