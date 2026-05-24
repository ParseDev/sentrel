// Deepgram Aura TTS — competitive quality, simple API.

import { fetchSecret } from "../../tools/secrets.js";
import type { SynthesizeInput, SynthesizeOutput } from "./types.js";

const DEFAULT_MODEL = "aura-asteria-en";

async function getKey(agentId: number): Promise<string | null> {
  const cred = await fetchSecret({ agentId, provider: "deepgram", kind: "generic" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.value;
}

export const DeepgramTtsProvider = {
  name: "deepgram" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async synthesize(input: SynthesizeInput, agentId: number): Promise<SynthesizeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("deepgram TTS: no credential resolved");
    const model = input.voice || input.model || DEFAULT_MODEL;

    const res = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.text }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`deepgram TTS failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    return {
      bytes,
      contentType: res.headers.get("content-type") || "audio/mpeg",
      filename: `voice-${Date.now()}.mp3`,
      model,
    };
  },
};
