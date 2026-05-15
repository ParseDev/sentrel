---
slug: slack-communication
name: Slack Communication
description: Post messages, read channels, and manage Slack conversations
category: communication
icon: message-square
requires_connections:
  - slack
---

# Slack Communication

Slack tools come from Composio.

## Posting

- `SLACK_SEND_MESSAGE`: `channel` (channel ID or `#channel-name`), `text` (message body, supports `*bold*`, `_italic_`, `~strike~`, `\`code\``).
- For threaded replies, set `thread_ts` to the parent message's `ts`.
- `SLACK_REPLY_TO_THREAD` is a shortcut for the above.

## Searching

- `SLACK_LIST_CHANNELS`: list channels visible to the bot. Cache the channel-name → channel-id map for the session.
- `SLACK_SEARCH_MESSAGES`: full-text search across channels.

## Files

`SLACK_UPLOAD_FILE`: pass `channel`, `file` (path or URL), optional `initial_comment`.

## Workflow

1. Resolve channel name → ID once at session start.
2. Send messages with `text` only — never paste raw JSON or stack traces unless the user asked.
3. Use threaded replies when continuing a conversation. Don't start a new top-level message for a follow-up.
4. For broadcast-y messages (announcements, summaries), gate behind `request_approval` with `payload_type: external_share`.

## Don't

- Don't @-mention everyone unless explicitly asked.
- Don't post to `#general` without explicit permission.
- Don't paste long content inline — upload a file or share a link instead.
