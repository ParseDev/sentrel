// Route task text to connected Composio toolkits via keyword patterns.
// Only matched toolkits get their tools loaded for the agent run — saves 80%+
// tokens vs loading everything. Agent can always call COMPOSIO_SEARCH_TOOLS
// to find missing integrations.

// Keyword map: toolkit slug → regex. Case-insensitive, word-bounded where possible.
const TOOLKIT_KEYWORDS: Record<string, RegExp> = {
  googlesheets: /\b(sheets?|spreadsheets?|csv|workbook|excel|google sheets?)\b/i,
  googlecalendar: /\b(calendar|meeting|invite|appointment|book a time)\b/i,
  googledrive: /\b(drive|google drive|folder|upload file)\b/i,
  googledocs: /\b(google doc|docx|document)\b/i,
  gmail: /\b(gmail|inbox|reply to|send mail)\b/i,
  github: /\b(github|issue|pull request|\bPR\b|repo|repository|commit|branch)\b/i,
  slack: /\b(slack|channel|\bDM\b|post to slack|#[a-z])\b/i,
  vercel: /\b(vercel|deploy|deployment|domain)\b/i,
  apollo: /\b(apollo|prospect|lead|outreach|find contact|find email|verify email|cold email)\b/i,
  hubspot: /\b(hubspot|\bCRM\b|deal|pipeline|contact record)\b/i,
  stripe: /\b(stripe|payment|invoice|charge|subscription|refund)\b/i,
  linear: /\b(linear|ticket|sprint|backlog|cycle)\b/i,
  notion: /\b(notion|page|wiki|knowledge base)\b/i,
  discord: /\b(discord|server)\b/i,
  zoom: /\b(zoom|video call|meeting link)\b/i,
  twitter: /\b(twitter|\bX\b|tweet|post on twitter)\b/i,
  linkedin: /\b(linkedin|connect on linkedin)\b/i,
  trello: /\b(trello|card|kanban)\b/i,
  asana: /\b(asana|task)\b/i,
  jira: /\b(jira|ticket|story)\b/i,
  googlemeet: /\b(google meet|meet link)\b/i,
  dropbox: /\b(dropbox)\b/i,
  onedrive: /\b(onedrive|one drive)\b/i,
  airtable: /\b(airtable|base)\b/i,
  zendesk: /\b(zendesk|ticket|support)\b/i,
};

/**
 * Given task text + list of toolkits the org has connected, return the
 * toolkits whose keywords appear in the text.
 *
 * Empty return = no integrations needed, baseline + search-only loaded.
 */
export function routeToolkits(text: string, availableToolkits: string[]): string[] {
  if (!text) return [];
  const available = new Set(availableToolkits);
  const matched: string[] = [];
  for (const [toolkit, regex] of Object.entries(TOOLKIT_KEYWORDS)) {
    if (!available.has(toolkit)) continue;
    if (regex.test(text)) matched.push(toolkit);
  }
  return matched;
}

/** Expose for debugging / system prompt inclusion. */
export function supportedToolkits(): string[] {
  return Object.keys(TOOLKIT_KEYWORDS);
}
