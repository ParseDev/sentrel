---
slug: gmail-management
name: Gmail Management
description: Read, search, send, and manage Gmail messages, threads, labels, and drafts via the Gmail REST API.
category: communication
icon: inbox
requires_connections:
  - google-mail
---

# Gmail Management

Call the Gmail REST API with the **`request`** tool (server `apps`):

```
request({ provider: "google-mail", method, path, query?, body? })
```

- **Base is `https://gmail.googleapis.com`** — give `path` relative, starting with `/` (e.g. `/gmail/v1/users/me/messages`).
- **`userId` is always `me`** — the connected account. Paths look like `/gmail/v1/users/me/...`.
- **Auth is injected for you.** NEVER ask for, include, or echo a token/OAuth credential.
- **Don't use any Gmail SDK, `gcloud`, or SMTP/IMAP.** Every action goes through `request(...)`.
- The tool result is `{ status, body }`. Read `body` for the JSON payload.

## base64url — READ THIS (Gmail encodes message bodies and raw sends)

Gmail uses **base64url** (RFC 4648 §5: `-` and `_` instead of `+` and `/`, padding optional), NOT standard base64. You'll hit it in two places:

- **Reading a body:** message payloads carry the text in `payload.body.data` or `payload.parts[].body.data` as base64url. Decode it to get the human-readable text.
- **Sending:** you build a full RFC 822 email string, then base64url-**encode** it into the `raw` field.

## Pagination — READ THIS (it's the #1 mistake)

List endpoints (`messages`, `threads`, `drafts`) return **one page (default ~100)** plus a `nextPageToken`.

1. Pass `query: { maxResults: 100 }`.
2. If the response has a `nextPageToken`, fetch the next page with `query: { ..., pageToken: <token> }` until there's no `nextPageToken`.
3. **"List all / show all" means ALL pages** — don't stop at page 1. Your role scopes what you *change*, not what you *report*.

```
// First page of unread
request({ provider:"google-mail", method:"GET", path:"/gmail/v1/users/me/messages",
          query:{ q:"is:unread", maxResults:100 } })
// → body: { messages:[{id, threadId}, ...], nextPageToken, resultSizeEstimate }

// Next page
request({ provider:"google-mail", method:"GET", path:"/gmail/v1/users/me/messages",
          query:{ q:"is:unread", maxResults:100, pageToken:"<nextPageToken>" } })
```

> List endpoints return **only `{ id, threadId }` stubs** — no subject/body. To read content you must `GET` each message id (see below). Start with the cheap list/search, then fetch only the ids that matter.

## Listing & searching messages

| Do | Call |
|---|---|
| List messages | `GET /gmail/v1/users/me/messages` · `query:{ maxResults:100 }` |
| Search messages | `GET /gmail/v1/users/me/messages` · `query:{ q:"<gmail search>", maxResults:100 }` |
| Filter by label id | `GET /gmail/v1/users/me/messages` · `query:{ labelIds:"INBOX", q:"is:unread" }` |

The `q` param uses the **same search syntax as the Gmail search box**:

| Want | `q` |
|---|---|
| From a sender | `from:alice@acme.com` |
| Unread only | `is:unread` |
| Last 7 days | `newer_than:7d` |
| To / subject | `to:me subject:invoice` |
| In a label | `label:agent` |
| Combine | `from:boss@acme.com is:unread newer_than:7d` |

## Reading a message

| Do | Call |
|---|---|
| Get full message | `GET /gmail/v1/users/me/messages/{id}` · `query:{ format:"full" }` |
| Headers only (fast) | `GET /gmail/v1/users/me/messages/{id}` · `query:{ format:"metadata", metadataHeaders:"From,Subject,Date" }` |
| Raw RFC 822 | `GET /gmail/v1/users/me/messages/{id}` · `query:{ format:"raw" }` |

`format` enum: `full` (parsed payload, default) · `metadata` (headers, no body) · `minimal` (ids/labels only) · `raw` (entire base64url RFC 822 in `body.raw`).

Reading the body from `format:"full"`:
- Subject/From/Date are in `payload.headers[]` (`[{ name, value }]`).
- **Plain text:** for a simple email, `payload.body.data`. For multipart, walk `payload.parts[]` and take the part with `mimeType:"text/plain"` (or `text/html`), then **base64url-decode** its `body.data`.

