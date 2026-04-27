// Generic approval workflow MCP tool. Agents call request_approval before
// any user-visible irreversible action (publish post, send email batch,
// spend > $X, delete record). Pauses the turn until the user clicks a
// button on the channel they're on (Telegram inline keyboard, web
// approval card).
//
// Companion to security/action-approval.ts which holds the Promise map.
//
// Channel rendering: Telegram inline keyboard for now (web cards land in
// a follow-up). Renderers per payload_type live in channels/telegram.ts.

import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { host } from "../host/index.js";
import { logger } from "../logger.js";
import { createActionApproval } from "../security/action-approval.js";
import { emitActionApproval } from "../gateway.js";
import type { Origin } from "../channels/origin-delivery.js";

const PAYLOAD_TYPES = [
  "linkedin_post",
  "tweet",
  "email_draft",
  "cold_email_bulk",
  "spend_request",
  "external_share",
  "destructive_action",
  "generic",
] as const;

const RISK_TIERS = ["low", "medium", "high"] as const;

interface ApprovalsContext {
  agentId: number;
  orgId: number;
  origin?: Origin;
}

export function buildApprovalsMcpServer(ctx: ApprovalsContext) {
  const requestApprovalTool = tool(
    "request_approval",
    "Request human approval before taking a user-visible irreversible action. Use for: publishing posts, sending email campaigns, spending money over a threshold, sharing externally, deleting records, or any action the user might want to review first. Pauses your turn until the user decides; the tool result tells you what they picked.",
    {
      summary: z.string().describe("One-line user-facing description: 'Publish post to LinkedIn', 'Send 12 cold emails', 'Spend $200 on LinkedIn ads'."),
      payload_type: z.enum(PAYLOAD_TYPES).describe(
        "Tells the channel renderer how to draw the preview. " +
        "linkedin_post / tweet / email_draft / cold_email_bulk / spend_request / external_share / destructive_action / generic.",
      ),
      payload: z.record(z.string(), z.any()).describe(
        "Rich preview JSON. Shape depends on payload_type, e.g. " +
        "linkedin_post: { text: '...', media_url?: '...' }, " +
        "email_draft: { to, subject, body }, " +
        "cold_email_bulk: { items: [{to, subject, body}, ...] }, " +
        "spend_request: { amount_usd, vendor, purpose }, " +
        "generic: { details: '...' }.",
      ),
      options: z.array(z.object({
        label: z.string().describe("Button label as the user sees it: 'Publish', 'Edit', 'Cancel'."),
        value: z.string().describe("The value returned to you in the tool result if the user picks this option."),
      })).optional().describe(
        "Buttons to offer the user. Defaults to [{label:'Approve',value:'approve'},{label:'Reject',value:'reject'}]. " +
        "Use this when you want a non-binary decision — e.g. a third 'Edit' button that returns 'edit' so you can re-draft.",
      ),
      risk_tier: z.enum(RISK_TIERS).optional().describe("low / medium / high — defaults to medium. Used for analytics + standing-rules auto-approval (low-risk may auto-approve in the future)."),
      allow_amendment: z.boolean().optional().describe("Set true if the user should be able to type a free-text amendment ('change the headline to X'). Returned in decision_text."),
      preview_markdown: z.string().optional().describe(
        "Universal human-readable preview of the action, in Markdown. Use this for ANY action type the dedicated renderers don't cover natively — slack_dm, calendar_invite, refund, feature flag toggle, code change, meeting reschedule, anything. Render the action as the user would want to read it: short title, key fields, the actual content, a one-line consequence statement. Always set this when payload_type='generic'.",
      ),
      preview_attachments: z.array(z.object({
        type: z.enum(["image", "link", "file", "audio", "video"]),
        url: z.string(),
        label: z.string().optional(),
      })).optional().describe(
        "Optional attachments for the preview card — screenshot mockups, links to the doc being shared, audio samples, etc. Rendered as chips/inline below the markdown.",
      ),
    },
    async (args) => {
      const options = args.options && args.options.length > 0
        ? args.options
        : [{ label: "Approve", value: "approve" }, { label: "Reject", value: "reject" }];
      const riskTier = args.risk_tier || "medium";

      const { id: localId, promise } = createActionApproval(args.summary, args.payload_type);

      // Embed preview hints inside the persisted payload so they survive
      // round-trip through the DB to the side-panel render too.
      const enrichedPayload: Record<string, unknown> = { ...args.payload };
      if (args.preview_markdown) enrichedPayload._preview_markdown = args.preview_markdown;
      if (args.preview_attachments) enrichedPayload._preview_attachments = args.preview_attachments;

      try {
        const dbRow = await host.createPendingActionApproval({
          orgId: ctx.orgId,
          agentId: ctx.agentId,
          summary: args.summary,
          payloadType: args.payload_type,
          payload: enrichedPayload,
          options,
          riskTier,
          approvalToken: localId,
          allowAmendment: args.allow_amendment === true,
          origin: ctx.origin,
        });
        logger.info(`Approval requested: ${args.summary}`, { id: localId, dbId: dbRow?.id, payloadType: args.payload_type });

        // Push the inline card to the chat thread (web channel listens via
        // AgentChatChannel; Telegram delivery handled in a separate hop).
        emitActionApproval({
          approvalToken: localId,
          summary: args.summary,
          payloadType: args.payload_type,
          payload: enrichedPayload,
          options,
          riskTier,
          allowAmendment: args.allow_amendment === true,
        });

        const decision = await promise;
        return {
          content: [{
            type: "text",
            text: decision.text
              ? `User decision: ${decision.value} — amendment: ${decision.text}`
              : `User decision: ${decision.value}`,
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Approval failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  return createSdkMcpServer({
    name: "approvals",
    version: "0.1.0",
    tools: [requestApprovalTool],
  });
}
