import fs from "fs";
import path from "path";
import { host } from "../host/index.js";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { transcribe } from "./providers/whisper.js";

// A processed attachment is either inline text (voice transcript, extracted text)
// or a file path the agent can Read (PDFs, images, office docs).
export interface ProcessedAttachment {
  signedId: string;
  filename: string;
  contentType: string;
  // For voice notes — transcript inlined directly into the prompt
  transcript?: string;
  // For files the agent should Read — saved to workspace/inbox/
  workspacePath?: string;
  // Human-readable description for the prompt
  description: string;
}

// Webhook-resolved attachment — carries a presigned URL so we fetch from
// S3 directly, no Rails round-trip.
export interface AttachmentInput {
  signed_id: string;
  url: string;
  filename: string;
  content_type: string;
  byte_size: number;
}

// Process all attachments for a job. Each entry is either a presigned-URL
// payload (preferred — fetch directly from S3) or a bare signed_id string
// (legacy path — fetch via Rails). Transcribes audio, saves other files to
// workspace so the agent can Read them.
export async function processAttachments(
  attachments: Array<AttachmentInput | string>,
): Promise<ProcessedAttachment[]> {
  if (!attachments || attachments.length === 0) return [];

  const results: ProcessedAttachment[] = [];
  const inboxDir = path.join(config.dataDir, "workspace", "inbox");
  fs.mkdirSync(inboxDir, { recursive: true });

  for (const att of attachments) {
    const signedId = typeof att === "string" ? att : att.signed_id;
    try {
      const result = typeof att === "string"
        ? await processViaRails(att, inboxDir)
        : await processViaUrl(att, inboxDir);
      if (result) results.push(result);
    } catch (err) {
      logger.error(`Media pipeline failed for ${signedId}`, {
        error: (err as Error).message,
      });
    }
  }

  return results;
}

// Fetch bytes directly from a presigned S3 URL — preferred path.
async function processViaUrl(
  att: AttachmentInput,
  inboxDir: string,
): Promise<ProcessedAttachment | null> {
  const res = await fetch(att.url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`presigned URL fetch failed: ${res.status}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  return processBytes(att.signed_id, att.filename, att.content_type, bytes, inboxDir);
}

// Legacy path: ask Rails for the bytes via the /api/blobs proxy.
async function processViaRails(
  signedId: string,
  inboxDir: string,
): Promise<ProcessedAttachment | null> {
  const { bytes, filename, contentType } = await host.loadBlob(signedId);
  return processBytes(signedId, filename, contentType, bytes, inboxDir);
}

async function processBytes(
  signedId: string,
  filename: string,
  contentType: string,
  bytes: Buffer,
  inboxDir: string,
): Promise<ProcessedAttachment | null> {
  logger.info(`Media pipeline: processing ${filename} (${contentType}, ${bytes.length}b)`);

  // ── Audio: transcribe via Whisper ──
  if (contentType.startsWith("audio/")) {
    try {
      const text = await transcribe(bytes, contentType, filename);
      return {
        signedId,
        filename,
        contentType,
        transcript: text,
        description: `Voice note transcript (${filename})`,
      };
    } catch (err) {
      logger.error(`Transcription failed for ${filename}`, {
        error: (err as Error).message,
      });
      // Fall through — save the file so the agent at least knows it exists
      return saveToWorkspace(signedId, filename, contentType, bytes, inboxDir,
        `Audio file (transcription failed): ${filename}`);
    }
  }

  // ── Images: save to workspace for agent to Read (Claude vision) ──
  if (contentType.startsWith("image/")) {
    return saveToWorkspace(signedId, filename, contentType, bytes, inboxDir,
      `Image: ${filename} — use the Read tool to view it`);
  }

  // ── PDFs: save to workspace for agent to Read (Claude document reading) ──
  if (contentType === "application/pdf") {
    return saveToWorkspace(signedId, filename, contentType, bytes, inboxDir,
      `PDF document: ${filename} — use the Read tool to read it`);
  }

  // ── Office docs: save to workspace (agent reads via Read tool) ──
  if (
    contentType.includes("officedocument") ||
    contentType.includes("msword") ||
    contentType.includes("ms-excel") ||
    contentType.includes("ms-powerpoint")
  ) {
    return saveToWorkspace(signedId, filename, contentType, bytes, inboxDir,
      `Office document: ${filename} — use the Read tool to read it`);
  }

  // ── Plain text / CSV / JSON / Markdown: inline directly ──
  if (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/csv"
  ) {
    const text = bytes.toString("utf-8").slice(0, 50_000);
    return {
      signedId,
      filename,
      contentType,
      transcript: text,
      description: `File contents of ${filename}`,
    };
  }

  // ── Unknown: save and let the agent figure it out ──
  return saveToWorkspace(signedId, filename, contentType, bytes, inboxDir,
    `Attached file: ${filename} (${contentType})`);
}

function saveToWorkspace(
  signedId: string,
  filename: string,
  contentType: string,
  bytes: Buffer,
  inboxDir: string,
  description: string,
): ProcessedAttachment {
  // Sanitize filename for filesystem safety
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(inboxDir, safeName);
  fs.writeFileSync(filePath, bytes);

  // Return workspace-relative path (what the agent passes to Read tool)
  const relativePath = `workspace/inbox/${safeName}`;
  logger.info(`Media pipeline: saved ${relativePath} (${bytes.length}b)`);

  return {
    signedId,
    filename,
    contentType,
    workspacePath: relativePath,
    description,
  };
}
