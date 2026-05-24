// TTS provider registry. Preference order (quality-then-cost):
//   ElevenLabs (best naturalness, $0.18/1K) → OpenAI tts-1 (cheap, decent)
//     → Google AI (good, free tier) → Deepgram (fast, decent)

import { ElevenLabsProvider } from "./elevenlabs.js";
import { OpenAiTtsProvider } from "./openai.js";
import { GoogleAiTtsProvider } from "./google_ai.js";
import { DeepgramTtsProvider } from "./deepgram.js";
import { resolveCapabilities } from "../../capabilities.js";
import type { Agent } from "../../types.js";

type TtsProvider =
  | typeof ElevenLabsProvider
  | typeof OpenAiTtsProvider
  | typeof GoogleAiTtsProvider
  | typeof DeepgramTtsProvider;

const REGISTRY: ReadonlyArray<TtsProvider> = [
  ElevenLabsProvider,
  OpenAiTtsProvider,
  GoogleAiTtsProvider,
  DeepgramTtsProvider,
];

export async function getActiveTtsProvider(agent: Agent): Promise<TtsProvider> {
  const cap = resolveCapabilities(agent).tts;
  const desired = cap.provider || "auto";

  if (desired !== "auto") {
    const explicit = REGISTRY.find((p) => p.name === desired);
    if (!explicit) throw new Error(`tts provider "${desired}" not registered`);
    if (!(await explicit.isAvailable(agent.id))) {
      throw new Error(`tts provider "${desired}" unavailable — add a credential at /settings/credentials or set PLATFORM_${desired.toUpperCase()}_KEY.`);
    }
    return explicit;
  }
  for (const p of REGISTRY) {
    if (await p.isAvailable(agent.id)) return p;
  }
  throw new Error("tts: no provider available — add a key for elevenlabs / openai / google_ai / deepgram, or set a PLATFORM_*_KEY env.");
}

export const TTS_REGISTRY = REGISTRY;
