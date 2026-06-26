---
slug: hubspot-crm
name: HubSpot CRM
description: Read and write HubSpot contacts, companies, deals, associations, and notes via the HubSpot CRM REST API.
category: sales
icon: database
requires_connections:
  - hubspot
---

# HubSpot CRM

Call the HubSpot CRM REST API with the **`request`** tool (server `apps`):

```
request({ provider: "hubspot", method, path, query?, body? })
```

- **Base is `https://api.hubapi.com`** — give `path` relative, starting with `/` (e.g. `/crm/v3/objects/contacts`).
- **Auth is injected for you.** NEVER ask for, include, or echo a token / API key / private app token.
- **Every HubSpot action goes through `request(...)`.** There is no CLI.
- Records are returned as `{ id, properties: {...}, createdAt, updatedAt }`. Most useful fields live under `properties`.
- To get back specific fields on reads, pass `query: { properties: "email,firstname,lastname,company" }` (comma-separated, not a JSON array).

## Pagination — READ THIS

List and search endpoints return **one page** (list default 10, max 100; search default 10, max 200). To get everything:

1. Pass `query: { limit: 100 }` on list endpoints (or `limit: 200` in the search `body`).
2. If the response has `paging.next.after`, fetch the next page using that cursor:
   - **List (GET):** `query: { limit: 100, after: "<paging.next.after>" }`
   - **Search (POST):** `body: { ..., limit: 200, after: "<paging.next.after>" }`
3. Loop until there is no `paging.next`. **"List all / show all" means ALL pages** — don't stop at page 1.
4. Search has a hard cap of **10,000 results** per query; narrow your filters if you hit it.

```
// First page of all contacts
request({ provider:"hubspot", method:"GET", path:"/crm/v3/objects/contacts",
          query:{ limit:100, properties:"email,firstname,lastname,company" } })
// Next page
request({ provider:"hubspot", method:"GET", path:"/crm/v3/objects/contacts",
          query:{ limit:100, after:"<paging.next.after>" } })
```

## Search (ALWAYS search by email before creating a contact)

`POST /crm/v3/objects/{object}/search` with a `filterGroups` body. Filters in one group are **AND**; multiple groups are **OR**. Max 5 groups, 6 filters each, 18 total.

```
// Find a contact by email BEFORE creating, to avoid duplicates
request({ provider:"hubspot", method:"POST", path:"/crm/v3/objects/contacts/search",
  body:{
    filterGroups:[{ filters:[{ propertyName:"email", operator:"EQ", value:"jane@acme.com" }] }],
    properties:["email","firstname","lastname","company","hs_object_id"],
    limit:1
  }})
// results[] empty  -> contact does not exist, create it
// results[0].id    -> contact exists, use this id (don't create a dupe)
```

Operators: `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `BETWEEN` (+`highValue`), `IN`/`NOT_IN` (value is an array), `HAS_PROPERTY`, `NOT_HAS_PROPERTY`, `CONTAINS_TOKEN`, `NOT_CONTAINS_TOKEN`. Sort with `sorts:[{ propertyName:"createdate", direction:"DESCENDING" }]` (one sort only).

> **Search is rate limited to ~5 requests/second per account** and is eventually consistent — a contact created seconds ago may not appear in search yet. For an immediate read-after-write, GET the record by id instead.

## Contacts

| Do | Call |
|---|---|
| List contacts | `GET /crm/v3/objects/contacts` · `query:{ limit:100, properties:"email,firstname,lastname,company" }` |
| Get one contact | `GET /crm/v3/objects/contacts/{contactId}` · `query:{ properties:"email,firstname,lastname,company,jobtitle,phone" }` |
| Get by email | `GET /crm/v3/objects/contacts/{email}` · `query:{ idProperty:"email" }` |
| Search contacts | `POST /crm/v3/objects/contacts/search` · `body:{ filterGroups, properties?, limit?, after? }` |
| Create a contact | `POST /crm/v3/objects/contacts` · `body:{ properties:{ email, firstname, lastname, company, jobtitle, phone } }` |
| Update a contact | `PATCH /crm/v3/objects/contacts/{contactId}` · `body:{ properties:{ ... } }` |

```
// Create (email is the dedupe key — search first!)
request({ provider:"hubspot", method:"POST", path:"/crm/v3/objects/contacts",
  body:{ properties:{
    email:"jane@acme.com", firstname:"Jane", lastname:"Doe",
    company:"Acme", jobtitle:"VP Eng", phone:"+15551234567"
  }}})
