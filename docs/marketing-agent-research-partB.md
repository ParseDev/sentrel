# Marketing-agent research — Part B (CRO / experimentation / moat / measurement)

Deep-research pass to complete the marketing-agent roadmap. 107 agents, 5 angles,
25 sources, 104 extracted claims → **16 confirmed, 9 refuted** (3-vote adversarial
verification, 2/3 refutes to kill). The auto-synthesis step timed out; this is the
hand-merged record.

> **Why the refuted list matters as much as the confirmed list:** several popular
> "CAPI stat" numbers that circulate in marketing blogs got killed 0-3. Do **not**
> bake them into skills, decks, or client reports. They are listed below precisely
> so we don't re-cite them.

## Confirmed (✓) — and where each landed in the product

### Measurement
- **ENCAC = total ad spend (all platforms) ÷ new customers from CRM** is the only
  reliable cross-channel acquisition-cost metric; platform-reported CPA/ROAS
  self-credits. → added to `marketing/skills/measurement-and-attribution` §2.
- **Pixel + CAPI dual tracking** is Meta's own recommendation (browser signal +
  server reliability). → already in the measurement skill §4.
- **Event dedup**: events within a **48h window** sharing pixel ID + event name +
  `event_id` are counted once. → already in the measurement skill §4.

### CRO / experimentation  → new `marketing/skills/experimentation`
- **Contextual multi-armed bandits** (Unbounce Smart Traffic) route each visitor
  to the variant most likely to convert *people like them* by context (geo,
  device, OS, timezone); learn at ~30 visitors, route reliably after ~50.
- **Frequentist** tests need a pre-set sample size; **peeking invalidates them.**
- **Sequential / always-valid** tests are the ones safe to monitor continuously
  and stop early.
- **Bayesian A/B does NOT protect against peeking** — stopping when a fixed
  posterior threshold (e.g. P(B>A) > 0.95) is crossed under continuous monitoring
  inflates false positives, contrary to common belief. (This is the headline
  footgun the new skill corrects.)
- **AI-CRO** (e.g. VWO Copilot): NL-prompt page variations, predictive drop-off
  detection.

### Cross-channel budget  → new experimentation skill §5
- **MMM** is privacy-friendly + aggregated (no user-level data) → resilient to
  iOS14/ATT signal loss; **MTA** is user-level and degrades under privacy changes.
- **Robyn's budget allocator** (gradient-based `nloptr` over saturation curves)
  simulates reallocations to maximize response — the reference for "where the next
  dollar goes."

### Autonomy  → validates the existing approval-on-spend model
- **Spend approvals enforced in deterministic code**: under a fixed limit
  auto-executes, above routes to a human. (Matches the approval gate already in
  the engine.)

## Refuted (✗) — DO NOT CITE
- "Browser Pixel alone misses 30-40% of conversions." (0-3)
- "Event Match Quality scored 0-10 with per-parameter point values; >8.0 improves
  delivery." (0-3)
- "Meta caps each domain at 8 conversion events under AEM." (1-2)
- "AEM reports only the single highest-priority event for opted-out iOS users." (0-3)
- "40-60% of in-platform Meta conversion data is modeled; 80-97% of Apple users
  opt out." (0-3)
- "Dedup uses event_name + event_id and NOT user identifiers; only works
  browser-first." (0-3) — the verified dedup mechanism is the 48h pixel+name+id
  match above; the *exclusivity* claims here were killed.
- "Dedup requires matching fbp/fbc/hashed-email alongside event_id." (0-3)
- "Robust agent = deterministic control-plane sandbox with no direct external
  access." (1-2) — directionally fine, but the strong "no direct access" framing
  did not survive; don't overstate it.

## Sources (quality-rated)
Primary: Unbounce Smart Traffic docs; Meta Robyn MMM analyst guide; an arXiv
agent-autonomy paper. Secondary: Eppo (frequentist vs Bayesian); CIO (agent
control plane). Notable blog: alexmolas.com (Bayesian peeking — the correction).
Full URL list in the workflow output (`wcze59dtk`).

## Status
Skills updated in the standalone templates repo (`sentrel-agent-templates`):
`measurement-and-attribution` (ENCAC) + new `experimentation` skill wired into
`marketing/agent.yaml`. This doc is the team record of what's verified vs. myth.
