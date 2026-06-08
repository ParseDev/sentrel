# `agent.json` — portable agent template spec

`agent.json` is the file format we use to publish, share, and re-install an
agent. One self-contained JSON document captures the agent's persona,
capabilities, approval rules, model settings, and the full skill bundles
(every `SKILL.md` + supporting files embedded inline). No remote fetches at
install time — what you import is what you get.

Spec version covered here: **`1.0`**.

---

## Why a spec, not a database export

A flat `pg_dump` of `agent_templates` + `skill_definitions` would work inside
one Alchemy install, but it carries internal IDs, organization fkeys, encrypted
credential blobs, and runtime state nobody else's instance can use. `agent.json`
is the smaller, durable contract:

- **Portable**: any Alchemy install can import any v1 file. Imports across
  organizations and across instances are first-class — slug collisions are
  silently forked, so an import never mutates the importer's existing skills.
- **Safe to share**: credentials and channel tokens are stripped on export.
  Only non-secret hints (`credentials_required[]`, `channels_required[]`) remain
  so the user knows what to wire up after importing.
- **Self-contained**: every skill referenced in `skills[]` includes its
  `SKILL.md` and all supporting files inline. No "this template needs skill
  `foo`, fetch it from somewhere" indirection.
- **Versioned**: each Publish creates an immutable `AgentTemplateVersion` row.
  History is browsable; specific versions are installable.

We don't claim cross-framework compatibility. The spec is open and documented
here; other frameworks are free to implement an importer if they choose. We
only promise that Alchemy's own Importer round-trips Alchemy's own Exporter.
If you want to interoperate with a third-party framework, verify their spec
matches before committing to it.

---

## Top-level shape

```jsonc
{
  "spec_version": "1.0",
  "kind": "agent",
  "name": "Outbound SDR",
  "role": "B2B SaaS prospector",
  "description": "Hunts mid-market accounts, drafts personalized first touches.",
  "category": "sales",
  "icon": "rocket",
  "license": "CC-BY-4.0",

  "metadata": { "exported_at": "...", "exported_by": { ... }, "source_agent_public_id": "agt_..." },
  "persona":  { "identity_md": "...", "personality_md": "...", "instructions_md": "...", "email_signature_md": "..." },
  "model":    { "provider": "anthropic", "model_id": "claude-opus-4-7", "temperature": 0.7, "max_tokens": 8192, "thinking_level": "medium" },
  "capabilities": { "knowledge_base": { "enabled": true }, "scheduling": { "enabled": true }, ... },
  "permissions":  { "send_email": "draft" },
  "spend_caps":   { "daily_usd": 10, "monthly_usd": 200, "notify_threshold_pct": 0.8 },
  "approval_mode": "smart",
  "approval_rules": [ { ... } ],

  "skills":                [ { /* full SKILL.md + files inline */ } ],
  "integrations_required": [ { "service": "gmail", "why": "send + read mail" } ],
  "credentials_required":  [ { "kind": "generic", "provider": "stripe", "name_hint": "stripe-prod" } ],
  "channels_required":     [ { "type": "email", "why": "primary inbound" } ],
  "runtime_hints":         { "claude_agent_sdk": { "tool_routing": "smart" } }
}
```

