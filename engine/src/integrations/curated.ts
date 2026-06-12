// Per-toolkit tool allowlist. Only these tools are loaded when the toolkit
// matches in the router. Users wanting other tools can call
// COMPOSIO_SEARCH_TOOLS to discover them, then invoke by name.
//
// Rationale: Google Sheets has 48 tools but agents need CREATE, READ, WRITE
// 95% of the time. Same for Gmail (send/search/draft). Shrinks token cost
// from ~40 tool schemas to ~5 per matched toolkit.

export const CURATED_TOOLS: Record<string, string[]> = {
  googlesheets: [
    "GOOGLESHEETS_CREATE_GOOGLE_SHEET1",
    "GOOGLESHEETS_BATCH_UPDATE",
    "GOOGLESHEETS_BATCH_GET",
    "GOOGLESHEETS_GET_SPREADSHEET_INFO",
    "GOOGLESHEETS_SEARCH_SPREADSHEETS",
    "GOOGLESHEETS_APPEND_DIMENSION",
    "GOOGLESHEETS_ADD_SHEET",
  ],
  googlecalendar: [
    "GOOGLECALENDAR_CREATE_EVENT",
    "GOOGLECALENDAR_LIST_EVENTS",
    "GOOGLECALENDAR_UPDATE_EVENT",
    "GOOGLECALENDAR_DELETE_EVENT",
    "GOOGLECALENDAR_FIND_FREE_SLOTS",
  ],
  googledrive: [
    "GOOGLEDRIVE_UPLOAD_FILE",
    "GOOGLEDRIVE_CREATE_FOLDER",
    "GOOGLEDRIVE_LIST_FILES",
    "GOOGLEDRIVE_GET_FILE",
    "GOOGLEDRIVE_SHARE_FILE",
  ],
  googledocs: [
    "GOOGLEDOCS_CREATE_DOCUMENT",
    "GOOGLEDOCS_GET_DOCUMENT",
    "GOOGLEDOCS_INSERT_TEXT",
    "GOOGLEDOCS_BATCH_UPDATE",
  ],
  gmail: [
    "GMAIL_SEND_EMAIL",
    "GMAIL_FETCH_EMAILS",
    "GMAIL_CREATE_DRAFT",
    "GMAIL_SEND_DRAFT",
    "GMAIL_SEARCH",
    "GMAIL_REPLY_TO_EMAIL",
  ],
  github: [
    // Verified against Composio /api/v3/tools (2026-06) — the old list
    // (GITHUB_CREATE_ISSUE, GITHUB_LIST_ISSUES, …) used names that DON'T
    // EXIST; Composio silently dropped every one of them. Same failure
    // mode as the Apollo incident. Covers the bug-fixer workflow:
    // read code → branch → commit via API → PR → comment.
    "GITHUB_GET_A_REPOSITORY",
    "GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER",
    "GITHUB_SEARCH_REPOSITORIES",
    "GITHUB_GET_REPOSITORY_CONTENT",
    "GITHUB_SEARCH_CODE",
    "GITHUB_LIST_BRANCHES",
    "GITHUB_GET_A_REFERENCE",
    "GITHUB_CREATE_A_REFERENCE",
    "GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS",
    "GITHUB_DELETE_A_FILE",
    "GITHUB_LIST_COMMITS",
    "GITHUB_GET_A_COMMIT",
    "GITHUB_CREATE_A_PULL_REQUEST",
    "GITHUB_LIST_PULL_REQUESTS",
    "GITHUB_GET_A_PULL_REQUEST",
    "GITHUB_LIST_PULL_REQUESTS_FILES",
    "GITHUB_CREATE_AN_ISSUE",
    "GITHUB_GET_AN_ISSUE",
    "GITHUB_UPDATE_AN_ISSUE",
    "GITHUB_LIST_REPOSITORY_ISSUES",
    "GITHUB_CREATE_AN_ISSUE_COMMENT",
    "GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS",
  ],
  slack: [
    "SLACK_SEND_MESSAGE",
    "SLACK_LIST_CHANNELS",
    "SLACK_SEARCH_MESSAGES",
    "SLACK_UPLOAD_FILE",
    "SLACK_REPLY_TO_THREAD",
  ],
  vercel: [
    "VERCEL_LIST_DEPLOYMENTS",
    "VERCEL_GET_DEPLOYMENT",
    "VERCEL_CREATE_DEPLOYMENT",
    "VERCEL_LIST_PROJECTS",
    "VERCEL_GET_PROJECT",
  ],
  apollo: [
    // Verified Composio tool names — noun BEFORE verb.
    // (Old list had APOLLO_SEARCH_PEOPLE / APOLLO_ENRICH_PERSON /
    // APOLLO_SEARCH_COMPANIES which DON'T EXIST; Composio silently
    // dropped them so only ADD_CONTACTS_TO_SEQUENCE made it into
    // the agent's tool set — the source of weeks of confusion.)
    "APOLLO_PEOPLE_SEARCH",
    "APOLLO_ORGANIZATION_SEARCH",
    "APOLLO_MIXED_PEOPLE_AND_ACCOUNTS_SEARCH",
    "APOLLO_BULK_PEOPLE_ENRICHMENT",
    "APOLLO_ADD_CONTACTS_TO_SEQUENCE",
    "APOLLO_GET_AUTH_STATUS",
  ],
  hubspot: [
    "HUBSPOT_CREATE_CONTACT",
    "HUBSPOT_GET_CONTACT",
    "HUBSPOT_LIST_CONTACTS",
    "HUBSPOT_CREATE_DEAL",
    "HUBSPOT_UPDATE_DEAL",
    "HUBSPOT_SEARCH_CONTACTS",
  ],
  stripe: [
    "STRIPE_CREATE_INVOICE",
    "STRIPE_LIST_CUSTOMERS",
    "STRIPE_GET_CUSTOMER",
    "STRIPE_LIST_CHARGES",
    "STRIPE_CREATE_PAYMENT_LINK",
  ],
  linear: [
    // Verified against Composio /api/v3/tools (2026-06) — Linear slugs
    // repeat the product name (LINEAR_CREATE_LINEAR_ISSUE); the old
    // shorter names didn't exist (only LINEAR_UPDATE_ISSUE was real).
    "LINEAR_LIST_LINEAR_ISSUES",
    "LINEAR_GET_LINEAR_ISSUE",
    "LINEAR_CREATE_LINEAR_ISSUE",
    "LINEAR_UPDATE_ISSUE",
    "LINEAR_CREATE_LINEAR_COMMENT",
    "LINEAR_LIST_LINEAR_PROJECTS",
    "LINEAR_LIST_LINEAR_TEAMS",
    "LINEAR_LIST_LINEAR_STATES",
    "LINEAR_LIST_LINEAR_LABELS",
  ],
  sentry: [
    // Triage-focused subset (the toolkit has 176 tools, mostly org
    // admin/SCIM/release management). Read issues + events, update
    // status — no deletes.
    "SENTRY_RETRIEVE_PROJECT_ISSUES_LIST",
    "SENTRY_GET_ORGANIZATION_ISSUE_DETAILS",
    "SENTRY_RETRIEVE_ISSUE_EVENTS_BY_ID",
    "SENTRY_FETCH_ISSUE_EVENT_BY_ID",
    "SENTRY_RETRIEVE_PROJECT_EVENT_BY_ID",
    "SENTRY_GET_PROJECT_EVENTS",
    "SENTRY_GET_PROJECT_LIST",
    "SENTRY_RETRIEVE_ORGANIZATION_PROJECTS",
    "SENTRY_RETRIEVE_ISSUE_TAG_DETAILS",
    "SENTRY_UPDATE_PROJECT_ISSUE_STATUS_AND_DETAILS",
    "SENTRY_UPDATE_ISSUE_ATTRIBUTES_IN_ORGANIZATION",
  ],
  notion: [
    "NOTION_CREATE_PAGE",
    "NOTION_QUERY_DATABASE",
    "NOTION_UPDATE_PAGE",
    "NOTION_SEARCH",
    "NOTION_APPEND_BLOCKS",
  ],
  // Fallback: for toolkits without a curated list, take first N tools alphabetically
};

/**
 * Get the curated tool name list for a toolkit. Returns [] if no curation
 * exists — caller should load all tools for that toolkit (safe default).
 */
export function curatedToolsFor(toolkit: string): string[] {
  return CURATED_TOOLS[toolkit] || [];
}
