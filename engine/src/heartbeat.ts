import { queue } from "./queue.js";
import { config } from "./config.js";
import type { Agent } from "./types.js";
import { logger } from "./logger.js";

export async function startHeartbeat(agent: Agent): Promise<void> {
  if (!agent.heartbeat_enabled) {
    logger.info("Heartbeat disabled for this agent");
    return;
  }

  const intervalMs = agent.heartbeat_interval_minutes * 60 * 1000;

  await queue.add(
    "heartbeat",
    {
      type: "heartbeat" as const,
      agentId: config.employeeId,
      orgId: agent.organization_id,
      payload: {
        instruction:
          "This is a heartbeat check. Review if anything needs your attention:\n" +
          "- Any unread messages or emails?\n" +
          "- Any tasks assigned to you with status 'todo'?\n" +
          "- Any scheduled follow-ups due?\n" +
          "- Any leads that have gone cold?\n" +
          "If nothing needs attention, reply: HEARTBEAT_OK",
      },
    },
    {
      repeat: { every: intervalMs },
      jobId: `heartbeat-${config.employeeId}`,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 5 },
    }
  );

  logger.info(`Heartbeat started: every ${agent.heartbeat_interval_minutes} minutes`);
}
