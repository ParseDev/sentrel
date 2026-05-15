// Phase S P2 — Prompt injection scanning
//
// Scans text content (SOUL.md, skill files, user-uploaded documents)
// for patterns that indicate prompt injection attempts. Rejects
// files with threats and logs an audit event.

import { logger } from "../logger.js";

export interface InjectionThreat {
  pattern: string;
  category: string;
  matchedText: string;
}

interface InjectionPattern {
  regex: RegExp;
  category: string;
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  // ── Instruction overrides ──
  { regex: /ignore\s+(all\s+)?previous\s+instructions/i, category: "instruction_override" },
  { regex: /disregard\s+(your\s+)?(rules|instructions|guidelines)/i, category: "instruction_override" },
  { regex: /forget\s+(everything|all|your)\s+(you|instructions)/i, category: "instruction_override" },
  { regex: /you\s+are\s+now\s+a\s+different/i, category: "instruction_override" },
  { regex: /new\s+instructions?\s*:/i, category: "instruction_override" },
  { regex: /override\s+(system|previous)\s+(prompt|instructions)/i, category: "instruction_override" },
  { regex: /system\s+prompt\s*:/i, category: "instruction_override" },

  // ── Deception patterns ──
  { regex: /do\s+not\s+tell\s+the\s+user/i, category: "deception" },
  { regex: /hidden?\s+from\s+(the\s+)?user/i, category: "deception" },
  { regex: /secretly\s+(do|perform|execute)/i, category: "deception" },
  { regex: /pretend\s+(you|to\s+be|that)/i, category: "deception" },
  { regex: /act\s+as\s+if\s+you\s+(are|were)\s+not/i, category: "deception" },

  // ── Credential exfiltration ──
  { regex: /cat\s+\.env\b/i, category: "credential_exfiltration" },
  { regex: /cat\s+credentials/i, category: "credential_exfiltration" },
  { regex: /print\s+(env|environment|api.?key|secret|token)/i, category: "credential_exfiltration" },
  { regex: /send\s+(me\s+)?(your\s+)?(api.?key|secret|token|password|credential)/i, category: "credential_exfiltration" },
  { regex: /exfiltrate|leak\s+(data|secret|key)/i, category: "credential_exfiltration" },

  // ── Hidden content ──
  { regex: /display\s*:\s*none/i, category: "hidden_content" },
  { regex: /\u200b|\u200c|\u200d|\u2060|\ufeff/i, category: "hidden_content" }, // zero-width chars
  { regex: /<!--.*(?:ignore|override|secret|hidden).*-->/i, category: "hidden_content" },
  { regex: /\u202a|\u202b|\u202c|\u202d|\u202e/i, category: "hidden_content" }, // bidi overrides

  // ── Role manipulation ──
  { regex: /\[system\]\s*:/i, category: "role_manipulation" },
  { regex: /\[assistant\]\s*:/i, category: "role_manipulation" },
  { regex: /<<\s*SYS\s*>>/i, category: "role_manipulation" },
  { regex: /\[INST\]/i, category: "role_manipulation" },
];

// Scan text for injection patterns. Returns threats found (empty if clean).
export function scanForInjection(text: string, source?: string): InjectionThreat[] {
  const threats: InjectionThreat[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    const match = pattern.regex.exec(text);
    if (match) {
      threats.push({
        pattern: pattern.regex.source,
        category: pattern.category,
        matchedText: match[0],
      });
    }
  }

  if (threats.length > 0) {
    logger.warn(`Injection threats detected in ${source || "content"}: ${threats.map(t => t.category).join(", ")}`);
  }

  return threats;
}

// Scan a file and return true if safe, false if threats found
export function isContentSafe(text: string, source?: string): boolean {
  return scanForInjection(text, source).length === 0;
}
