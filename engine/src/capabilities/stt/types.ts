// Speech-to-text provider shape. Takes raw audio bytes and an audio
// content type (audio/ogg, audio/mp3, etc.), returns a transcript.

export interface TranscribeInput {
  bytes: Buffer;
  contentType: string;
  filename: string;
  /** ISO 639-1 language hint, e.g. "en". Optional. */
  language?: string;
  /** Provider-specific model override. */
  model?: string;
}

export interface TranscribeOutput {
  text: string;
  model: string;
  /** Provider-reported language (when detected) — useful for downstream routing. */
  detectedLanguage?: string;
  /** Approximate duration in seconds, if the provider reports it. */
  durationSeconds?: number;
}
