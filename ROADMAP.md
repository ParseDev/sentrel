# Alchemy Roadmap

Remaining work after the Steps 0-6 + Extras refactor (shipped Apr 20, 2026).

Effort estimates are **AI-assisted** (building with Claude in this workflow), typically 1/3 to 1/5 of the original human-only estimates. "h" = hours, "d" = days of focused AI-pair work.

---

## TIER 0 — Ship this week (perception + production-readiness)

These close the gap with VoltAgent / CrewAI / Cursor on the things users notice first.

### 1. Streaming responses to channels
**Effort:** 4-6h
**Why:** User watches Telegram do nothing for 2-3 minutes during a long task. Feels broken. ChatGPT/Cursor all stream tokens.
**What:** Buffer `emitTextDelta` events per-jobId, flush every ~500ms as Telegram message edits. Web UI subscribes to deltas via ActionCable. Replaces the "final blob at the end" behavior.
**Dependency:** None.

### 2. Observability dashboard
**Effort:** 1d
**Why:** You read raw logs to debug today. Spans + timings + costs would have caught the `setMcpServers` bug in 30 seconds.
**What:** New Rails page at `/ops` showing: last 50 runs, timing per step (prompt/tools/response), token cost, tool call tree. Pulls from `audit_logs` + a new `run_spans` jsonb column. Replay a run step-by-step.
**Dependency:** None.

### 3. Agent budget limits (POST_V1 #20)
**Effort:** 4h
**Why:** Prevents silent $56 credit burns from runaway schedules. You hit this already.
**What:** Per-agent daily/monthly caps on API cost, email count, tool calls. Enforced in agent-runner pre-query. Rails UI shows usage + warning at 80%.
**Dependency:** Audit log cost tracking (already in `extra.cache_*_tokens`).

### 4. Knowledge base / RAG (POST_V1 #4)
**Effort:** 1-2d
**Why:** The #1 missing feature for any "real" AI agent platform. Every customer asks "can I upload my docs?"
**What:** Upload PDFs/MD/TXT per agent → chunk → embed (same HuggingFace local model we use for routing) → store in `agent_documents` table with pgvector. New `search_knowledge` MCP tool. Agent cites sources in responses.
**Dependency:** `pgvector` Postgres extension.

### 5. In-app notifications (POST_V1 #26)
**Effort:** 4-6h
**Why:** You said "we need a main channel that notifies the user of things" when credits ran out silently.
**What:** Bell icon in Rails UI, `notifications` table with type/severity/link, ActionCable push. Triggers: job failed 3x, credit low, approval pending >1h, scheduled task errored.
**Dependency:** ActionCable (already set up).

### 6. Tool result caching
**Effort:** 2-3h
**Why:** Agent retries a WebSearch or Composio call with the same args → we pay again. 30-50% savings on repeated queries.
**What:** `tool_result_cache` table or Redis hash keyed by `(agent_id, tool_name, input_hash)` with 1h TTL. Intercept in tool wrapper before calling the real handler.
**Dependency:** None.

### 7. Eval harness
**Effort:** 4-6h
**Why:** Every prompt change is blind right now. You test by hand on Telegram.
**What:** `evals/` directory with YAML files: `{input: "...", expect: { tool_calls: ["GOOGLESHEETS_*"], forbid: ["Write *.csv"] }}`. Rake task runs all evals, reports pass/fail. Run before deploys.
**Dependency:** None.

---

## TIER 1 — Next 2 weeks (capability expansion)

### 8. Multi-agent / crews (POST_V1 #9)
**Effort:** 2-3d
**Why:** One agent can delegate to another. Unlocks "research crew + writer + reviewer" patterns. CrewAI's whole value prop.
**What:** `message_agent({ agent_id, instruction, wait_for_reply })` MCP tool. Routes through AgentEventBus. Parent agent pauses (via our `ask_user` pattern) until child responds. Results aggregated in conversation.
**Dependency:** Step 4 (task/conversation) — ✅ done.

### 9. Production deploy (POST_V1 #11)
**Effort:** 3-4d
**Why:** Currently running on your laptop. No multi-tenant SaaS until this.
**What:** Dockerfile for Rails + engine, docker-compose for local, Fly.io or AWS ECS for prod. S3 for ActiveStorage. Sentry + Better Stack already wired. Health check endpoints exist.
**Dependency:** None.

