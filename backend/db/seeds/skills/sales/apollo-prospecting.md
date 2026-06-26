---
slug: apollo-prospecting
name: Apollo Prospecting
description: Find leads, enrich contacts, search organizations, and enroll into sequences via the Apollo.io REST API.
category: sales
icon: users
requires_connections:
  - apollo
---

# Apollo Prospecting

Call the Apollo.io REST API with the **`request`** tool (server `apps`):

```
request({ provider: "apollo", method, path, query?, body? })
```

- **Base is `https://api.apollo.io`** — give `path` relative, starting with `/` (e.g. `/api/v1/mixed_people/search`).
- **Auth is injected for you.** Apollo uses an API key; it's added as the `X-Api-Key` header automatically. NEVER ask for, include, or echo an API key.
- **Most Apollo write/search endpoints are `POST`** with a JSON `body` — not query strings. Pass filters in `body`.
- **Credits are real money.** Search is cheap; enrichment (revealing emails/phones) **burns credits**. Search first, enrich only the chosen leads. See the credit caveat below.

## Pagination

Search endpoints return **one page** controlled by `page` / `per_page` in the body.

1. Default `per_page: 25`. Don't fetch `100`+ unless the user needs a large list — bigger pages are slower and you rarely need them.
2. The response includes a `pagination` object: `{ page, per_page, total_entries, total_pages }`. To get more, increment `page` until `page >= total_pages`.
3. Paginate **sequentially** (page 1, wait, page 2, …). Apollo rate-limits hard — never fan out parallel page calls.

```
// People search, page 1
request({ provider:"apollo", method:"POST", path:"/api/v1/mixed_people/search",
          body:{ person_titles:["VP of Sales"], person_locations:["United States"],
                 page:1, per_page:25 } })
```

## Search people (the workhorse)

`POST /api/v1/mixed_people/search` — filters go in `body`. Pass arrays even for a single value.

| Filter | Meaning |
|---|---|
| `person_titles` | Job titles, e.g. `["Chief Medical Officer", "Practice Administrator"]` (matches similar titles too) |
| `person_seniorities` | `["owner","founder","c_suite","vp","director","manager"]` |
| `person_locations` | Person's location, e.g. `["United States","California"]` |
| `organization_locations` | Company HQ location |
| `organization_num_employees_ranges` | Headcount ranges as comma strings, e.g. `["1,10","11,50","51,200"]` |
| `q_organization_keyword_tags` | Industry / company keywords, e.g. `["healthcare","primary care"]` |
| `q_keywords` | Free-text keyword across the record |
| `organization_ids` | Restrict to specific Apollo org ids |
| `q_organization_domains_list` | Restrict to specific company domains, e.g. `["acme.com"]` |
| `contact_email_status` | `["verified","likely to engage"]` to bias toward reachable people |
| `page` / `per_page` | Pagination |

```json
{
  "person_titles": ["Chief Medical Officer", "Practice Administrator", "Medical Director"],
  "person_locations": ["United States"],
  "organization_num_employees_ranges": ["1,10", "11,50", "51,200"],
  "q_organization_keyword_tags": ["healthcare", "medical practice", "primary care"],
  "per_page": 25,
  "page": 1
}
```

> `mixed_people/search` returns people **and** their organizations in one call — prefer it over the older `/api/v1/people/search` for prospecting. Search results contain Apollo `id`s but **not** verified emails — those come from enrichment.

### Get the ICP BEFORE you search

Never pass placeholder values (`"placeholder"`, `"test"`, `"example"`, `"TODO"`). If you lack a real value, **ask the user**. Minimum before the first call:

- **Titles** — role / seniority?
- **Industry / keywords** — what kind of company?
- **Company size** — solo, SMB, mid-market, enterprise?
- **Location** — country / state / city?

If the agent persona already names the ICP (most SDR agents do), USE IT — don't re-ask. If the persona is silent, ask before searching.

## Enrich / match a person (burns credits — be deliberate)

`POST /api/v1/people/match` — reveals a single person's contact info. Provide enough to pin to ONE person:

- `first_name` + `last_name` (or `name`) **plus** `domain` or `organization_name`, OR
- `email` (partial ok), OR
- `linkedin_url`, OR
- `id` (the Apollo person id from a prior search — cleanest)

| Param | Effect |
|---|---|
| `reveal_personal_emails` | `true` to reveal personal emails — **consumes credits** |
| `reveal_phone_number` | `true` to reveal a phone — **consumes credits**, and requires `webhook_url` (phones return async) |

```
request({ provider:"apollo", method:"POST", path:"/api/v1/people/match",
          body:{ id:"<person_id_from_search>", reveal_personal_emails:true } })
```