```
request({ provider:"google-mail", method:"GET",
          path:"/gmail/v1/users/me/messages/18f2a1c0deadbeef",
          query:{ format:"full" } })
// → decode payload.parts[].body.data (base64url) for the text
```

## Sending a message

`POST /gmail/v1/users/me/messages/send` with `body:{ raw:<base64url RFC 822> }`.

Build the email as a raw RFC 822 string (headers + blank line + body), then base64url-encode it:

```
To: alice@acme.com
Subject: Project update
Content-Type: text/plain; charset="UTF-8"

Hi Alice, here's the status...
```

```
request({ provider:"google-mail", method:"POST",
          path:"/gmail/v1/users/me/messages/send",
          body:{ raw:"VG86IGFsaWNlQGFjbWUuY29t..." } })  // base64url of the RFC 822 text above
```

- **Replying in-thread:** include `In-Reply-To:` and `References:` headers set to the original message's `Message-ID` header, AND pass `body:{ raw, threadId:<thread id> }`. Without these the reply starts a new thread.
- **HTML:** set `Content-Type: text/html; charset="UTF-8"` in the raw headers.

## Modifying labels (mark read, archive, label)

`POST /gmail/v1/users/me/messages/{id}/modify` · `body:{ addLabelIds:[...], removeLabelIds:[...] }`

| Do | Body |
|---|---|
| Mark as read | `{ removeLabelIds:["UNREAD"] }` |
| Mark as unread | `{ addLabelIds:["UNREAD"] }` |
| Archive (remove from inbox) | `{ removeLabelIds:["INBOX"] }` |
| Star | `{ addLabelIds:["STARRED"] }` |
| Apply a custom label | `{ addLabelIds:["<labelId>"] }` |
| Trash a message | `POST /gmail/v1/users/me/messages/{id}/trash` (no body) |

> System label ids are uppercase constants (`UNREAD`, `INBOX`, `STARRED`, `IMPORTANT`, `SPAM`, `TRASH`). Custom labels use their **label id** (e.g. `Label_42`), not the display name — list `GET /gmail/v1/users/me/labels` to resolve a name to its id. Use Gmail labels to track agent-sent mail so it stays filterable.

## Threads

| Do | Call |
|---|---|
| List threads | `GET /gmail/v1/users/me/threads` · `query:{ q:"is:unread", maxResults:100 }` |
| Get a thread (all messages) | `GET /gmail/v1/users/me/threads/{id}` · `query:{ format:"full" }` — returns `messages[]` |

A thread `GET` returns every message in the conversation, so it's the efficient way to read a back-and-forth instead of fetching ids one by one.

## Drafts (review-before-send)

| Do | Call |
|---|---|
| Create a draft | `POST /gmail/v1/users/me/drafts` · `body:{ message:{ raw:<base64url> } }` |
| List drafts | `GET /gmail/v1/users/me/drafts` · `query:{ maxResults:100 }` |
| Send a draft | `POST /gmail/v1/users/me/drafts/send` · `body:{ id:<draftId> }` |

Prefer create-draft + send-draft when the email is going **outside the workspace** — it gives you a verifiable draft before anything leaves. For external sends, gate behind `request_approval` with `payload_type: email_draft` so the user sees the body first.

## Errors — what to do

| Status | Meaning | Do |
|---|---|---|
| 401 | Bad/expired token | Connection issue — tell the user to reconnect Gmail at /integrations. Don't retry. |
| 403 | Insufficient scope OR rate/quota | If `body.error.message` mentions scope, the connection lacks send/modify permission — user must reconnect with the right access. If it mentions `rateLimitExceeded`/`userRateLimitExceeded`, back off and retry. |
| 404 | Message/thread/draft id not found | The id is wrong or was deleted. Don't assume a bug — re-list to get current ids. |
| 400 | Bad request | Usually a malformed `raw` (not base64url) or a bad `q`/label id. Read `body.error.message`, fix, retry. |
| 429 | Too many requests | Stop and back off, then retry the failed call. |

## Don't

- Don't send standard base64 where Gmail wants **base64url** — it'll 400.
- Don't expect subjects/bodies from a list call — list returns id stubs; `GET` each message.
- Don't stop at page 1 for "list all" — follow `nextPageToken`.
- Don't auto-reply to threads without the user asking — it can trip auto-reply detection and flag the account.
- Don't ask the user for a token — auth is already connected.
- Don't send marketing-style blasts from a personal Gmail; use a domain-verified workspace address or a real ESP.
