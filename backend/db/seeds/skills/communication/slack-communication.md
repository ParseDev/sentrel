---
slug: slack-communication
name: Slack Communication
description: Post messages, read channels and history, and look up users via the Slack Web API.
category: communication
icon: message-square
requires_connections:
  - slack
---

# Slack Communication

Call the Slack Web API with the **`request`** tool (server `apps`):

```
request({ provider: "slack", method, path, query?, body? })
```

- **Base is `https://slack.com/api`** — give `path` relative, starting with `/` (e.g. `/chat.postMessage`).
- **Auth is injected for you.** NEVER ask for, include, or echo a token.
- **Almost every Slack method is `POST`** with a body. Slack accepts both `application/json` and form bodies — send `body:{...}` as JSON. (A few read methods also accept `GET` with `query`, but `POST` works everywhere.)
- **ALWAYS check `body.ok`.** Slack returns HTTP `200` even on failure; the real status is `ok: true|false` with an `error` string (e.g. `channel_not_found`, `not_in_channel`). A `200` does NOT mean it worked.

```
// Post a message — then verify it landed
const r = request({ provider:"slack", method:"POST", path:"/chat.postMessage",
                    body:{ channel:"C0123ABCD", text:"Deploy finished :white_check_mark:" } })
if (!r.body.ok) { /* handle r.body.error — do NOT assume success */ }
```

## The `ok` / `error` check — READ THIS (it's the #1 mistake)

1. After every call, look at `body.ok`. If `false`, read `body.error` and act on it — don't pretend it succeeded.
2. Some responses add `body.response_metadata.messages[]` with warnings (e.g. bad block fields) even when `ok:true` — worth a glance after posting blocks.
3. Common errors: `channel_not_found` (wrong/inaccessible ID), `not_in_channel` (join first — see below), `is_archived`, `users_not_found`, `invalid_blocks`, `ratelimited`.

## Pagination — cursor-based

List/history methods return **one page** (default ~100). To get everything:

1. Pass `limit` (up to 1000, but 200 is friendlier) in the body/query.
2. Read `body.response_metadata.next_cursor`. If it's a **non-empty string**, pass it back as `cursor` on the next call. When it's empty/absent, you're done.
3. **"List all / read all" means loop until `next_cursor` is empty** — don't stop at page 1.

```
// All channels (loop until next_cursor is empty)
request({ provider:"slack", method:"GET", path:"/conversations.list",
          query:{ types:"public_channel,private_channel", exclude_archived:true,
                  limit:200, cursor:"<next_cursor or omit on first call>" } })
```

## Posting messages

| Do | Call |
|---|---|
| Post a message | `POST /chat.postMessage` · `body:{ channel, text }` |
| Post with Block Kit | `POST /chat.postMessage` · `body:{ channel, text:"<fallback>", blocks:[...] }` |
| Reply in a thread | `POST /chat.postMessage` · `body:{ channel, thread_ts:"<parent ts>", text }` |
| Reply + show in channel | `POST /chat.postMessage` · `body:{ channel, thread_ts, text, reply_broadcast:true }` |
| Edit a message | `POST /chat.update` · `body:{ channel, ts:"<message ts>", text }` |
| Delete a message | `POST /chat.delete` · `body:{ channel, ts }` |
| Ephemeral (only one user sees) | `POST /chat.postEphemeral` · `body:{ channel, user:"U…", text }` |

