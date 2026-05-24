// Groq Whisper — cheapest + fastest viable option (whisper-large-v3-turbo,
// ~$0.04/hour). Drop-in OpenAI-compatible /audio/transcriptions endpoint.

import { fetchSecret } from "../../tools/secrets.js";
import type { TranscribeInput, TranscribeOutput } from "./types.js";

const DEFAULT_MODEL = "whisper-large-v3-turbo";

async function getKey(agentId: number): Promise<string | null> {
  let cred = await fetchSecret({ agentId, provider: "groq", kind: "generic" });
  if (!cred) cred = await fetchSecret({ agentId, provider: "groq", kind: "llm_api_key" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.fields?.value || cred.value;
}

export const GroqSttProvider = {
  name: "groq" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async transcribe(input: TranscribeInput, agentId: number): Promise<TranscribeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("groq STT: no credential resolved");

    const model = input.model || DEFAULT_MODEL;
    const safeFilename = input.filename.replace(/\.oga$/, ".ogg");

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.contentType }), safeFilename);
    formData.append("model", model);
    if (input.language) formData.append("language", input.language);
    formData.append("response_format", "verbose_json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`groq STT failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json() as { text: string; language?: string; duration?: number };
    return { text: data.text, model, detectedLanguage: data.language, durationSeconds: data.duration };
  },
};