**Bulk:** `POST /api/v1/people/bulk_match` with `details: [ {…}, {…} ]` (up to 10) enriches several at once in ONE call — use it instead of 10 separate `match` calls.

> **Credit caveat:** plain `/match` (work email already in Apollo's data) is cheap; setting `reveal_personal_emails`/`reveal_phone_number` is what spends meaningful credits. Workflow: search → let the user pick the leads worth contacting → enrich only those. Don't enrich an entire search page reflexively.

## Search organizations

`POST /api/v1/mixed_companies/search` — find companies (accounts) directly.

| Filter | Meaning |
|---|---|
| `q_organization_name` | Company name (partial match ok) |
| `organization_locations` | HQ location array |
| `organization_num_employees_ranges` | Headcount ranges, e.g. `["51,200","201,500"]` |
| `q_organization_keyword_tags` | Industry keywords |
| `page` / `per_page` | Pagination |

Use the returned org `id`s to feed `organization_ids` into `mixed_people/search` when you want people at specific companies. (Enforced limit: 50k records / 500 pages — add filters to narrow.)

## Save contacts & enroll into a sequence

| Do | Call |
|---|---|
| Create a contact in your workspace | `POST /api/v1/contacts` · `body:{ first_name, last_name, email?, title?, organization_name?, label_names?:[] }` |
| Find an existing sequence id | `POST /api/v1/emailer_campaigns/search` · `body:{ q_name:"<sequence name>", page:1, per_page:25 }` |
| Add contacts to a sequence | `POST /api/v1/emailer_campaigns/{sequence_id}/add_contact_ids` · `query:{ emailer_campaign_id:"<same id>", send_email_from_email_account_id:"<email_account_id>" }` · `body:{ contact_ids:["<id>", …] }` |

Enrollment rules:

1. **Get the real `sequence_id` first** via the search endpoint — it looks like `64f...`, NOT `"placeholder"`. If no sequence exists, tell the user; don't create one without an explicit ask.
2. `emailer_campaign_id` in the query **must equal** the `sequence_id` in the path.
3. `send_email_from_email_account_id` is required — it's the connected mailbox the cadence sends from. If you don't have it, ask; don't guess.
4. **Only enroll after the user approves the list and names the sequence.** Never bulk-enroll silently.

## Never fan out parallel Apollo calls

Apollo rate-limits aggressively. Five parallel searches "one per company" will ALL fail with vague errors. Rules:

1. **One Apollo call at a time.** No parallel `request(...)` calls to `provider:"apollo"`. Sequential only.
2. **People at multiple companies** → one `mixed_people/search` with multiple `organization_ids` or `q_organization_domains_list` values. Don't loop.
3. **More people at one company** → one `mixed_people/search` with that `organization_ids` and a higher `per_page`. Don't issue 5 paginated calls in parallel.
4. **Bulk enrichment** → one `bulk_match` with up to 10 people. Don't make 10 `match` calls.

## Workflow

1. **Read the persona's ICP**, or ask the user if it's undefined.
2. `POST /api/v1/mixed_people/search` with real, specific filters.
3. Score the top 5–10 by buying signals — recent funding, recent hires, tech stack, growth.
4. For the chosen leads only, enrich via `/api/v1/people/match` (or `bulk_match`, ≤10) to fill emails/phones.
5. Hand the list back as a readable table (name, title, company, email if found, why each fits).
6. Enroll into a sequence only after the user confirms which sequence and approves the list.

## Errors — what to do

| Status | Meaning | Do |
|---|---|---|
| 401 | Bad/missing API key | Connection issue — tell the user to reconnect Apollo at /integrations. Don't retry. |
| 403 | Insufficient plan / endpoint needs a master key (e.g. add-to-sequence) | The connected Apollo plan/key can't do this action. Surface the message; don't loop. |
| 422 | Validation failed — often a placeholder or bad id | Read the message (e.g. "is not a valid ID"). Fix the arg or ASK the user. Don't resend the same body. |
| 429 | Rate limited (or too many parallel calls) | Stop. Switch to ONE call at a time and back off, then retry. |
| 200 + empty results | Filters too narrow | Broaden one filter at a time — drop location, widen employee range, swap keyword tags. Don't immediately report "no results." |

## Don't

- Don't web-search for a prospect when Apollo is connected.
- Don't ask the user for an Apollo API key — auth is already injected as `X-Api-Key`.
- Don't pass placeholder strings — ask the user instead.
- Don't enrich (reveal emails/phones) an entire search page — it burns credits. Enrich only chosen leads.
- Don't fan out parallel Apollo calls — sequential only.
- Don't bulk-enroll into a sequence without explicit user approval.
- Don't claim "Apollo isn't working" because of a 422 — that means your args are wrong, not that the integration is broken.
