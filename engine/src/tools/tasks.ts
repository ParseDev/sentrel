import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { host } from "../host/index.js";
import { logger } from "../logger.js";
import { scanForInjection } from "../security/injection-scanner.js";

export function buildTasksMcpServer(agentId: number, orgId: number) {
  const createTaskTool = tool(
    "create_task",
    "Create a new task for yourself. Use for tracking work items, to-dos, and follow-ups.",
    {
      title: z.string().describe("Short task title"),
      description: z.string().optional().describe("Detailed description of what needs to be done"),
      instruction: z.string().optional().describe("Specific instruction for when you work on this task"),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional().describe("Priority level (default: normal)"),
      due_at: z.string().optional().describe("Due date as ISO 8601 string (e.g. '2026-04-20T17:00:00')"),
    },
    async (args) => {
      try {
        const id = await host.createTask(orgId, agentId, args.title, {
          description: args.description,
          instruction: args.instruction,
          priority: args.priority,
          due_at: args.due_at,
        });
        logger.info(`Task created: ${args.title}`, { id, priority: args.priority || "normal" });
        return {
          content: [{ type: "text", text: `Task created (ID: ${id}): "${args.title}" — ${args.priority || "normal"} priority${args.due_at ? `, due ${args.due_at}` : ""}` }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  const listTasksTool = tool(
    "list_tasks",
    "List your current tasks. Filter by status to see what's pending, in progress, or done.",
    {
      status: z.enum(["todo", "in_progress", "done", "failed"]).optional().describe("Filter by status. Omit to see all."),
    },
    async (args) => {
      try {
        const tasks = await host.listTasks(agentId, args.status);
        if (tasks.length === 0) {
          return { content: [{ type: "text", text: args.status ? `No ${args.status} tasks.` : "No tasks." }] };
        }
        const formatted = tasks.map((t, i) => {
          const due = t.due_at ? ` — due ${new Date(t.due_at).toLocaleDateString()}` : "";
          return `${i + 1}. [${t.status}] ${t.title} (${t.priority}${due}) — ID: ${t.id}`;
        }).join("\n");
        return { content: [{ type: "text", text: `${tasks.length} task(s):\n\n${formatted}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  const updateTaskTool = tool(
    "update_task",
    "Update a task's status, title, priority, or due date. Use to mark tasks as done, change priority, etc.",
    {
      id: z.number().describe("Task ID to update"),
      status: z.enum(["todo", "in_progress", "done", "failed"]).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      due_at: z.string().optional().describe("New due date as ISO 8601 string"),
    },
    async (args) => {
      try {
        const { id, ...updates } = args;
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await host.updateTask(id, cleanUpdates);
        const changes = Object.entries(cleanUpdates).map(([k, v]) => `${k}: ${v}`).join(", ");
        return { content: [{ type: "text", text: `Task ${id} updated: ${changes}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  const commentTaskTool = tool(
    "comment_on_task",
    "Add a comment to a task. Use to log progress, notes, or findings.",
    {
      task_id: z.number().describe("Task ID to comment on"),
      content: z.string().describe("Comment text"),
    },
    async (args) => {
      // Extra I — scan agent-authored comments. The comment is mirrored into
      // the task's conversation as a message which gets replayed into future
      // prompts, so a poisoned comment would persist indefinitely.
      const threats = scanForInjection(args.content, `task ${args.task_id} comment`);
      if (threats.length > 0) {
        return {
          content: [{
            type: "text",
            text: `Rejected: comment contains potential prompt-injection patterns (${threats.map((t) => t.category).join(", ")}). Rewrite without those phrases.`,
          }],
          isError: true,
        };
      }
      try {
        const id = await host.addTaskComment(args.task_id, agentId, args.content);
        return { content: [{ type: "text", text: `Comment added to task ${args.task_id}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  // Step 5.5 — long-running task primitives.
  //
  // These let a task span days without holding a session open: agent
  // periodically writes progress to the checkpoint JSONB column, asks the user
  // for input (which ends the turn and parks the task), or abandons the task
  // with a reason. Next resumption reads the checkpoint back in prompt-builder.

  const writeCheckpointTool = tool(
    "write_checkpoint",
    "Record progress on a long-running task so you can resume from this point later. JSON-merges into the task's checkpoint field — missing keys are preserved. Call this every 10-20 steps on long tasks.",
    {
      task_id: z.number().describe("Task ID being worked on"),
      checkpoint: z.record(z.string(), z.any()).describe("Arbitrary JSON state — e.g. { processed: 40, total: 100, last_item: 'X' }"),
    },
    async (args) => {
      try {
        await host.writeTaskCheckpoint(args.task_id, args.checkpoint);
        return { content: [{ type: "text", text: `Checkpoint saved for task ${args.task_id}.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  const askUserTool = tool(
    "ask_user",
    "Ask the task's owner a clarifying question. Sets the task to awaiting_input, posts the question as a comment, and ends your turn. The user's reply will re-engage you on this task.",
    {
      task_id: z.number().describe("Task ID needing clarification"),
      question: z.string().describe("The question to ask"),
    },
    async (args) => {
      try {
        await host.addTaskComment(args.task_id, agentId, args.question);
        await host.updateTask(args.task_id, { status: "awaiting_input" });
        logger.info(`Task ${args.task_id}: awaiting_input (agent asked user)`);
        return { content: [{ type: "text", text: `Question posted to task ${args.task_id}. Task is now awaiting_input; wait for the user's reply before continuing.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  const cancelSelfTool = tool(
    "cancel_self",
    "Abandon a task you cannot complete. Use only when blocked on something irrecoverable (e.g. credentials revoked, resource permanently unavailable).",
    {
      task_id: z.number().describe("Task ID to abandon"),
      reason: z.string().describe("Why the task cannot be completed"),
    },
    async (args) => {
      try {
        await host.addTaskComment(args.task_id, agentId, `Task abandoned: ${args.reason}`);
        await host.updateTask(args.task_id, { status: "failed", result: { abandoned: true, reason: args.reason } });
        logger.info(`Task ${args.task_id}: failed (agent abandoned, ${args.reason.slice(0, 80)})`);
        return { content: [{ type: "text", text: `Task ${args.task_id} marked as failed with reason recorded.` }] };
      } catch (err) {
        return { content: [{ type: "text", text: `Failed: ${(err as Error).message}` }], isError: true };
      }
    },
  );

  return createSdkMcpServer({
    name: "tasks",
    version: "0.1.0",
    tools: [
      createTaskTool,
      listTasksTool,
      updateTaskTool,
      commentTaskTool,
      writeCheckpointTool,
      askUserTool,
      cancelSelfTool,
    ],
  });
}
