---
name: meta-ads
description: Use when creating, running, optimizing, or reporting on Meta (Facebook/Instagram) paid ad campaigns. Covers the campaign→ad-set→ad→creative assembly order via the Meta Ads MCP, uploading creative, reading insights, pausing/scaling, and the hard budget + approval rules around spending money. Also covers the safety/compliance guardrails: Special Ad Category detection, budget-ramp + spend-safety throttling, account-health protection, a non-delivery ($0 spend / 0 impressions) triage playbook, and the pre-publish brand-safety self-gate (Meta's own review is automated and imperfect).
---

# Meta Ads

You run paid campaigns on Meta through the **dedicated Meta Ads MCP** —
tools named `mcp__meta_ads__*`. This is the one app that does NOT go through
the `mcp__apps__request` proxy; call its MCP tools directly. Spending real
money is gated behind approval and the monthly ceiling. Pausing is the one
thing you may do on your own — it only ever saves money.

First, resolve the ad account: `mcp__meta_ads__ads_get_ad_accounts` →
use the `act_<id>` you'll pass to the create calls.

## Before you build anything: Special Ad Categories

**Do this check before the first `ads_create_campaign` call.** Some offers
fall into a regulated **Special Ad Category**. If yours does and you don't
declare it, the campaign is non-compliant and Meta can restrict it or the
account — and you cannot retrofit the category onto a live campaign.

Read the offer/brief and decide if it's any of these. If so, pass
`special_ad_categories` (an array) on `ads_create_campaign`:

| Category | `special_ad_categories` value | Triggers — the ad is about… |
| --- | --- | --- |
| Credit | `CREDIT` | Financial products/services: credit cards, loans, banking, insurance, "buy now pay later" |
| Housing | `HOUSING` | Real estate listings, rentals, mortgages, homeowners insurance |
| Employment | `EMPLOYMENT` | Job openings, hiring, recruiting, internships, career fairs |
| Social issues, elections or politics | `ISSUES_ELECTIONS_POLITICS` | Political/social-issue advocacy, candidates, ballot measures, legislation |

**ScribeMD note:** ScribeMD is healthcare / clinician-facing. Most product
ads are NOT special-category, **but any ad recruiting clinicians (hiring,
"join our team", "now hiring nurses/MDs") IS Employment** — declare
`EMPLOYMENT`.

When a category applies, **warn the human in the approval** that targeting is
restricted and adjust the ad set accordingly:
- Age is locked to **18–65+** (you can't narrow it).
- **No gender targeting** (must be all genders).
- **No Lookalike Audiences** and **no detailed-targeting exclusions.**
- Location targeting has a **~15-mile minimum radius** (no tight ZIP/postal
  targeting).

If you're unsure whether an offer qualifies, treat it as in-scope and ask the
human — under-declaring is the costly mistake.

## The funnel — assemble in this order

Meta's object model is nested. Create top-down:

1. `mcp__meta_ads__ads_create_campaign` — the campaign holds the
   **objective** (e.g. `OUTCOME_SALES`, `OUTCOME_TRAFFIC`,
   `OUTCOME_AWARENESS`) and starts paused.
2. `mcp__meta_ads__ads_create_ad_set` — targeting, placements, schedule, and
   the **budget** (`daily_budget` or `lifetime_budget`, in minor units /
   cents). This is where spend is set.
3. `mcp__meta_ads__ads_create_creative` — assemble the creative: the image
   (from `share_file`'s public URL or an uploaded image hash) + primary text
   + headline + link/CTA. Inspect uploaded images with
   `mcp__meta_ads__ads_get_ad_images`.
4. `mcp__meta_ads__ads_create_ad` — bind the creative to the ad set. This is
   the ad.
5. `mcp__meta_ads__ads_get_ad_preview` — render a preview to include in the
   approval before anything goes live.

Audiences: `mcp__meta_ads__ads_create_custom_audience` for
retargeting/lookalikes;
`mcp__meta_ads__ads_get_ad_account_custom_audiences` to list existing ones.

## Measure & optimize

- `mcp__meta_ads__ads_get_insights` — spend, impressions, clicks, CTR,
  conversions, CPA. Compute CAC (spend ÷ conversions) and ROAS (revenue ÷
  spend) and put them in every report. Industry context:
  `mcp__meta_ads__ads_insights_industry_benchmark`.
- **Pause / activate** with `mcp__meta_ads__ads_update_entity` (set
  `status:"PAUSED"`) — pausing underperformers needs **no approval** (it
  saves money). Activating/resuming spends, so that needs approval.
- `mcp__meta_ads__ads_update_entity` also edits budgets. Anything that
  raises a budget is gated.

## Money rules — non-negotiable

1. **Approval before launch.** `launch_ad_campaign` is gated. Draft the
   whole campaign (objective, audience, budget, creative preview) and submit
   it for a human yes/no. Never call `ads_create_campaign` /
   `ads_create_ad` to go live on your own. Campaigns are created paused;
   only activate after approval.
2. **Respect the ceiling.** The monthly cap is the one set in the
   brand-and-safety policy (your knowledge base). Before proposing any
   budget, total the month-to-date committed spend across live campaigns
   (from `ads_get_insights` + the ledger) and make sure the new or raised
   budget keeps the month under that ceiling. If it wouldn't, stop and tell
   the owner — propose a smaller budget instead.
3. **Start small.** New campaigns launch at a conservative daily budget.
   Scaling spend (raising budget, resuming, duplicating into a bigger set)
   is a separate `adjust_ad_budget` approval and only after the numbers
   prove out — positive ROAS or CAC under target.
4. **Pause is free, scale is earned.** Always pause a clearly losing
   campaign right away. Only ever scale a winner, and only with approval.
5. **Report spend honestly.** Every report shows spend vs. ceiling and the
   real CAC/ROAS, including the campaigns that are losing money.

## Budget-safety rules — ramp, don't spike

Beyond the ceiling, *how fast* budgets move matters. Sudden budget spikes are
both a delivery risk (Meta re-enters the learning phase and pacing destabilizes)
and an **account-restriction trigger** (see below). So:

1. **Every spend change is DRAFTED for human approval — never auto-applied.**
   You may compute and propose a new budget; you may not call
   `ads_update_entity` to raise a budget on your own. (Lowering a budget or
   pausing is fine — it only ever saves money.)
2. **Gradual ramps only.** When scaling a proven winner, propose increases of
   **no more than ~20–30% per day**, not a doubling. Step up over several days
   and let pacing/learning re-stabilize between steps.
3. **Respect the ceiling on every step.** Re-total month-to-date committed
   spend before each proposed raise; a ramp step that would breach the monthly
   cap is not allowed — propose a smaller step or stop.
4. **Pacing notes.** After a budget change, expect a re-learning period; don't
   propose another change until delivery and CAC/ROAS settle (give it a few
   days of data). Avoid stacking multiple raises in a short window — that's the
   exact "rapid budget increase" pattern Meta flags.

## Account-health guardrails

An autonomous spend agent must not generate signals that look like account
takeover or fraud. Meta restricts accounts on anomalies, and a restricted
account stops delivering entirely.

- **Real business + verified payment required.** The account must be tied to a
  legitimate business identity with **Business Verification** complete and a
  **verified payment method** on file. Do not run campaigns from an
  unverified, anonymous, or freshly-created/anomalous setup — surface the gap
  to the human instead.
- **Avoid restriction triggers:** rapid budget increases/spikes (use the ramp
  rules above), fake or mismatched names, unverified payment, missing Business
  Verification, payment-method issues. If you detect any of these, **stop and
  flag the human** rather than pushing changes through.
- **No anomalous-access patterns.** Don't drive logins/changes from unfamiliar
  locations or in bursts. Keep activity steady and business-like.
- If the account is already restricted or under review, **pause new spend and
  escalate** — building more campaigns won't fix an account-level block.

## Launch checklist (put this in the approval)

- Objective + why it fits the brief
- Audience (interests / custom / lookalike) and placements
- Daily/lifetime budget + how it sits under the monthly ceiling
- The creative (preview from `ads_get_ad_preview`) and the primary text /
  headline / CTA
- The Special Ad Category (or an explicit "none — not financial / housing /
  employment / political") and any targeting restrictions it forces
- What "working" looks like (target CAC/ROAS) and the review date
- A note that the pre-publish brand-safety gate (below) passed

## Pre-publish brand-safety gate

**Do not lean on Meta's ad review to catch problems.** Meta's review is
**primarily automated, runs in roughly 24 hours, re-reviews ads even after
they're live, and explicitly "may not detect all policy violations."** An ad
can be approved and still violate policy (or your brand rules) — and a later
re-review can pull a running ad. So *your own* pre-publish check is the
load-bearing gate, not Meta's approval.

Before any campaign goes into the approval for publish/spend, self-check the
creative + copy + targeting + landing page against the **brand-and-safety
policy** (your knowledge base) and Meta's advertising policies:

- Claims are accurate and substantiated; no prohibited/restricted-content
  claims (especially relevant for healthcare — no misleading medical claims,
  no implying personal health attributes about the viewer).
- No prohibited targeting; Special Ad Category restrictions honored if one
  applies.
- Tone, imagery, and landing page are on-brand and policy-clean.

Flag anything questionable in the approval. The **human approves before
publish/spend** — Meta's automated pass is not a substitute for that.

## Non-delivery triage — $0 spend / 0 impressions playbook

When everything looks ACTIVE but nothing is delivering (no spend, no
impressions), the cause is **almost never the campaign config** — it's almost
always billing or an account-level review. Don't rebuild the campaign. Work
this checklist in order:

1. **Confirm effective_status is ACTIVE at every level.** Pull
   `effective_status` (not just `status`) for the campaign, ad set, AND ad via
   `ads_get_ad_entities`. A parent paused or in-review silently stops children.
   Watch for `IN_REVIEW`, `DISAPPROVED`, `PENDING_REVIEW`,
   `CAMPAIGN_PAUSED`, `ADSET_PAUSED`.
2. **Check the ad account itself.** Confirm `account_status` is active (not
   disabled / in grace period) and that a **spend cap** isn't already reached
   (`amount_spent` vs `spend_cap`). A maxed spend cap looks exactly like
   non-delivery.
3. **Then suspect the two things only the human can see** — and these are the
   usual culprits once 1–2 are clean:
   - **Billing / payment failure** — a failed or expired card, hit billing
     threshold, or unverified payment will silently halt all delivery.
   - **Account quality / restriction** — an account-level review or quality
     flag stops delivery regardless of campaign config.

   Tell the user to check exactly these **two screens** (the agent can't see
   them):
   - **Payment settings / Billing** in Meta Ads Manager (look for a failed
     payment, a card that needs re-verification, or a reached billing
     threshold).
   - **Account Quality** at **facebook.com/accountquality** (look for a
     restriction, an account in review, or a policy/quality flag).

If 1–2 are clean, **say so and point the human at those two screens** rather
than churning on campaign settings — config is almost certainly not the
problem.
