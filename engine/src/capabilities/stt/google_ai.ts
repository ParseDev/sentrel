// Google AI STT via Gemini's audio understanding. Pass the audio as
// inline_data; Gemini returns transcription text.

import { fetchSecret } from "../../tools/secrets.js";
import type { TranscribeInput, TranscribeOutput } from "./types.js";

const DEFAULT_MODEL = "gemini-2.0-flash";

async function getKey(agentId: number): Promise<string | null> {
  let cred = await fetchSecret({ agentId, provider: "google_ai", kind: "generic" });
  if (!cred) cred = await fetchSecret({ agentId, provider: "google_ai", kind: "llm_api_key" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.fields?.value || cred.value;
}

export const GoogleAiSttProvider = {
  name: "google_ai" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async transcribe(input: TranscribeInput, agentId: number): Promise<TranscribeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("google_ai STT: no credential resolved");

    const model = input.model || DEFAULT_MODEL;
    const promptText = input.language
      ? `Transcribe this audio in ${input.language}. Return only the transcript, no preamble.`
      : "Transcribe this audio. Return only the transcript, no preamble.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: input.contentType, data: input.bytes.toString("base64") } },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`google_ai STT failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() ?? "";
    return { text, model };
  },
};
