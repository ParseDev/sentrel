import { config } from "../config.js";
import { host } from "../host/index.js";
import { onDone } from "../gateway.js";
import { logger } from "../logger.js";

let botNumber = "";

export async function initWhatsApp(): Promise<void> {
  const channelConfigs = await host.getChannelConfigs(config.employeeId);
  const waConfig = channelConfigs.find((c) => c.channel_type === "whatsapp");

  if (!waConfig || !waConfig.config?.phone_number) {
    logger.info("WhatsApp: no phone configured, skipping");
    return;
  }

  botNumber = waConfig.config.phone_number as string;
  logger.info(`WhatsApp: initialized for ${botNumber}`);
}

// Register a one-shot listener for the current inbound WhatsApp job.
// Called from agent-runner at the start of a WhatsApp job — keyed by jobId
// so emitDone(jobId, ...) routes the reply back to this caller and no other.
export function setWhatsAppPendingReply(jobId: string, from: string): void {
  if (!botNumber) {
    logger.warn("WhatsApp: setWhatsAppPendingReply called but channel not initialized");
    return;
  }
  const to = from.replace("whatsapp:", "");
  const cleanup = onDone(jobId, async (content) => {
    try {
      await sendMessage(to, content);
    } catch (err) {
      logger.error("WhatsApp: send failed in onDone listener", { error: (err as Error).message });
    }
  });
  // Safety net: if no emitDone fires within 10 min, reclaim the slot.
  setTimeout(() => cleanup(), 600_000);
}

async function sendMessage(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) { logger.error("WhatsApp: missing Twilio creds"); return; }

  const chunks = body.length <= 4096 ? [body] : splitAt(body, 4096);
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  for (const chunk of chunks) {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: `whatsapp:${botNumber}`, To: `whatsapp:${to}`, Body: chunk }).toString(),
    });
    const resBody = await res.text();
    if (!res.ok) {
      logger.error(`WhatsApp send failed (${res.status})`, { error: resBody });
    } else {
      try {
        const parsed = JSON.parse(resBody);
        logger.info(`WhatsApp: message ${parsed.sid} status=${parsed.status}`);
      } catch {}
    }
  }
  logger.info(`WhatsApp: sent to ${to} (${body.length} chars)`);
}

function splitAt(text: string, max: number): string[] {
  const chunks: string[] = [];
  let r = text;
  while (r.length > 0) {
    if (r.length <= max) { chunks.push(r); break; }
    let i = r.lastIndexOf("\n", max);
    if (i < max / 2) i = max;
    chunks.push(r.slice(0, i));
    r = r.slice(i);
  }
  return chunks;
}