> `channel` may be an ID (`C…` channel, `G…` group, `D…` DM) or a `#channel-name`, but **IDs are reliable** — resolve names to IDs once (see below) and reuse them.
> Always include `text` even when sending `blocks` — it's the notification/fallback and accessibility string.
> On success you get back `body.ts` (the new message's timestamp) — keep it to thread replies or edit later.

## Reading channels & history

| Do | Call |
|---|---|
| List channels | `GET /conversations.list` · `query:{ types:"public_channel,private_channel", exclude_archived:true, limit:200 }` |
| Get channel info | `GET /conversations.info` · `query:{ channel:"C…" }` |
| Read recent messages | `GET /conversations.history` · `query:{ channel:"C…", limit:50 }` |
| Read replies in a thread | `GET /conversations.replies` · `query:{ channel:"C…", ts:"<parent ts>" }` |
| Join a public channel | `POST /conversations.join` · `body:{ channel:"C…" }` |
| Open/find a DM | `POST /conversations.open` · `body:{ users:"U…" }` → returns `body.channel.id` to post to |

> `conversations.history` / `conversations.replies` take `oldest`, `latest`, `inclusive` (timestamps) to window a time range, and paginate with `cursor` like everything else.
> Getting `not_in_channel` when posting/reading a public channel? Call `conversations.join` first, then retry.

## Looking up users

| Do | Call |
|---|---|
| Get a user by ID | `GET /users.info` · `query:{ user:"U…" }` |
| Find a user by email | `GET /users.lookupByEmail` · `query:{ email:"a@b.com" }` → `body.user.id` |
| List all users | `GET /users.list` · `query:{ limit:200 }` (paginate with `cursor`) |

> To @-mention someone in a message, use their **ID** as `<@U012ABCDE>` in `text` — plain `@name` does not notify.

## Formatting (`mrkdwn`)

Slack uses its own `mrkdwn`, **not** standard Markdown:

- `*bold*`, `_italic_`, `~strike~`, `` `code` ``, ```` ```block``` ````.
- Links: `<https://example.com|click here>` (angle brackets, `|` separates label).
- Mentions: `<@U012ABCDE>` (user), `<#C012ABCDE>` (channel), `<!here>` / `<!channel>` (use sparingly).
- `mrkdwn` is on by default; set `body.mrkdwn:false` to send literal text.
- For rich layouts (sections, dividers, buttons) use `blocks` — and still set `text` as the fallback.

## Rate limits & errors — what to do

Slack rate-limits **per method, per workspace**, by tier (Tier 1 ~1/min … Tier 4 ~100+/min; `conversations.list` is Tier 2 ~20/min). `chat.postMessage` is special-cased at roughly **1 msg/sec per channel** with short bursts.

| Signal | Meaning | Do |
|---|---|---|
| `body.ok:false`, `error:"ratelimited"` (or HTTP `429`) | Rate limited | Read the **`Retry-After`** response header (seconds) and wait that long before retrying. Don't hammer. |
| `error:"channel_not_found"` | Bad/inaccessible channel | Re-resolve the name → ID; the connected account may not see that channel. |
| `error:"not_in_channel"` | Bot isn't a member | `POST /conversations.join` (public), then retry. For private channels the bot must be invited. |
| `error:"is_archived"` | Channel archived | Can't post; pick another channel. |
| `error:"users_not_found"` | No such email/user | The email isn't in this workspace, or the lookup scope is missing. |
| `error:"invalid_blocks"` / `invalid_arguments` | Bad payload | Fix the `blocks` JSON / arguments and retry. |
| `error:"not_authed"` / `invalid_auth` / `token_revoked` | Auth problem | Connection issue — tell the user to reconnect Slack at /integrations. Don't retry. |

## Workflow

1. Resolve channel name → ID once at session start (`conversations.list`), then reuse IDs.
2. Send messages with `text` only — never paste raw JSON or stack traces unless the user asked.
3. Use threaded replies (`thread_ts`) when continuing a conversation; don't start a new top-level message for a follow-up.
4. For broadcast-y messages (announcements, summaries), gate behind `request_approval` with `payload_type: external_share`.

## Don't

- Don't trust the HTTP `200` — always check `body.ok`.
- Don't stop at page 1 for "list all" / "read all" — loop on `next_cursor`.
- Don't @-mention `<!channel>` / `<!here>` or everyone unless explicitly asked.
- Don't post to `#general` without explicit permission.
- Don't paste long content inline — share a link instead.
- Don't ask the user for a token — auth is already connected.
