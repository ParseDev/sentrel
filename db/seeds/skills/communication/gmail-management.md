---
slug: gmail-management
name: Gmail Management
description: Read, search, and manage Gmail messages via Google API
category: communication
icon: inbox
requires_connections:
  - gmail
---

# Gmail Management

Gmail tools come from Composio. If a call returns "no connected account", reconnect Gmail at `/integrations`.

## Reading

- `GMAIL_FETCH_EMAILS`: pull recent emails. Pass `max_results` (default 10), `query` (Gmail search syntax — `from:`, `to:`, `subject:`, `is:unread`, `newer_than:7d`, `label:`).
- `GMAIL_SEARCH`: same query language, returns matching message IDs only — cheaper for filtering.

## Sending

- `GMAIL_SEND_EMAIL`: `to`, `subject`, `body` (HTML or text). Optional `cc`, `bcc`, `reply_to_message_id` for threaded replies.
- `GMAIL_CREATE_DRAFT` + `GMAIL_SEND_DRAFT`: two-step when you want to verify before send. Prefer this when the email is going outside the workspace.

## Replies

- `GMAIL_REPLY_TO_EMAIL`: pass `message_id` and the `body`. Maintains the thread automatically.

## Workflow

1. For "check my inbox" requests, start with `GMAIL_SEARCH` (cheap), then `GMAIL_FETCH_EMAILS` only on the IDs that matter.
2. For external sends (anyone outside the org), gate behind `request_approval` with `payload_type: email_draft` so the user sees the body before it goes.
3. Use Gmail labels to track agent-sent emails — add `label: "agent"` so it's filterable.

## Don't

- Don't pull `max_results: 500` on every check. Start with 20, narrow with `query`.
- Don't auto-reply to threads without the user asking — Gmail's threading hooks into auto-reply detection and can flag the account.
- Don't send marketing-style emails from a personal Gmail. Use a domain-verified workspace address (or pass through a real ESP).
