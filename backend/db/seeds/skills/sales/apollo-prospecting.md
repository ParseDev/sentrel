---
slug: apollo-prospecting
name: Apollo Prospecting
description: Find leads and enrich contacts using Apollo.io
category: sales
icon: users
requires_connections:
  - apollo
---

# Apollo Prospecting

Apollo's tools come from Composio — there is no separate API key. If a call fails with "no connected account", reconnect Apollo at `/integrations`.

## Searching for people
Use `APOLLO_SEARCH_PEOPLE` with the most specific filters you can:
- `person_titles`: array of decision-maker titles ("CTO", "VP Engineering", "Chief Medical Officer")
- `organization_locations`: cities, states, or countries
- `organization_num_employees_ranges`: e.g. `["11,500"]` for SMB-mid-market
- `q_organization_keyword_tags`: industry terms ("healthcare", "fintech", "SaaS")
- `page` + `per_page`: default `per_page: 25`. Don't pull 200+ at a time.

## Enriching a person
Use `APOLLO_ENRICH_PERSON` when you have a name + company but need email/phone. Pass `name` and `domain` (or `organization_name`).

## Sequences
`APOLLO_LIST_SEQUENCES` to find an existing cadence; `APOLLO_ADD_CONTACTS_TO_SEQUENCE` to enroll the leads you just found. Don't create new sequences without the user asking.

## Workflow

1. Define ICP from instructions (titles, company size, geo, industry).
2. `APOLLO_SEARCH_PEOPLE` with all filters set — quality over quantity.
3. Pick the **best** matches by buying signals (recent funding, recent hires, tech stack), not the first results.
4. If emails are missing, `APOLLO_ENRICH_PERSON` per row.
5. Drop into a Google Sheet or HubSpot per the user's request.

## Don't
- Don't web-search for a contact when Apollo is connected. Use the tool.
- Don't claim Apollo is "broken" because no results came back — try with broader filters first.
