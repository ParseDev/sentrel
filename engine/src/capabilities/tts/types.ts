// Text-to-speech provider shape. Returns audio bytes the channel layer
// (send_voice) can ship directly to Telegram/WhatsApp/etc.

export interface SynthesizeInput {
  text: string;
  /** Provider-specific voice id. Falls back to provider default. */
  voice?: string;
  /** Override default model. */
  model?: string;
}

export interface SynthesizeOutput {
  bytes: Buffer;
  /** "audio/opus" | "audio/mpeg" | "audio/wav" — channel router uses this. */
  contentType: string;
  /** Suggested filename for upload. */
  filename: string;
  /** Model that actually ran (provider-resolved). */
  model: string;
}
