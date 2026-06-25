// Phase S P2 — Credential filtering
//
// Prevents secrets from leaking to MCP tool subprocesses, error messages,
// or agent responses. Whitelist of safe env vars; redacts anything that
// looks like a key/token/secret.

import { logger } from "../logger.js";

// Env vars safe to pass to subprocesses (MCP servers, Bash, etc.)
const SAFE_ENV_VARS = new Set([
  "PATH", "HOME", "USER", "SHELL", "LANG", "LC_ALL", "LC_CTYPE",
  "TERM", "TMPDIR", "TZ",
  "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_RUNTIME_DIR",
  "NODE_ENV", "NODE_PATH",
  "DATA_DIR", "GATEWAY_PORT",
]);

// Patterns that indicate a value is a secret
const SECRET_PATTERNS = [
  /^sk[-_]/i,           // sk-ant-xxx, sk-proj-xxx
  /^ak[-_]/i,           // ak_xxx (API key prefix)
  /^ghp_/i,             // GitHub personal access token
  /^gho_/i,             // GitHub OAuth token
  /^Bearer\s/i,         // Bearer tokens
  /^Basic\s/i,          // Basic auth
  /^eyJ/,               // JWT tokens (base64 encoded JSON)
  /^xox[bps]-/,         // Slack tokens
  /^SG\./,              // SendGrid
  /^AC[a-f0-9]{32}/i,   // Twilio account SID
  /^whsec_/,            // Webhook secrets
  /^rk_/,               // Stripe restricted keys
  /^pk_/,               // Stripe publishable keys
  /^sk_/,               // Stripe secret keys
  /password|secret|token|credential|private.?key/i,
];

// Get a sanitized copy of env vars safe for subprocesses
export function getSafeEnv(): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const key of SAFE_ENV_VARS) {
    if (process.env[key]) {
      safe[key] = process.env[key]!;
    }
  }
  return safe;
}

// Check if an env var name looks like it contains secrets
export function isSecretEnvVar(name: string): boolean {
  const secretNames = /key|secret|token|password|credential|auth/i;
  return secretNames.test(name) && !SAFE_ENV_VARS.has(name);
}

// Redact secrets from a string (for error messages, logs, etc.)
export function redactSecrets(text: string): string {
  let result = text;

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(new RegExp(pattern.source, "gi"), (match) => {
      if (match.length <= 8) return "***";
      return match.slice(0, 4) + "***" + match.slice(-3);
    });
  }

  // Redact anything that looks like key=value where key contains secret/key/token
  result = result.replace(
    /(\b\w*(key|secret|token|password|auth)\w*\s*[=:]\s*)(\S+)/gi,
    "$1***"
  );

  return result;
}

// Log count of filtered env vars (for debugging)
export function logEnvFilterStats(): void {
  const total = Object.keys(process.env).length;
  const safe = SAFE_ENV_VARS.size;
  const filtered = total - safe;
  logger.info(`Credential filter: ${safe} safe vars passed, ${filtered} filtered out of ${total} total`);
}
