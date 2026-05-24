// ElevenLabs TTS — best naturalness, ~$0.18/1K chars. Default voice is
// "Rachel" (21m00Tcm4TlvDq8ikWAM); workspace owner can override per-agent
// via capabilities.tts.voice (out of scope here).

import { fetchSecret } from "../../tools/secrets.js";
import type { SynthesizeInput, SynthesizeOutput } from "./types.js";

const DEFAULT_MODEL = "eleven_turbo_v2_5";
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel

async function getKey(agentId: number): Promise<string | null> {
  const cred = await fetchSecret({ agentId, provider: "elevenlabs", kind: "generic" });
  if (!cred) return null;
  return cred.fields?.api_key || cred.value;
}

export const ElevenLabsProvider = {
  name: "elevenlabs" as const,

  async isAvailable(agentId: number): Promise<boolean> {
    return (await getKey(agentId)) !== null;
  },

  async synthesize(input: SynthesizeInput, agentId: number): Promise<SynthesizeOutput> {
    const key = await getKey(agentId);
    if (!key) throw new Error("elevenlabs: no credential resolved");
    const voiceId = input.voice || DEFAULT_VOICE;
    const model = input.model || DEFAULT_MODEL;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: input.text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`elevenlabs TTS failed: ${res.status} ${body.slice(0, 200)}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    return {
      bytes,
      contentType: "audio/mpeg",
      filename: `voice-${Date.now()}.mp3`,
      model,
    };
  },
};
