---
slug: calendar-booking
name: Calendar Booking
description: Check availability and schedule meetings via the Google Calendar REST API — free/busy, list, create, update, and cancel events with Google Meet links.
category: productivity
icon: calendar
requires_connections:
  - google-calendar
---

# Calendar Booking

Call the Google Calendar API with the **`request`** tool (server `apps`):

```
request({ provider: "google-calendar", method, path, query?, body? })
```

- **Base is `https://www.googleapis.com/calendar/v3`** — give `path` relative, starting with `/` (e.g. `/calendars/primary/events`).
- **Auth is injected for you.** NEVER ask for, include, or echo a token.
- Use **`primary`** as the calendar id for the connected account's main calendar.
- All times are **ISO 8601 with an explicit timezone offset** (e.g. `2026-06-25T15:00:00-07:00`). Don't send bare local times.
- Result is `{ status, body }` — read `body` for the JSON payload.

## Checking availability — free/busy

```
request({ provider:"google-calendar", method:"POST", path:"/freeBusy",
          body:{ timeMin:"2026-06-25T09:00:00-07:00",
                 timeMax:"2026-06-26T18:00:00-07:00",
                 items:[ { id:"primary" } ] } })
```

- `items` is the list of calendars to check — add `{ id: "<attendee-email>" }` entries to compute a joint free window (you only see calendars the account can read; others come back without busy detail).
- Response: `body.calendars["primary"].busy` is an array of `{ start, end }` busy blocks. Free slots are the gaps between them within your `timeMin`/`timeMax`.
- For "this week" → `timeMin: <today 9am user-tz>`, `timeMax: <Friday 6pm user-tz>`. Respect business hours unless the user says otherwise.

## Listing events

```
request({ provider:"google-calendar", method:"GET", path:"/calendars/primary/events",
          query:{ timeMin:"2026-06-25T00:00:00-07:00",
                  timeMax:"2026-06-26T00:00:00-07:00",
                  singleEvents:true, orderBy:"startTime", maxResults:100 } })
```

- **Always pass `singleEvents=true` and `orderBy=startTime`** — without `singleEvents`, recurring events come back as a single rule (and `orderBy:"startTime"` is rejected). With it, each occurrence is its own item.
- Each event has `id`, `summary`, `start.dateTime`/`start.date`, `end`, `attendees`, `hangoutLink`.

### Pagination

List returns one page (default ~250, cap with `maxResults`). If `body.nextPageToken` is present, fetch the next page with `query:{ pageToken:<token>, singleEvents:true, orderBy:"startTime" }` and repeat until there's no `nextPageToken`. **"List all" means every page** — don't stop at page 1.

## Creating an event

```
request({ provider:"google-calendar", method:"POST", path:"/calendars/primary/events",
          query:{ conferenceDataVersion:1, sendUpdates:"all" },
          body:{
            summary:"Alchemy <> ScribeMD — Casper / Elie",
            description:"Agenda + any prep links",
            start:{ dateTime:"2026-06-26T10:00:00-07:00", timeZone:"America/Los_Angeles" },
            end:{   dateTime:"2026-06-26T10:30:00-07:00", timeZone:"America/Los_Angeles" },
            attendees:[ { email:"elie@example.com" } ],
            conferenceData:{ createRequest:{
              requestId:"<uuid>",
              conferenceSolutionKey:{ type:"hangoutsMeet" } } }
          } })
```

- `summary`: the title.
- `start` / `end`: `dateTime` (ISO 8601 + offset) plus an IANA `timeZone`.
- `attendees`: `[{ email }]` — Google emails the invite.
- **Google Meet link:** add `conferenceData.createRequest` with a unique `requestId` and `conferenceSolutionKey.type: "hangoutsMeet"`. This ONLY takes effect if you pass **`conferenceDataVersion=1`** as a query param — omit it and the Meet link is silently dropped. The link comes back as `body.hangoutLink`.
- **`sendUpdates:"all"`** (query param) so attendees actually receive the invite email. Use `"none"` to add an event quietly.

## Updating an event

```
request({ provider:"google-calendar", method:"PATCH",
          path:"/calendars/primary/events/<eventId>",
          query:{ sendUpdates:"all", conferenceDataVersion:1 },
          body:{ start:{ dateTime:"...", timeZone:"..." },
                 end:{ dateTime:"...", timeZone:"..." } } })
```

- `PATCH` is a partial update — send only the fields you're changing; everything else is preserved.
- Pass `sendUpdates:"all"` so attendees are notified of the reschedule. Keep `conferenceDataVersion=1` if the body touches `conferenceData`.

## Canceling an event

```
request({ provider:"google-calendar", method:"DELETE",
          path:"/calendars/primary/events/<eventId>",
          query:{ sendUpdates:"all" } })
```

- A successful delete returns `204` with an empty body. `sendUpdates:"all"` sends the cancellation notice.

## Workflow

1. Confirm timezone with the user (don't assume PT/ET).
2. Use `/freeBusy` to find 2-3 candidate slots before proposing.
3. Pre-confirm via `request_approval` with payload_type `generic` + a `preview_markdown` showing the proposed event.
4. On approval, create the event (with `conferenceDataVersion=1` + `sendUpdates:"all"`) and grab `body.hangoutLink`.
5. Send a confirmation message with the join URL.

## Errors — what to do

| Status | Meaning | Do |
|---|---|---|
| 401 | Bad/expired token | Connection issue — tell the user to reconnect Google Calendar at /integrations. Don't retry. |
| 403 + `rateLimitExceeded`/`userRateLimitExceeded` | Rate limited | Back off and retry after a short wait. |
| 403 + `forbiddenForNonOrganizer` | Not the organizer | You can only modify events the connected account owns; for others, only RSVP. |
| 404 | Missing OR no access | The event/calendar doesn't exist or this account can't see it — don't assume it's a bug. |
| 409 | Conflict (duplicate id) | The `requestId`/event id was already used; generate a fresh one. |
| 410 | Gone | The event was already deleted. Treat the cancel as done. |

## Don't

- Don't create the event before the user confirms.
- Don't pick "10 AM PT" blindly — ask the user's preferred default timezone once and remember it in MEMORY.md.
- Don't expect a Meet link without `conferenceDataVersion=1`.
- Don't omit `sendUpdates:"all"` when the user expects attendees to be notified.
- Don't stop at page 1 when listing "all" events — follow `nextPageToken`.
