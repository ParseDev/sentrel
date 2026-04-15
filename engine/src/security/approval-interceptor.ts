// Phase S — Approval interceptor for dangerous tool calls
//
// Hooks into the agent-runner's tool call stream. When a Bash command
// matches a dangerous pattern, creates a PendingApproval and pauses
// execution until the user approves via Telegram buttons or web UI.
//
// Four approval levels:
//   Allow Once  — execute this one command, don't remember
//   Session     — allow this pattern for the rest of the conversation
//   Always      — permanently add to agent's command_allowlist (DB)
//   Deny        — block execution, agent gets an error message

import { scanCommand, type CommandRisk } from "./command-scanner.js";
import { host } from "../host/index.js";
import { logger } from "../logger.js";
import type { Agent } from "../types.js";

// In-memory session-scoped approvals (cleared when engine restarts or conversation rotates)
const sessionApprovals = new Map<number, Set<string>>(); // conversationId → set of approved patterns

export interface ApprovalDecision {
  level: "once" | "session" | "always" | "deny";
  command: string;
  risk: CommandRisk;
}

// Check if a Bash command needs approval.
// Returns the risk if approval is needed, null if safe to proceed.
export function checkCommand(
  agent: Agent,
  command: string,
  conversationId?: number,
): CommandRisk | null {
  // Off mode — skip all checks (for sandboxed environments)
  if (agent.approval_mode === "off") return null;

  // Check agent's permanent allowlist
  const risk = scanCommand(command, agent.command_allowlist || []);
  if (!risk) return null;

  // Check session-scoped approvals for this conversation
  if (conversationId) {
    const sessionSet = sessionApprovals.get(conversationId);
    if (sessionSet?.has(risk.category)) {
      logger.info(`Command allowed by session approval: ${risk.category}`);
      return null;
    }
  }

  return risk;
}

// Record an approval decision
export async function recordApproval(
  agent: Agent,
  decision: ApprovalDecision,
  conversationId?: number,
): Promise<void> {
  switch (decision.level) {
    case "once":
      // Nothing to store — one-time pass
      logger.info(`Command approved once: ${decision.risk.category}`);
      break;

    case "session":
      // Store in memory for this conversation
      if (conversationId) {
        if (!sessionApprovals.has(conversationId)) {
          sessionApprovals.set(conversationId, new Set());
        }
        sessionApprovals.get(conversationId)!.add(decision.risk.category);
        logger.info(`Command approved for session: ${decision.risk.category} (conv ${conversationId})`);
      }
      break;

    case "always":
      // Add to agent's permanent allowlist in DB
      const currentList = agent.command_allowlist || [];
      if (!currentList.includes(decision.risk.category)) {
        const newList = [...currentList, decision.risk.category];
        await host.updateAgentCommandAllowlist(agent.id, newList);
        agent.command_allowlist = newList; // Update in-memory too
        logger.info(`Command permanently allowed: ${decision.risk.category} (agent ${agent.id})`);
      }
      break;

    case "deny":
      logger.info(`Command denied: ${decision.risk.category}`);
      break;
  }
}

// Clear session approvals for a conversation (called on rotation)
export function clearSessionApprovals(conversationId: number): void {
  sessionApprovals.delete(conversationId);
}
