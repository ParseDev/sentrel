// Google AI TTS — uses Gemini's text-to-speech via models/gemini-2.5-flash-tts
// (or equivalent). Returns audio/mp3.

import { fetchSecret } from "../../tools/secrets.js";
import type { SynthesizeInput, SynthesizeOutput } from "./types.js";

const DEFAULT_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_VOICE = "Kore"; // Gemini built-in voice

async function getKey(agentId: number): Promise<string | null> {
  let cred = await fetchSecret({ agentId, provider: "google_ai", kind: "generic" });
  if (!cred) cred = await fetchSecret({ agentId, provider: "google_ai", kind: "llm_api_key" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.fields?.value || cred.value;
}

export const GoogleAiTtsProvider = {
  name: "google_ai" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async synthesize(input: SynthesizeInput, agentId: number): Promise<SynthesizeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("google_ai TTS: no credential resolved");

    const model = input.model || DEFAULT_MODEL;
    const voice = input.voice || DEFAULT_VOICE;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: input.text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`google_ai TTS failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error("google_ai TTS returned no audio");

    const bytes = Buffer.from(part.inlineData.data, "base64");
    const contentType = part.inlineData.mimeType || "audio/mpeg";
    const ext = contentType.includes("wav") ? "wav" : (contentType.includes("opus") ? "opus" : "mp3");
    return {
      bytes,
      contentType,
      filename: `voice-${Date.now()}.${ext}`,
      model,
    };
  },
};
