---
slug: calendar-booking
name: Calendar Booking
description: Check availability and schedule meetings via Google Calendar
category: productivity
icon: calendar
requires_connections:
  - googlecalendar
---

# Calendar Booking

## Checking availability

`GOOGLECALENDAR_FIND_FREE_SLOTS` — pass `time_min` (ISO 8601), `time_max`, `duration_minutes`, optionally a list of `attendees` to compute a joint free window. Returns candidate slots.

For "this week" → `time_min: <today 9am user-tz>`, `time_max: <Friday 6pm user-tz>`. Respect business hours unless the user says otherwise.

## Creating an event

`GOOGLECALENDAR_CREATE_EVENT`:
- `summary`: title ("Alchemy <> ScribeMD — Casper / Elie")
- `start.dateTime` + `end.dateTime` (ISO 8601 with timezone)
- `attendees`: `[{ email: "...", optional: false }]`
- `conference_data`: `{ create_request: { request_id: "<uuid>", conference_solution_key: { type: "hangoutsMeet" } } }` to auto-attach a Google Meet link
- `description`: agenda + any prep links
- `send_updates`: "all" so attendees get the invite email

## Updating / canceling

`GOOGLECALENDAR_UPDATE_EVENT` for time changes; `GOOGLECALENDAR_DELETE_EVENT` for cancellations. Both must include `event_id`.

## Workflow

1. Confirm timezone with the user (don't assume PT/ET).
2. Find 2-3 candidate slots before proposing.
3. Pre-confirm via `request_approval` with payload_type `generic` + a `preview_markdown` showing the proposed event.
4. On approval, create the event with Meet link.
5. Send a confirmation message with the join URL.

## Don't

- Don't create the event before the user confirms.
- Don't pick "10 AM PT" blindly — ask the user's preferred default timezone once and remember it in MEMORY.md.