```

> Creating a contact whose `email` already exists returns **409**. Search/GET by email first, then PATCH the existing record instead.

## Deals

| Do | Call |
|---|---|
| List deals | `GET /crm/v3/objects/deals` · `query:{ limit:100, properties:"dealname,amount,dealstage,pipeline,closedate" }` |
| Get a deal | `GET /crm/v3/objects/deals/{dealId}` |
| Search deals | `POST /crm/v3/objects/deals/search` · `body:{ filterGroups, ... }` |
| Create a deal | `POST /crm/v3/objects/deals` · `body:{ properties:{ dealname, pipeline, dealstage, amount?, closedate?, hubspot_owner_id? } }` |
| Update / move stage | `PATCH /crm/v3/objects/deals/{dealId}` · `body:{ properties:{ dealstage?, amount? } }` |

> `pipeline` and `dealstage` are **internal IDs**, not the labels you see in the UI. Don't guess them. List them once with `GET /crm/v3/pipelines/deals` (each pipeline has `id` + `stages[].id`), then cache the IDs in MEMORY.md.

## Associations (link a contact to a deal, etc.)

HubSpot v4 associations. Use the **default** (unlabeled) association for normal links.

| Do | Call |
|---|---|
| Associate (default) | `PUT /crm/v4/objects/{fromObjectType}/{fromId}/associations/default/{toObjectType}/{toId}` (no body) |
| List a record's associations | `GET /crm/v4/objects/{fromObjectType}/{fromId}/associations/{toObjectType}` · `query:{ limit:100 }` |
| Remove an association | `DELETE /crm/v4/objects/{fromObjectType}/{fromId}/associations/{toObjectType}/{toId}` |

```
// Link contact -> deal (default association)
request({ provider:"hubspot", method:"PUT",
  path:"/crm/v4/objects/contacts/512/associations/default/deals/8841" })
```

> You can also create associations at object-create time by adding an `associations` array to the create `body` — but the default-association PUT above is simpler and idempotent.

## Notes & engagements

Notes (and calls/emails/tasks) are CRM objects under `/crm/v3/objects/notes`. `hs_timestamp` is required (epoch ms or ISO 8601). Associate the note to the record in the same call.

```
request({ provider:"hubspot", method:"POST", path:"/crm/v3/objects/notes",
  body:{
    properties:{ hs_note_body:"Inbound lead from website form.", hs_timestamp:"2026-06-25T12:00:00Z" },
    associations:[{
      to:{ id:"512" },
      types:[{ associationCategory:"HUBSPOT_DEFINED", associationTypeId:202 }]  // note -> contact
    }]
  }})
```

> `associationTypeId` differs per object pair (e.g. note→contact is `202`, note→deal is `214`). If unsure, create the note first, then use the v4 association PUT above.

## Standard inbound-lead flow

1. **Search by email** (`/contacts/search`, `EQ` filter) — does the contact exist?
2. If yes, GET the contact and list its associated deals (`/crm/v4/objects/contacts/{id}/associations/deals`).
3. If no, create the contact with whatever enriched fields you have (`POST /contacts`).
4. Create a deal in the pipeline's entry stage (`POST /deals`) — use the cached pipeline/stage **IDs**, not labels.
5. Deal name format `{Company} — {Reason}` (e.g. "Acme — Discovery").
6. Associate contact → deal (`PUT /crm/v4/.../associations/default/...`).
7. Add a note (`POST /notes`) and comment the contact + deal links in the conversation thread.

## Errors — what to do

| Status | Meaning | Do |
|---|---|---|
| 401 | Bad/expired token | Connection issue — tell the user to reconnect HubSpot at `/integrations`. Don't retry. |
| 403 | Missing scope | The connected app lacks a CRM scope (e.g. `crm.objects.deals.write`). Tell the user to reconnect with the needed scopes. |
| 404 | Not found | The record id / object type doesn't exist, or this account can't see it. Don't assume a bug. |
| 409 | Conflict | Usually a duplicate (e.g. contact email already exists). Search/GET the existing record and PATCH it instead of creating. |
| 422 | Validation failed | Read `message` / `errors[]` — usually a bad property name, a label used where an internal ID is required, or a missing required field. |
| 429 | Rate limited | Back off and retry. Search is its own ~5 req/sec budget; check `Retry-After` if present. |

## Don't

- Don't create duplicate contacts — always search by `email` first.
- Don't guess pipeline / stage names — they are internal IDs; list and cache them.
- Don't stop at page 1 for "list all" — follow `paging.next.after` until it's gone.
- Don't move a deal to "Closed Won/Lost" without explicit user confirmation via `request_approval`.
- Don't ask the user for a token / API key — auth is already connected.
