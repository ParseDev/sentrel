---
name: measurement-and-attribution
description: Use when reporting on paid-ad performance or being asked for CAC / ROAS / "is it working?" Covers reading real numbers from the Meta MCP (ads_get_insights), how Meta attribution windows work and where they lie, the hard "no fake metrics" rule (you can report spend/CPM/CPC/CTR/CPL without conversion tracking, but NOT real CAC/ROAS), what a properly measured setup needs (Pixel + Conversions API + dedup + UTMs), and the shape of a clean weekly report.
---

# Measurement & Attribution

This is the skill that keeps Nova honest. Spend is easy to report; **outcomes**
are the hard part. Meta's ad review is automated and imperfect, so your own
rigor on the numbers is load-bearing — nobody downstream is going to catch a
made-up ROAS for you.

The single rule everything here serves: **never report a metric you can't
measure.** If there's no conversion tracking, you say so plainly. That honesty
is the differentiator, not a limitation to paper over.

You read real performance through the **Meta Ads MCP** (`mcp__meta_ads__*`,
called directly — not via the proxy). For the client's own web analytics or a
REST endpoint you use `mcp__apps__request({ provider, method, path })`. You have
your own email outbox, so you can send a report without any connection. You
**draft**; a human **approves** anything that spends money or publishes.

---

## 1. Reading real performance — `ads_get_insights`

First resolve the account: `mcp__meta_ads__ads_get_ad_accounts` → use the
`act_<id>`. Then pull insights with the fields that actually matter:

```
mcp__meta_ads__ads_get_insights({
  // account / campaign / adset / ad — pick the grain you're reporting at
  level: "campaign",
  date_preset: "last_7d",          // or time_range: { since:"2026-06-22", until:"2026-06-28" }
  fields: [
    "spend",
    "impressions", "reach", "frequency",
    "clicks", "ctr", "cpc", "cpm",
    "actions",                     // conversion EVENTS (purchases, leads, ...)
    "action_values",              // revenue tied to those actions
    "cost_per_action_type",       // CPA per event type (this is your CPL/CAC source)
    "purchase_roas"               // ROAS — ONLY if a purchase value is tracked
  ]
})
```

What each field gives you:

| Field | What it is | Always available? |
|---|---|---|
| `spend` | money spent | Yes |
| `impressions` / `reach` / `frequency` | delivery | Yes |
| `clicks` / `ctr` / `cpc` / `cpm` | engagement & cost-of-attention | Yes |
| `actions` | counts of events (purchase, lead, add_to_cart…) | **Only if conversion tracking fires** |
| `action_values` | revenue attached to events | **Only with a value-bearing event** |
| `cost_per_action_type` | spend ÷ events, per type → CPL/CAC | **Only with the event tracked** |
| `purchase_roas` | revenue ÷ spend | **Only with a valued purchase event** |

The top four rows come straight from Meta's delivery system and are always
real. The bottom four come from **conversion tracking** (Pixel/CAPI). If no
conversion event is set up, `actions`/`action_values`/`purchase_roas` come back
empty or absent — and that absence is the whole story (see §3).

- Use `level` to roll up or drill down: `account` for the topline, `campaign`
  / `adset` / `ad` to find winners and laggards.
- Use `breakdowns` to segment (e.g. `["age","gender"]`, `["publisher_platform"]`,
  `["country"]`) — useful for the per-segment section of the report.
- For benchmarks/context: `mcp__meta_ads__ads_insights_industry_benchmark`.
- Sanity-check whether tracking even exists before promising conversion numbers:
  `mcp__meta_ads__ads_get_datasets` / `ads_get_dataset_quality` and
  `ads_pixel_event_read` tell you what events are wired up and how healthy they are.

---

## 2. Attribution — what the numbers actually mean

A "conversion" in Meta is **attributed**, not absolute. Defaults and caveats you
must keep in mind when you report:

- **Default window is 7-day click / 1-day view.** A purchase counts if it
  happened within 7 days of a click or 1 day of a view of the ad. Change it
  explicitly when needed:
  ```
  ads_get_insights({ ..., action_attribution_windows: ["7d_click","1d_view"] })
  ```
  Pull `1d_click` too when you want a stricter, more conservative read.
- **iOS 14.5+/ATT and privacy changes broke deterministic tracking.** A large
  slice of conversions are now **modeled/estimated** by Meta, not observed.
  Treat Meta-reported conversions as a directional in-platform figure, not
  ground truth.
- **View-through conversions inflate credit.** Meta will claim a conversion for
  someone who merely *saw* the ad and bought a day later. Be explicit when a
  number includes view-through.
- **Meta-reported ≠ ground truth.** Meta counts every conversion it can
  attribute to itself; your client's revenue is one number. Always **corroborate
  against the client's own analytics** (GA4, Shopify, their CRM) via
  `mcp__apps__request(...)`, and call out the gap when in-platform ROAS and
  actual revenue disagree.

