---
name: email-newsletters
description: Use when sending newsletters, lifecycle/transactional emails, or managing subscriber lists via Listmonk (the self-hosted mailing-list manager). Covers fetching the API credential, the REST endpoints, the create-then-start campaign flow, and the hard rule that actually SENDING to a list needs approval.
---

# Email newsletters (Listmonk)

Listmonk is a self-hosted newsletter / mailing-list manager. It is **not a
Composio integration** — you reach it directly over its REST API using a
stored credential. This is the general pattern for any API-key service
that isn't on Composio: `secrets.get` for the key, then HTTP via the shell.

## Get the credential

```
secrets.get({ provider: "listmonk" })
→ { value: "api_user:token", base_url: "https://lists.yourbrand.com", ... }
```

- `value` is Listmonk's `api_user:token` pair (created in Listmonk under
  Admin → Users → API tokens).
- `base_url` is the instance URL. If the credential doesn't carry one, ask
  the owner for the Listmonk URL — never guess it.
- Auth header on every call: `Authorization: token <value>`.

If `secrets.get` says no credential is shared, tell the owner to add a
`listmonk` credential at /settings/credentials — don't proceed.

## Make calls (shell + curl)

```bash
curl -s -H "Authorization: token api_user:token" \
     -H "Content-Type: application/json" \
     "<base_url>/api/<endpoint>"
```

## Endpoints you'll use

| Need | Method + path | Notes |
|------|---------------|-------|
| List the mailing lists | `GET /api/lists` | get list IDs to target |
| Add a subscriber | `POST /api/subscribers` | `{ email, name, lists: [id], status: "enabled" }` |
| Bulk query subscribers | `GET /api/subscribers` | filter with SQL-ish `query` param |
| Create a campaign | `POST /api/campaigns` | draft only — does NOT send |
| **Start (send) a campaign** | `PUT /api/campaigns/{id}/status` | `{ "status": "running" }` — THIS SENDS |
| Campaign stats | `GET /api/campaigns/{id}` | views, clicks, bounces |
| One-off transactional | `POST /api/tx` | `{ subscriber_email, template_id, data, content_type }` |

### Create a campaign (draft)

```bash
curl -s -X POST "<base_url>/api/campaigns" \
  -H "Authorization: token api_user:token" -H "Content-Type: application/json" \
  -d '{ "name":"Spring sale", "subject":"Our biggest sale yet ☀️",
        "lists":[3], "type":"regular", "content_type":"richtext",
        "body":"<h1>…</h1>" }'
```

This returns the campaign `id` in `draft` status. Nothing is sent yet.

### Send it — approval required

Starting a campaign blasts real email to the whole list. This is the
email equivalent of publishing a post: **draft the campaign, then submit
the send for approval** (the `send_email` / publish gate). Only after a
yes do you flip the status:

```bash
curl -s -X PUT "<base_url>/api/campaigns/{id}/status" \
  -H "Authorization: token api_user:token" -H "Content-Type: application/json" \
  -d '{ "status":"running" }'
```

## Rules

1. **Drafting is free, sending is not.** Creating a campaign, adding
   subscribers, and reading stats are routine. Setting a campaign to
   `running` (or sending `/api/tx` to a list) sends real mail — draft it,
   show the subject + audience + body preview, and get approval first.
2. **Target the right list.** Always `GET /api/lists` and confirm the list
   id + subscriber count before drafting. Sending to the wrong list is not
   undoable.
3. **On brand.** Subject and body follow the brand voice in the
   brand-and-safety policy, same as social copy.
4. **Respect consent.** Only ever add subscribers the brand has permission
   to email. Never import a purchased or scraped list.
5. **Report results.** After a send, pull `GET /api/campaigns/{id}` and
   include opens/clicks/bounces in the weekly report alongside social and
   ad numbers.
