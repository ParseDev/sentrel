---
name: email-newsletters
description: Use when sending newsletters, lifecycle, or one-off marketing emails. Defaults to the agent's own outbox (its own address, no connection needed); use a connected ESP for true bulk lists. Actually SENDING to a list needs approval.
---

# Email newsletters

You already have your **own email address** (e.g. `nova@<workspace>.double.md`)
and a built-in **outbox** — you do NOT need to connect Gmail or any app to send
mail as yourself. That's the default path. Reach for an ESP/Gmail only when the
job specifically calls for it (see "When to use what").

## Default: send from your own outbox (no connection needed)

To send an email, write a JSON file to `workspace/outbox/` with a unique
filename (e.g. `workspace/outbox/spring-sale-jane.json`). The platform picks it
up and sends it from your address.

```json
{
  "to": "subscriber@example.com",
  "cc": [],
  "bcc": [],
  "subject": "Our biggest sale yet ☀️",
  "body_text": "Plain-text version of the email",
  "body_html": "<h1>Spring sale</h1><p>…</p>",
  "attachments": ["reports/q4.pdf"]
}
```

- `body_html` is optional; it falls back to `body_text`.
- `attachments` are paths relative to your workspace dir.
- For a small, personalized list, write **one JSON file per recipient** so each
  gets a clean `To:` line — don't put 200 people in one `to`.
- This is the same mechanism as the `send-email` skill — newsletters are just
  marketing-shaped emails on top of it.

## When to use what

| Sending… | Use |
|----------|-----|
| Anything **as yourself** — a note, a lifecycle email, a small segment | **your outbox** (above) — default |
| A **true bulk newsletter** to a managed list (unsubscribe, deliverability, reporting) | a connected **ESP** (Mailchimp / SendGrid / Customer.io) via the `request` proxy |
| Sending **from a specific person's mailbox** (the owner's actual Gmail, reading their inbox) | the connected **Gmail** (`provider: "google-mail"`) |

Don't fan out hundreds of individual outbox/Gmail sends for a real blast — that's
what an ESP is for (list management + deliverability + unsubscribe handling).

## Bulk newsletters through an ESP

When an ESP is connected, you call its REST API through the **`request`** tool
(server `apps`): `request({ provider, method, path, query?, body? })`. Auth is
injected — never ask for or echo a token; the result is `{ status, body }`. The
pattern is always **draft first, send is a separate gated action**. Example
against a Mailchimp-style API (`provider: "mailchimp"`):

| Need | Method + path | Notes |
|------|---------------|-------|
| List audiences | `GET /3.0/lists` | get the list id to target |
| Create a campaign | `POST /3.0/campaigns` | draft only — does NOT send |
| Set the content | `PUT /3.0/campaigns/{id}/content` | subject/body |
| **Send the campaign** | `POST /3.0/campaigns/{id}/actions/send` | THIS SENDS |
| Campaign report | `GET /3.0/reports/{id}` | opens, clicks, bounces |

Slugs/endpoints differ per ESP — check the connected app's docs — but the shape
holds: draft, preview, then a gated send.

## Rules

1. **Drafting is free, sending is not.** Composing, writing the outbox JSON, or
   creating a draft campaign is routine. Actually sending to a list (writing the
   outbox file that goes out, or the ESP send action) sends real mail — show the
   subject + audience + body preview and get approval first (the send/publish
   gate).
2. **Target the right list.** Confirm the list id + subscriber count before
   drafting. Sending to the wrong list isn't undoable.
3. **On brand.** Subject and body follow the brand voice in the brand-and-safety
   policy, same as social copy.
4. **Respect consent.** Only email people the brand has permission to email.
   Never import a purchased or scraped list.
5. **Report results.** After a send, pull the ESP campaign report (opens/clicks/
   bounces) and include it in the weekly report alongside social and ad numbers.
