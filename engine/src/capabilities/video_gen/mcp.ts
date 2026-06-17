// Video generation MCP — mcp__video__generate. Saves the clip under
// /data/workspace/generated/ for send_image / send_file to deliver.

import { z } from "zod";
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../../logger.js";
import { getActiveVideoGenProvider } from "./registry.js";
import type { Agent } from "../../types.js";

export function buildVideoGenMcpServer(agent: Agent) {
  const generateTool = tool(
    "generate",
    "Generate a short video clip from a text prompt. Saves to workspace/generated/ and returns " +
      "the file path so you can pass it to send_file (or send_image for thumbnails). Most providers " +
      "produce 5–9 second clips. Expect a 1–3 minute wait — these models are slow.",
    {
      prompt: z.string().describe("For a scene clip: the scene description (camera + subject + action + style + lighting). For an avatar/UGC clip (when `avatar` is set): the SCRIPT the creator speaks, verbatim — write it like a real person talking to camera."),
      duration: z.number().int().min(3).max(10).optional().describe("Seconds (default provider's minimum — usually 5). Ignored for avatar UGC (length follows the script)."),
      aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).optional().describe("16:9 default (landscape), 9:16 for vertical / social."),
      image: z.string().optional().describe("Path or URL to a starting image for image-to-video. Kling derives the video's ratio from this image."),
      avatar: z.string().optional().describe("Avatar id for UGC talking-creator video (a real-looking person speaking the prompt as a script), e.g. 'emily_primary'. When set, routes to the avatar model instead of scene generation — this is how you make UGC ads."),
      model: z.string().optional().describe("Override the default model."),
    },
    async (args) => {
      try {
        const p = await getActiveVideoGenProvider(agent);
        const out = await p.generate(args, agent.id);
        return {
          content: [{
            type: "text" as const,
            text:
              `Generated ${Math.round(out.bytes / 1024 / 1024 * 10) / 10} MB video via ${p.name} (${out.model}):\n` +
              `${out.filePath}\n\nNext: pass this path to send_file (or send_image for a thumbnail).`,
          }],
        };
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        logger.warn("video_gen.generate failed", { error: msg });
        return { content: [{ type: "text" as const, text: `video generation failed: ${msg}` }], isError: true };
      }
    },
  );

  return createSdkMcpServer({
    name: "video",
    version: "1.0.0",
    tools: [generateTool],
  });
}
