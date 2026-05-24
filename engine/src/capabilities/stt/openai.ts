// OpenAI Whisper / gpt-4o-mini-transcribe. Reuses an existing
// llm_api_key:openai credential so chat-only users get STT for free.

import { fetchSecret } from "../../tools/secrets.js";
import type { TranscribeInput, TranscribeOutput } from "./types.js";

const DEFAULT_MODEL = "gpt-4o-mini-transcribe";

async function getKey(agentId: number): Promise<string | null> {
  let cred = await fetchSecret({ agentId, provider: "openai", kind: "llm_api_key" });
  if (!cred) cred = await fetchSecret({ agentId, provider: "openai", kind: "generic" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.fields?.value || cred.value;
}

export const OpenAiSttProvider = {
  name: "openai" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async transcribe(input: TranscribeInput, agentId: number): Promise<TranscribeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("openai STT: no credential resolved");

    const model = input.model || DEFAULT_MODEL;
    const safeFilename = input.filename.replace(/\.oga$/, ".ogg");

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.contentType }), safeFilename);
    formData.append("model", model);
    if (input.language) formData.append("language", input.language);

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`openai STT failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json() as { text: string };
    return { text: data.text, model };
  },
};
