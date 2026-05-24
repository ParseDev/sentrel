// Deepgram Nova-2 STT — ~$0.0043/min, strong accuracy.

import { fetchSecret } from "../../tools/secrets.js";
import type { TranscribeInput, TranscribeOutput } from "./types.js";

const DEFAULT_MODEL = "nova-2";

async function getKey(agentId: number): Promise<string | null> {
  const cred = await fetchSecret({ agentId, provider: "deepgram", kind: "generic" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.value;
}

export const DeepgramSttProvider = {
  name: "deepgram" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async transcribe(input: TranscribeInput, agentId: number): Promise<TranscribeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("deepgram STT: no credential resolved");

    const model = input.model || DEFAULT_MODEL;
    const params = new URLSearchParams({ model, smart_format: "true", punctuate: "true" });
    if (input.language) params.set("language", input.language);

    const res = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": input.contentType },
      body: input.bytes,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`deepgram STT failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json() as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }>; detected_language?: string }> };
      metadata?: { duration?: number };
    };
    const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    return {
      text: transcript,
      model,
      detectedLanguage: data.results?.channels?.[0]?.detected_language,
      durationSeconds: data.metadata?.duration,
    };
  },
};
