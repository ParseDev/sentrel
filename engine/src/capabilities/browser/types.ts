// Shared types for browser providers. Both Camoufox (local sidecar) and
// Browserbase (cloud) implement these. The MCP tool layer surfaces the
// same shape to the agent regardless of which provider runs.

export interface OpenPageInput {
  url: string;
  /** Optional reuse of an existing session id (per-agent, per-tab). */
  sessionId?: string;
}
export interface OpenPageOutput {
  sessionId: string;
  title?: string;
  finalUrl?: string;
}

export interface SnapshotInput {
  sessionId: string;
}
export interface SnapshotOutput {
  /**
   * Accessibility-flavored text snapshot of the current page. Includes
   * element refs (e1, e2, …) the agent can pass back to click/type so
   * we never round-trip raw HTML through the model.
   */
  snapshot: string;
  title?: string;
  url?: string;
}

export interface ClickInput {
  sessionId: string;
  ref: string;
}
export interface ClickOutput {
  ok: boolean;
  note?: string;
}

export interface TypeInput {
  sessionId: string;
  ref: string;
  text: string;
  submit?: boolean;
}
export interface TypeOutput {
  ok: boolean;
}

export interface ScreenshotInput {
  sessionId: string;
  /** When set, the engine saves to /data/workspace/screenshots/<filename>. */
  filename?: string;
  fullPage?: boolean;
}
export interface ScreenshotOutput {
  /** Path inside /data the agent can pass to send_image. */
  filePath: string;
  bytes: number;
}

export interface CloseInput {
  sessionId: string;
}
export interface CloseOutput {
  ok: boolean;
}