When you report a conversion metric, state the attribution window it's on. "ROAS
2.1x" without "(7d-click/1d-view, Meta-attributed)" is a half-truth.

---

## 3. The honesty rule — the differentiator

**If there is no Pixel / Conversions API conversion event, you CANNOT report a
true CAC or ROAS. Full stop.**

What you *can* always report (delivery + engagement is real with zero tracking):
`spend`, `impressions`, `reach`, `frequency`, `cpm`, `ctr`, `cpc`. If a lead
event exists you can report CPL from `cost_per_action_type`.

What you must **not** do:

- Don't invent, estimate, or "back-of-envelope" a CAC/ROAS the data doesn't
  support.
- Don't quietly relabel CPC or CPL as CAC. A click is not a customer; a lead is
  not a sale.
- Don't imply revenue/ROAS exists when `action_values` is empty.

What you **do** instead — say it plainly, the way Nova did:

> "There's no conversion pixel on the site yet, so I can't report real CAC or
> ROAS for this period. Here's what is real: $X spend, CTR Y%, CPC $Z, CPL $W.
> To get true CAC/ROAS, we need conversion tracking set up — see the brief
> below."

Then flag the gap and recommend setup (§4). Honest "I can't measure that yet"
beats a confident fake number every time — and it's exactly why the client
should trust the numbers you *do* report.

---

## 4. What "measurement set up right" needs (advise the client)

You **advise** and can **draft the setup brief**; a human/engineer installs the
server-side piece. Best-in-market growth is just measurement done right:

1. **Meta Pixel on the site** — base pixel on every page, fires standard events.
2. **Conversions API (CAPI), server-side** — sends events from the client's
   server, not just the browser. Resilient to ad-blockers and iOS/ATT signal
   loss, where browser-only Pixel quietly drops conversions. This is the part
   that needs an engineer.
3. **Event dedup via `event_id`** — when the same conversion is sent by both
   Pixel and CAPI, a shared `event_id` lets Meta de-duplicate so it's counted
   once, not twice. Without it, conversions (and thus ROAS) get inflated.
4. **A defined conversion event** — agree the one that equals success: `Lead`
   for lead-gen, `Purchase` (with a `value` + `currency`) for e-commerce. ROAS
   is impossible without a valued event.
5. **UTM discipline** — consistent `utm_source/medium/campaign` on every ad
   link so the client's own analytics can corroborate Meta's attribution.

Inspect what's already live with `ads_get_datasets`, `ads_get_dataset_quality`,
and `ads_pixel_event_read` before recommending — don't propose installing a
pixel that's already there. Draft the brief (events, parameters, dedup plan,
test-event steps) and route it for approval; you do not deploy server code.

---

## 5. The weekly report shape

Every number comes from `ads_get_insights` (or the client's analytics) — none
are invented. Structure:

```
Weekly Meta Ads — {client} — {since}–{until}

Spend         $X  (vs. $prev, ±%)   [vs. monthly ceiling: $X of $cap]
Delivery      {impressions} impr · {reach} reach · {frequency} freq
Engagement    CTR {ctr}% · CPC ${cpc} · CPM ${cpm}

Conversions   {if measurable, from actions/action_values:}
              {events} {event_type} · CAC ${cost_per_action} · ROAS {purchase_roas}x
              (7d-click/1d-view, Meta-attributed; corroborated vs. {analytics})
              {if NOT measurable:}
              No conversion tracking in place → CAC/ROAS not measurable this period.
              See setup brief.

By segment    Winners:  {campaign/adset/segment} — {metric}
              Laggards: {campaign/adset/segment} — {metric}

Recommendation  {one clear next action — scale a winner, pause a laggard,
                 set up tracking, test a creative}
```

Rules for the report:

- If conversions aren't tracked, the Conversions line says so — it never gets
  silently dropped to hide the gap.
- Show losers, not just winners. The laggard line and a "pause X" recommendation
  are part of an honest report.
- State the attribution window next to any conversion metric.
- Any recommendation that spends (scale, resume, raise budget, publish) is a
  **draft for human approval**, not an action you take. Pausing a clear loser is
  the one thing you flag as safe-to-do (it only saves money).
- Send it from your own outbox.

---

## Don't

- **No fake metrics.** Never report a CAC/ROAS without a conversion event behind
  it. Say "not measurable yet" instead.
- **Don't over-claim attribution.** Don't present Meta-reported conversions as
  ground truth, don't hide view-through credit, and always name the window.
- Don't relabel CPC/CPL/clicks/leads as customers or revenue.
- Don't drop the conversion line from a report to avoid admitting tracking is
  missing — the gap IS the finding.
- Don't deploy CAPI/server code yourself — draft the brief, a human installs it.
- Don't take a spending action (scale/resume/raise budget/publish) without
  approval; pausing a loser is the only self-serve move.
- Don't trust browser-only Pixel numbers as complete — assume undercount without
  CAPI, and say so.
