# Alchemy — Post-V1 Roadmap

## Core Agent Capabilities

| # | Item | What | Effort |
|---|------|------|--------|
| 1 | Full activity recall | Expand recall to search audit logs, emails sent/received, tasks, approvals — not just messages | ~1 day |
| 2 | Smart scheduling | `schedule_task` + `set_reminder` tools. Timezone-aware, natural language time | ~1 day |
| 3 | Task management | `create_task`, `list_tasks`, `update_task`, `comment_on_task`. Due dates, overdue alerts, comments | ~2 days |
| 4 | Knowledge base / RAG | Upload PDFs, docs, websites. Vector store for company knowledge agents can reference | ~1 week |
| 5 | Per-contact profiles | Contact model linking all conversations, channels, preferences, facts across time | ~1 week |
| 6 | Vector/semantic search | Replace pg_trgm with embeddings for recall | ~3 days |
| 7 | Auto-suggested recalls | Engine proactively injects related context before each run | ~3 days |
| 8 | Conversation analytics | Sentiment analysis, response quality scoring, resolution rate | ~3 days |
| 9 | Inter-agent messaging | `message_agent()` tool. Delegate + await response | ~2 days |
| 9b | Session resume (retry) | Re-enable SDK session resume so back-to-back messages continue the same Claude session. Reduces cost (prompt caching) and improves continuity. Previously disabled due to SDK hang on large transcripts — needs investigation | ~2 days |
| 10 | Conversation handoff | Agent escalates to human. Live takeover in web UI | ~2 days |

## Deployment

| # | Item | What | Effort |
|---|------|------|--------|
| 11 | Sprint 7 — Production | Dockerfiles, AWS, S3, health monitoring | ~2 weeks |

## Channels

| # | Item | What | Effort |
|---|------|------|--------|
| 12 | Slack channel | Bot in Slack workspaces, Socket Mode, DMs + threads | ~2 days |
| 13 | Voice channel | Twilio Voice + real-time TTS + Whisper | ~2 weeks |
| 14 | SMS channel | Twilio SMS inbound/outbound | ~4 hours |

## Multi-tenancy & Access

| # | Item | What | Effort |
|---|------|------|--------|
| 15 | Pundit policies | Role-based access — owner/admin/member/viewer | ~1 day |
| 16 | Org invites | Invite teammates via email, assign roles | ~1 day |
| 17 | 2FA | Two-factor authentication for dashboard | ~1 day |
| 18 | SSO / SAML | Enterprise login — Google, Okta, etc. | ~2 days |
| 19 | Multi-org support | User belongs to multiple orgs, org switcher | ~2 days |
| 20 | Agent budget | Spending limits — max API cost/day, emails/day, tool calls | ~1 day |
| 21 | GDPR / compliance | Data export, deletion requests, consent, retention policies | ~3 days |

## Integrations

| # | Item | What | Effort |
|---|------|------|--------|
| 22 | Inbound webhook receivers | External events trigger agent jobs — HubSpot deal change, Stripe payment | ~1 week |
| 23 | Webhooks out | Notify external systems — task completed, email sent, approval needed | ~2 days |
| 24 | Custom MCP server builder | UI to define custom tools — name, API endpoint, auth, params. No code | ~2 weeks |
| 25 | Multi-account per provider | Multiple accounts per integration in one org | ~3 days |

## Platform & UI

| # | Item | What | Effort |
|---|------|------|--------|
| 26 | Notifications | In-app notification center — approvals waiting, errors, agent status | ~2 days |
| 27 | Agent cloning/templates | Duplicate agent setup. "Create another SDR like Sarah" | ~4 hours |
| 28 | Agent templates marketplace | Pre-built configs — SDR, Support Rep, Content Writer — one-click | ~3 days |
| 29 | Org chart visualization | Visual agent tree with status, drag-to-reorganize | ~2 days |
| 30 | White-labeling | Custom branding per org — logo, colors, email domain | ~2 days |
| 31 | Export / reporting | CSV/PDF export of audit logs, conversations, reports | ~1 day |
| 32 | Mobile responsive | Dashboard works on phone/tablet | ~3 days |
| 33 | Billing / Stripe | SaaS subscription, usage-based pricing, per-org plans | ~1 week |
| 34 | API for developers | Public REST API for programmatic integration | ~1 week |

## Long-term

| # | Item | What | Effort |
|---|------|------|--------|
| 35 | Standalone engine | LocalSqliteHost + CLI, run agents without Rails | ~2 weeks |
| 36 | Skill marketplace | Browse/install community skills. Publish, versioning, ratings | ~3 weeks |
| 37 | Open/click email tracking | Track opens + clicks per conversation | ~2 days |
| 38 | Tests + CI | GitHub Actions, expand RSpec + Vitest, lint on every PR | ~3 days |
