export interface GenerateVideoInput {
  prompt: string;
  /** Seconds, provider may clamp to the closest supported value. */
  duration?: number;
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  /** Optional reference image (workspace path or URL) for image-to-video. */
  image?: string;
  /**
   * UGC talking-creator video; `prompt` is the spoken script.
   * - avatar + no image → pre-made stock creator (use a known id).
   * - avatar + image    → CUSTOM talking avatar: that exact face (e.g. a
   *   doctor you generated) is voiced + lip-synced to the script.
   */
  avatar?: string;
  /** Voice id for the spoken script (custom talking avatar). Optional. */
  voice?: string;
  model?: string;
}

export interface GenerateVideoOutput {
  filePath: string;
  bytes: number;
  model: string;
  /** Provider-reported duration of the produced clip. */
  durationSeconds?: number;
}
