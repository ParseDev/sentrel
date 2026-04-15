// Phase S — Dangerous command pattern detection
//
// Checks every Bash command against ~30 regex patterns before execution.
// Returns a risk assessment with category, explanation, and suggested safer alternative.
// Used by the approval flow to decide whether to prompt the user.

export interface CommandRisk {
  pattern: string;
  category: string;
  level: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
  suggestedFix?: string;
}

interface DangerousPattern {
  regex: RegExp;
  category: string;
  level: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
  suggestedFix?: string;
}

const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // ── Filesystem destruction ──
  {
    regex: /\brm\s+(-[a-zA-Z]*[rf]|--recursive|--force)/,
    category: "filesystem_destruction",
    level: "HIGH",
    explanation: "Recursive or forced file deletion — could destroy important data",
    suggestedFix: "List files first with `ls`, then delete specific files",
  },
  {
    regex: /\bmkfs\b/,
    category: "filesystem_destruction",
    level: "HIGH",
    explanation: "Formatting a filesystem — destroys all data on the device",
  },
  {
    regex: /\bdd\s+if=/,
    category: "filesystem_destruction",
    level: "HIGH",
    explanation: "Low-level disk write — can overwrite entire drives",
  },
  {
    regex: />\s*\/dev\/sd[a-z]|>\s*\/dev\/nvme/,
    category: "filesystem_destruction",
    level: "HIGH",
    explanation: "Writing directly to a disk device",
  },

  // ── Permission escalation ──
  {
    regex: /\bchmod\s+(\d*7\d{2}|777|666|a\+[rwx])/,
    category: "permission_escalation",
    level: "HIGH",
    explanation: "Setting overly permissive file permissions",
    suggestedFix: "Use more restrictive permissions like 755 or 644",
  },
  {
    regex: /\bchown\s+(-R\s+)?root/,
    category: "permission_escalation",
    level: "MEDIUM",
    explanation: "Changing file ownership to root",
  },
  {
    regex: /\bsudo\b/,
    category: "permission_escalation",
    level: "MEDIUM",
    explanation: "Running commands with elevated privileges",
  },

  // ── SQL attacks ──
  {
    regex: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    category: "sql_destruction",
    level: "HIGH",
    explanation: "Dropping database tables or schemas — permanent data loss",
  },
  {
    regex: /\bTRUNCATE\s+TABLE\b/i,
    category: "sql_destruction",
    level: "HIGH",
    explanation: "Truncating a table — deletes all rows permanently",
  },
  {
    regex: /\bDELETE\s+FROM\s+\w+\s*(;|$)/i,
    category: "sql_destruction",
    level: "HIGH",
    explanation: "DELETE without a WHERE clause — deletes all rows",
    suggestedFix: "Add a WHERE clause to limit deletion scope",
  },

  // ── Pipe to interpreter (remote code execution) ──
  {
    regex: /\bcurl\b.*\|\s*(sh|bash|python|python3|node|ruby|perl)/,
    category: "remote_code_execution",
    level: "HIGH",
    explanation: "Piping downloaded content directly to an interpreter — downloaded code runs without inspection",
    suggestedFix: "Download the file first, inspect it, then run",
  },
  {
    regex: /\bwget\b.*\|\s*(sh|bash|python|python3|node|ruby|perl)/,
    category: "remote_code_execution",
    level: "HIGH",
    explanation: "Piping downloaded content directly to an interpreter",
    suggestedFix: "Download the file first, inspect it, then run",
  },
  {
    regex: /\beval\s*\(/,
    category: "remote_code_execution",
    level: "MEDIUM",
    explanation: "Dynamic code evaluation — could execute arbitrary code",
  },

  // ── Sensitive file access ──
  {
    regex: />\s*(\/etc\/|~\/\.ssh\/|~\/\.env|\.env\b)/,
    category: "sensitive_file_write",
    level: "HIGH",
    explanation: "Writing to system config or credential files",
  },
  {
    regex: /\bcat\s+(\/etc\/shadow|\/etc\/passwd|~\/\.ssh\/id_)/,
    category: "sensitive_file_read",
    level: "MEDIUM",
    explanation: "Reading sensitive system or credential files",
  },

  // ── Process manipulation ──
  {
    regex: /\bkill\s+-9\s+(-1|1)\b/,
    category: "process_destruction",
    level: "HIGH",
    explanation: "Killing all processes — system will become unresponsive",
  },
  {
    regex: /\bkillall\b/,
    category: "process_destruction",
    level: "MEDIUM",
    explanation: "Killing processes by name — could affect critical services",
  },
  {
    regex: /\bsystemctl\s+(stop|disable|mask)\b/,
    category: "service_disruption",
    level: "MEDIUM",
    explanation: "Stopping or disabling system services",
  },

  // ── Network / SSH ──
  {
    regex: /\bssh\b.*-o\s*StrictHostKeyChecking=no/,
    category: "network_security",
    level: "MEDIUM",
    explanation: "Disabling SSH host key verification — vulnerable to MITM",
  },
  {
    regex: /\bnc\s+-l\b|\bncat\b.*-l/,
    category: "network_security",
    level: "MEDIUM",
    explanation: "Opening a network listener — could create a backdoor",
  },

  // ── Git destructive operations ──
  {
    regex: /\bgit\s+(push\s+--force|reset\s+--hard|clean\s+-fd)/,
    category: "git_destruction",
    level: "MEDIUM",
    explanation: "Destructive git operation — could lose commits or untracked files",
    suggestedFix: "Use `git push --force-with-lease` or `git stash` instead",
  },

  // ── Environment / secrets ──
  {
    regex: /\bprintenv\b|\benv\b\s*$|\bset\b\s*$/,
    category: "secret_exposure",
    level: "LOW",
    explanation: "Printing environment variables — may expose API keys and secrets",
  },
  {
    regex: /\bexport\s+\w*KEY\w*=|\bexport\s+\w*SECRET\w*=|\bexport\s+\w*TOKEN\w*=/i,
    category: "secret_exposure",
    level: "MEDIUM",
    explanation: "Setting secrets as environment variables in a potentially logged command",
  },

  // ── Package management with scripts ──
  {
    regex: /\bnpm\s+install\b.*--unsafe-perm/,
    category: "unsafe_install",
    level: "MEDIUM",
    explanation: "Installing npm packages with unsafe permissions — scripts run as root",
  },
  {
    regex: /\bpip\s+install\b.*--break-system-packages/,
    category: "unsafe_install",
    level: "MEDIUM",
    explanation: "Installing Python packages that could break system Python",
  },

  // ── Disk / resource abuse ──
  {
    regex: /\bfork\s*bomb|:\(\)\s*\{\s*:\|:&\s*\}/,
    category: "resource_abuse",
    level: "HIGH",
    explanation: "Fork bomb — will crash the system by exhausting processes",
  },
  {
    regex: /\/dev\/urandom.*>\s*\//,
    category: "resource_abuse",
    level: "HIGH",
    explanation: "Writing random data to filesystem — will fill disk",
  },
];

// Check a command against all dangerous patterns.
// Returns null if safe, or a CommandRisk if dangerous.
export function scanCommand(command: string, allowlist: string[] = []): CommandRisk | null {
  // Check allowlist first — if the command matches any allowed pattern, skip
  for (const allowed of allowlist) {
    if (command.includes(allowed)) return null;
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.regex.test(command)) {
      return {
        pattern: pattern.regex.source,
        category: pattern.category,
        level: pattern.level,
        explanation: pattern.explanation,
        suggestedFix: pattern.suggestedFix,
      };
    }
  }

  return null;
}

// Get all pattern categories for display/config
export function getPatternCategories(): string[] {
  return [...new Set(DANGEROUS_PATTERNS.map((p) => p.category))];
}