### 10. Pundit policies + org invites (POST_V1 #15 + #16)
**Effort:** 1d
**Why:** Can't have teammates in your org today. Blocker for real customers.
**What:** `Pundit` gem, roles: owner/admin/member/viewer. Email invite flow. Role-check before mutating agents/tasks/integrations.
**Dependency:** None.

### 11. Multi-model support (OpenAI fallback)
**Effort:** 2-3d
**Why:** Claude rate limits or breaks → everything stops. Vendor lock-in risk.
**What:** Abstract the `query()` call behind a `ModelProvider` interface. Implementations for Anthropic (existing) and OpenAI. Env flag to switch. Fallback on rate-limit errors.
**Dependency:** None. Bigger refactor since we use the Claude Agent SDK heavily.

### 12. Agent-to-human handoff (POST_V1 #10)
**Effort:** 1d
**Why:** Some conversations need a human. Agent escalates → human takes over in web UI.
**What:** `escalate_to_human({ reason })` MCP tool. Conversation status → `escalated`. Web UI shows the conversation to online admins. Human reply flows through same conversation, agent re-engages when human closes.
**Dependency:** In-app notifications (#5).

### 13. Slack channel (POST_V1 #12)
**Effort:** 1d
**Why:** Natural fit for B2B. Many orgs live in Slack.
**What:** Slack bolt bot per agent, Socket Mode. DM + mention triggers. Same event bus pattern as Telegram.
**Dependency:** None.

### 14. Stripe billing (POST_V1 #33)
**Effort:** 2-3d
**Why:** Can't sell without it.
**What:** Stripe Connect, usage-based pricing on agent API cost + message count, per-org plan tiers. Monthly invoicing.
**Dependency:** Agent budget tracking (#3).

### 15. Inbound webhook receivers (POST_V1 #22)
**Effort:** 2d
**Why:** External events → agent jobs. "HubSpot deal closed → email customer" automation.
**What:** Generic webhook endpoint `/webhooks/inbound/:org_slug/:hook_name` with HMAC verification. Triggers `task_assignment` via event bus.
**Dependency:** None.

---

## TIER 2 — Next month (polish + scale)

### 16. Vector/semantic search for recall (POST_V1 #6)
**Effort:** 1d
**Why:** `pg_trgm` is fuzzy string match. Embeddings handle synonyms, intent, paraphrasing.
**What:** Replace trigram search in `recall.search_messages` with pgvector cosine similarity using the HuggingFace local model we already load for routing.
**Dependency:** pgvector extension.

### 17. Per-contact profiles (POST_V1 #5)
**Effort:** 2d
**Why:** Right now each conversation is siloed. A contact reaching you via email AND Telegram has 2 separate conversations with no link.
**What:** `Contact` model linking conversations by email/phone/identifier. Facts table (name, company, role, preferences) built over time from agent notes. MCP tool `get_contact_profile(email_or_phone)`.
**Dependency:** None.

### 18. Auto-suggested recalls (POST_V1 #7)
**Effort:** 1d
**Why:** Agent forgets what it did last week unless user reminds it. Automatic context injection helps.
**What:** Before each inbound message, embed the user text, search messages/activity for the top 3 related items, inject as "Possibly related context" in the prompt.
**Dependency:** Vector search (#16).

### 19. Conversation analytics (POST_V1 #8)
**Effort:** 1d
**Why:** How well are your agents performing? No way to tell today.
**What:** Nightly job runs sentiment + resolution scoring on closed conversations. Dashboard shows: avg resolution time, sentiment trend, top failure modes.
**Dependency:** Observability dashboard (#2).

### 20. Mobile responsive UI (POST_V1 #32)
**Effort:** 1d
**Why:** Your main interaction is via Telegram on phone. Web UI is desktop-only.
**What:** Tailwind breakpoints, collapsible sidebar, touch-friendly controls. Test on phone viewport.
**Dependency:** None.

### 21. Voice channel (POST_V1 #13)
**Effort:** 3-4d
**Why:** ScribeMD's core market. Voice calls for medical scribing.
**What:** Twilio Voice + Whisper for STT + ElevenLabs for TTS. Agent responds in real-time during a call.
**Dependency:** None. Big integration.

### 22. Agent cloning + templates (POST_V1 #27 + #28)
**Effort:** 1d
**Why:** Reduces onboarding from "configure from scratch" to "one-click deploy an SDR."
**What:** Pre-built JSON configs for common roles (SDR, Support, Content Writer). UI picker on agent create.
**Dependency:** None.

### 23. Webhooks out (POST_V1 #23)
**Effort:** 4h
**Why:** External systems want to react to agent events.
**What:** Per-org outbound webhook config. Fires on: task completed, email sent, approval needed. HMAC signed.
**Dependency:** None.

### 24. Tests + CI (POST_V1 #38)
**Effort:** 1d
**Why:** 56 RSpec tests exist from earlier sprint. Need pipeline + linting.
**What:** GitHub Actions — RSpec + Vitest on every PR. Eslint + Rubocop + Prettier. Eval harness (#7) runs too.
**Dependency:** Eval harness (#7).

---

## TIER 3 — Nice to have (future)

### 25. Multi-org support (POST_V1 #19)
**Effort:** 1d · User belongs to N orgs, switcher dropdown.

### 26. Multi-account per provider (POST_V1 #25)
**Effort:** 1d · e.g. 3 Gmail accounts connected in one org.

### 27. Custom MCP server builder (POST_V1 #24)
**Effort:** 3-4d · No-code UI to define custom tools: name, endpoint, auth, params.

### 28. Org chart visualization (POST_V1 #29)
**Effort:** 1d · Visual agent tree with status, drag to reorganize.

### 29. White-labeling (POST_V1 #30)
**Effort:** 1d · Per-org branding, logo, email domain.

### 30. SMS channel (POST_V1 #14)
**Effort:** 2h · Twilio SMS. Small feature.

### 31. Email open/click tracking (POST_V1 #37)
**Effort:** 1d · Tracking pixel + link redirect.

### 32. Public REST API (POST_V1 #34)
**Effort:** 2-3d · For developers to integrate programmatically.

### 33. Skill marketplace (POST_V1 #36)
**Effort:** 1-2 weeks · Browse/install community skills, versioning, ratings.

### 34. Standalone engine (POST_V1 #35)
**Effort:** 1 week · LocalSqliteHost + CLI, run without Rails.

### 35. Agent memory layers
**Effort:** 3-4d · Semantic/episodic/procedural memory (Letta-style). Right now we have a flat 2200-char memory.md.

### 36. Progress summaries UI
**Effort:** 4h · Live "what am I doing" line in task modal, sourced from `agentProgressSummaries` on subagent runs.

### 37. Engine-side interrupt on cancel
**Effort:** 4h · Track active query by jobId, call `query.interrupt()` on cancel event.

### 38. Drop deprecated tables
**Effort:** 1h · After 1-week dual-write window: drop `task_comments`, `scheduled_tasks`, delete `scheduler.ts` + `heartbeat.ts`.

### 39. Security scan on Rails side
**Effort:** 2h · Add injection-scanner equivalent in Ruby for user-submitted text.

---

## Suggested order of work

**Week 1 (ship foundation):**
Day 1: #1 Streaming + #3 Budget limits (both quick wins)
Day 2-3: #2 Observability dashboard
Day 4-5: #4 RAG (pgvector + chunking + search tool)

**Week 2 (close obvious gaps):**
Day 1: #5 Notifications + #6 Tool caching
Day 2: #7 Eval harness + #24 CI pipeline
Day 3-5: #9 Production deploy

**Week 3 (team/billing):**
Day 1: #10 Pundit + invites
Day 2-4: #14 Stripe billing
Day 5: #38 Drop deprecated tables + clean up

**Week 4 (capability):**
Day 1-3: #8 Multi-agent orchestration
Day 4-5: #12 Human handoff + #18 Auto-suggested recalls

**Week 5+ (scale):**
#11 Multi-model, #16 Vector recall, #17 Contact profiles, #21 Voice

After week 2 you're **competitive with VoltAgent / CrewAI** on capability.
After week 4 you're **ahead of them on channels + production features**.

---

## Total scope

- 39 items remaining
- ~65 AI-assisted working days
- Realistic calendar: 3-4 months at current pace