### Field reference

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `spec_version`           | string | yes  | Must be `"1.0"` for this spec. Importer rejects unknown versions. |
| `kind`                   | string | yes  | Only `"agent"` is defined. Future kinds (`"team"`, `"flow"`) get their own files. |
| `name`                   | string | yes  | Display name on the template card + new-agent default. |
| `role`                   | string | no   | One-line role label ("B2B SaaS prospector"). |
| `description`            | string | no   | 1–3 sentence summary on the template card. |
| `category`               | string | no   | One of `starter`, `sales`, `support`, `marketing`, `engineering`, `people`, `personal`, `ops`. Unknown values bucket as `starter`. |
| `icon`                   | string | no   | Lucide icon slug. UI falls back to a generic bot if missing. |
| `license`                | string | no   | SPDX-style identifier (`CC-BY-4.0` is the recommended default). Free-form is allowed; the UI surfaces whatever is here. |
| `metadata.exported_at`   | string | no   | ISO8601 export timestamp. Informational. |
| `metadata.exported_by`   | object | no   | `{ name, org }` of the publisher. Informational. |
| `metadata.source_agent_public_id` | string | no | The `agt_…` ID this was exported from. Lets a user trace provenance back if they have access. |
| `persona.identity_md`    | string | no   | Markdown. Supports the `{{agent_name}}`, `{{company_name}}`, `{{user_name}}`, `{{role}}` substitutions at install time. |
| `persona.personality_md` | string | no   | Markdown. Same substitution. |
| `persona.instructions_md`| string | no   | Markdown. Same substitution. |
| `persona.email_signature_md` | string | no | Used as default email signature. |
| `model.provider`         | string | no   | `anthropic`, `anthropic_account`, `openai`, etc. The Installer can promote `anthropic` → `anthropic_account` when the importer opts into OAuth. |
| `model.model_id`         | string | no   | e.g. `claude-opus-4-7`. |
| `model.temperature`      | number | no   | |
| `model.max_tokens`       | number | no   | |
| `model.thinking_level`   | string | no   | Provider-specific (`low`/`medium`/`high` for Claude). |
| `capabilities`           | object | no   | Map of capability key → `{ enabled, provider?, …config }`. Deep-merged into the new agent's capability config on install. |
| `permissions`            | object | no   | Map of action key → permission level (`block` / `draft` / `auto`). |
| `spend_caps`             | object | no   | `daily_usd`, `monthly_usd`, `notify_threshold_pct`. |
| `approval_mode`          | string | no   | `strict` / `smart` / `loose`. |
| `approval_rules[]`       | array  | no   | Per-agent approval rules only. Org-wide rules are intentionally **not** templated (they belong to the importing org, not the template). |
| `skills[]`               | array  | no   | Each entry is a **full skill bundle** (see below). |
| `integrations_required[]` | array | no   | Hint to the importer: this template expects these integration services to be connected post-install. |
| `credentials_required[]` | array  | no   | Hint: per-agent credentials this template references by name. No secret values. |
| `channels_required[]`    | array  | no   | Hint: channel types (`email`, `telegram`, `slack`, …) the agent expects. |
| `runtime_hints`          | object | no   | Open-ended namespace for runtime-specific hints. Unknown keys are ignored. |

### Embedded skill bundle

```jsonc
{
  "slug": "send-stripe-invoice",
  "name": "Send Stripe invoice",
  "description": "Draft and send a Stripe invoice from a brief description",
  "category": "finance",
  "icon": "receipt",
  "requires_connections": ["stripe"],
  "required_capabilities": [],
  "files": [
    { "path": "SKILL.md",        "content": "# Send Stripe invoice\n...", "file_type": "md" },
    { "path": "scripts/poll.py", "content": "import stripe\n...",         "file_type": "py" }
  ]
}
```

Every file referenced by the skill is embedded verbatim. The Importer upserts
the bundle into the new org as a `SkillDefinition` + `SkillFile` rows. If a
skill with the same slug already exists in the org but with different content,
the imported version is silently forked to `<slug>-imported-<n>` and the
template's `skills[].slug` is rewritten to match. The org's existing skill is
never modified.

### Approval rules

```jsonc
{
  "label": "Auto-approve LinkedIn ≤3/day",
  "payload_type": "linkedin_post",
  "predicate":    { "max_per_day": 3 },
  "auto_decision": "approve",
  "enabled":       true,
  "scope":         "agent"
}
```

Only `scope: "agent"` rules are templated. Org-wide rules belong to the
importing organization's policy, not to the agent template.

---

## What's **stripped** before export

