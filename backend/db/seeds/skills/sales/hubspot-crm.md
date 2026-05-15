---
slug: hubspot-crm
name: HubSpot CRM
description: Manage contacts, deals, and pipeline in HubSpot
category: sales
icon: database
requires_connections:
  - hubspot
---

# HubSpot CRM

HubSpot tools come from Composio. If a call returns "no connected account", reconnect HubSpot at `/integrations`.

## Common operations

- `HUBSPOT_SEARCH_CONTACTS` — find a contact by email/name. Always search first before creating to avoid duplicates.
- `HUBSPOT_CREATE_CONTACT` — add a new contact with `email`, `firstname`, `lastname`, `company`, `jobtitle`, `phone`. Email is required.
- `HUBSPOT_GET_CONTACT` / `HUBSPOT_LIST_CONTACTS` — retrieve.
- `HUBSPOT_CREATE_DEAL` — create a deal. Required: `dealname`, `pipeline`, `dealstage`. Optional: `amount`, `closedate`, `hubspot_owner_id`.
- `HUBSPOT_UPDATE_DEAL` — move stages, update amount.

## Standard inbound-lead flow

1. Search by email — does the contact exist?
2. If yes, fetch the contact record and any associated deals.
3. If no, create the contact with whatever enriched fields you have.
4. Create a deal in stage "Lead" (or whatever the user's pipeline calls the entry stage).
5. Use deal name format `{Company} — {Reason}` (e.g. "Acme — Discovery").
6. Set deal source where the lead came from (Apollo Outbound, Inbound Form, Referral).
7. Comment in the conversation thread with the contact + deal links.

## Don't

- Don't create duplicate contacts. Always search by email first.
- Don't guess pipeline / stage names. List them once at the start of a session, cache the IDs in MEMORY.md.
- Don't move a deal to "Closed Won/Lost" without explicit user confirmation via `request_approval`.
