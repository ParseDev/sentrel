// OpenAI TTS — tts-1 / tts-1-hd. ~$0.015/1K chars on tts-1. Cheap fallback.

import { fetchSecret } from "../../tools/secrets.js";
import type { SynthesizeInput, SynthesizeOutput } from "./types.js";

const DEFAULT_MODEL = "tts-1";
const DEFAULT_VOICE = "alloy";

async function getKey(agentId: number): Promise<string | null> {
  let cred = await fetchSecret({ agentId, provider: "openai", kind: "llm_api_key" });
  if (!cred) cred = await fetchSecret({ agentId, provider: "openai", kind: "generic" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.fields?.value || cred.value;
}

export const OpenAiTtsProvider = {
  name: "openai" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async synthesize(input: SynthesizeInput, agentId: number): Promise<SynthesizeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("openai TTS: no credential resolved");
    const model = input.model || DEFAULT_MODEL;
    const voice = input.voice || DEFAULT_VOICE;

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: input.text, voice, response_format: "opus" }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`openai TTS failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    return {
      bytes,
      contentType: "audio/opus",
      filename: `voice-${Date.now()}.opus`,
      model,
    };
  },
};