If a value is secret, instance-specific, or pure runtime state, the Exporter
drops it before serializing:

- Encrypted credential values (the credential's `name_hint` + `provider`
  survive; the secret does not).
- Channel auth: email auth tokens, Telegram bot tokens, Slack webhooks, etc.
- Conversation history, memory_md, audit log, tasks, scheduled work.
- Spend counters, install counts, last-active timestamps.
- Org-wide approval rules (the importer's org has its own).
- Fly machine IDs, instance/region/hostnames, anything tied to the source
  install.

The importer never sees those fields. A leaked `agent.json` cannot impersonate
the original agent on its original integrations.

---

## Versioning + the publish/install loop

- **Publishing** an agent calls `AgentTemplates::Publisher.new(agent:, template: nil_or_existing, ...)`. If `template` is nil, a new `AgentTemplate` is created with `current_version_id = v1`. If `template` is existing, a new `AgentTemplateVersion` is appended and `current_version_id` is moved forward. Older versions remain installable forever.
- **Installing** a template uses `AgentTemplates::Installer.new(definition:, agent_attrs:, user:, organization:)`. The definition can come from a version row OR a raw paste — same code path. The Installer runs persona variable substitution, deep-merges capability config, creates the AI config, and upserts each embedded skill bundle.
- **Versions are immutable.** The only mutable field on `AgentTemplateVersion` is `published` (so an owner can hide a buggy version). Corrections are made by publishing a new version, not editing an old one.

### Picking a specific version on install

The hire-this-agent flow passes `?version=N` through to the new-agent picker.
Without `version=`, the template's `current_version` is installed.

---

## Evolution policy

- **1.x is additive.** Adding new optional top-level keys (`spend_caps`,
  `runtime_hints`) is a `1.x` change — old importers ignore unknown keys, new
  importers gain new capabilities. We bump the patch number in
  `SUPPORTED_SPEC_VERSIONS` documentation but the on-wire `spec_version`
  stays `"1.0"` until a breaking change.
- **A breaking change → 2.0.** Renaming, removing, or changing the
  semantics of an existing field requires `spec_version = "2.0"` and an
  Importer migration shim that can read 1.0 files into the 2.0 shape. We
  won't ship 2.0 until at least one real consumer asks for the breaking
  change.
- **Unknown keys are ignored.** Importers should accept unknown top-level
  keys silently and surface them only in `runtime_hints` (which is
  intentionally open for runtime-specific extensions).
- **`runtime_hints` is a namespaced extension point.** Add hints under your
  runtime's name (`claude_agent_sdk`, `mistral_agents`, …) so they can be
  read by that runtime and ignored by others without collision.

---

## Examples

### Minimal valid file

```jsonc
{
  "spec_version": "1.0",
  "kind": "agent",
  "name": "Inbox triager",
  "persona": {
    "identity_md": "# Identity\nI sort {{user_name}}'s inbox into reply / archive / wait."
  }
}
```

This is enough to install — defaults fill in the rest (no skills, no
custom capabilities, default model).

### Full file with skills, capabilities, and approvals

See an exported sample from any community template — every published
template's "agent.json" tab on `/agent_templates/:slug` shows the live
file. Click **Download** on that pane to grab one to inspect.

---

## Producing and consuming `agent.json`

- **Producing**: from the agent edit page, click **agent.json** (no
  template created — just downloads the file) or **Publish to community**
  (creates a versioned `AgentTemplate` and stores the definition as v1).
- **Consuming**: at `/agent_templates`, click **Import from JSON** — paste,
  upload, or paste a URL. Server-side fetches are HTTPS-only with a 1MB
  body cap and 10s timeout. The form previews the parsed `name` / `role` /
  `license` / `skill count` before you click Import.

The two paths share one validator (`AgentTemplates::Importer`) and one
installer (`AgentTemplates::Installer`), so what you see on import preview
is exactly what gets persisted.
