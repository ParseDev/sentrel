// Per-agent tool ACL resolver. Mirrors the AgentToolPolicy#allows? logic
// in Rails so the engine can filter Composio tools at MCP server build time.
//
// No row for a (agent, toolkit) → allow everything (default 'read_write'-ish
// behavior; preserves backward compat with agents that pre-date the ACL).

export interface ToolPolicy {
  toolkit_slug: string;
  preset: string;
  allowed_tools: string[];
  denied_tools: string[];
}

const READ_PATTERNS = ["_GET_", "_LIST_", "_FETCH_", "_SEARCH_", "_READ_", "_VIEW_"];
const WRITE_PATTERNS = ["_CREATE_", "_UPDATE_", "_SEND_", "_REPLY_", "_ADD_", "_APPEND_", "_BATCH_UPDATE", "_POST_", "_PUBLISH_"];

// Composio tool names follow TOOLKIT_VERB_NOUN, e.g. GMAIL_SEND_EMAIL,
// HUBSPOT_CRM_GET_CONTACTS_LIST. Slug is the lowercase prefix before the
// first underscore.
export function toolkitSlugFor(toolName: string): string {
  const idx = toolName.indexOf("_");
  return idx === -1 ? toolName.toLowerCase() : toolName.slice(0, idx).toLowerCase();
}

export function policyAllows(policy: ToolPolicy | undefined, toolName: string): boolean {
  // No policy = allow (default behavior, preserves back-compat).
  if (!policy) return true;
  if (policy.denied_tools.includes(toolName)) return false;
  if (policy.preset === "full") return true;
  if (policy.preset === "custom") return policy.allowed_tools.includes(toolName);
  if (policy.allowed_tools.includes(toolName)) return true;
  if (policy.preset === "read_only") return READ_PATTERNS.some((p) => toolName.includes(p));
  if (policy.preset === "read_write") return [...READ_PATTERNS, ...WRITE_PATTERNS].some((p) => toolName.includes(p));
  return false;
}

// Indexes a list of policies by toolkit slug for O(1) lookup during the
// MCP server build.
export function indexPolicies(policies: ToolPolicy[]): Map<string, ToolPolicy> {
  const m = new Map<string, ToolPolicy>();
  for (const p of policies) m.set(p.toolkit_slug, p);
  return m;
}
