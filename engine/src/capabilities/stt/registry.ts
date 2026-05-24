// STT provider registry. Preference order (cost-cheapest-first):
//   Groq Whisper (~$0.04/hr) → Deepgram nova-2 (~$0.26/hr)
//     → OpenAI gpt-4o-mini-transcribe (~$0.18/hr)
//     → Google AI (Gemini, free tier)

import { GroqSttProvider } from "./groq.js";
import { DeepgramSttProvider } from "./deepgram.js";
import { OpenAiSttProvider } from "./openai.js";
import { GoogleAiSttProvider } from "./google_ai.js";
import { resolveCapabilities } from "../../capabilities.js";
import type { Agent } from "../../types.js";

type SttProvider =
  | typeof GroqSttProvider
  | typeof DeepgramSttProvider
  | typeof OpenAiSttProvider
  | typeof GoogleAiSttProvider;

const REGISTRY: ReadonlyArray<SttProvider> = [
  GroqSttProvider,
  DeepgramSttProvider,
  OpenAiSttProvider,
  GoogleAiSttProvider,
];

export async function getActiveSttProvider(agent: Agent): Promise<SttProvider> {
  const cap = resolveCapabilities(agent).stt;
  const desired = cap.provider || "auto";

  if (desired !== "auto") {
    const explicit = REGISTRY.find((p) => p.name === desired);
    if (!explicit) throw new Error(`stt provider "${desired}" not registered`);
    if (!(await explicit.isAvailable(agent.id))) {
      throw new Error(`stt provider "${desired}" unavailable — add a credential at /settings/credentials or set PLATFORM_${desired.toUpperCase()}_KEY.`);
    }
    return explicit;
  }
  for (const p of REGISTRY) {
    if (await p.isAvailable(agent.id)) return p;
  }
  throw new Error("stt: no provider available — add a key for groq / deepgram / openai / google_ai, or set a PLATFORM_*_KEY env.");
}

export const STT_REGISTRY = REGISTRY;
