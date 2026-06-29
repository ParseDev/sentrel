# Meta App Review & Business Verification — submission runbook

What to do, in order, to get Sentrel's Meta app approved for managing **customers'
own** ad accounts / Pages at scale (the path that unlocks `Meta::FacebookLogin`,
the FLB scaffold behind `META_FBL_ENABLED`). Until this lands, the design-partner
bridge (a System User added to the client's Business Manager) + paste-token are
the interim path — see the migration plan.

> The legal pages required below are already live in this app:
> - Privacy Policy → **https://sentrel.ai/privacy**
> - Terms of Service → **https://sentrel.ai/terms**
> - Data Deletion Instructions → **https://sentrel.ai/data-deletion**
>
> Before submitting, fill the two placeholders in those pages
> (`[Company address]`, `[jurisdiction]`) — search `backend/app/frontend/pages/legal/`.

## 0. Prerequisites
- [ ] A **Meta Business Portfolio** (Business Manager) that owns the app.
- [ ] The app in **developer/live** mode at developers.facebook.com → My Apps.
- [ ] App **type = Business**.

## 1. Business Verification (gates Advanced Access)
Business Settings → **Security Center** → Start verification.
- [ ] Legal business name, address, phone, website (`sentrel.ai`).
- [ ] Verification doc (incorporation / utility bill / bank statement matching the name+address).
- [ ] A domain you control, **verified** (DNS TXT or meta-tag) — Business Settings → Brand Safety → Domains.
- This can take days; start it first — nothing else ships without it.

## 2. App settings → Basic
- [ ] **Privacy Policy URL** = `https://sentrel.ai/privacy`
- [ ] **Terms of Service URL** = `https://sentrel.ai/terms`
- [ ] **User Data Deletion** = **Data Deletion Instructions URL** = `https://sentrel.ai/data-deletion`
      (use the instructions-URL option, not a callback — our page documents the manual + email path.)
- [ ] **App Domains** = `sentrel.ai`
- [ ] **Category** (e.g. Business and Pages), App Icon (1024×1024), short + long description.
- [ ] **Site URL** / allowed domains include `https://sentrel.ai`.

## 3. Facebook Login for Business (the connect product)
App → Add Product → **Facebook Login for Business** → Settings.
- [ ] **Valid OAuth Redirect URIs** = the canonical callback (the one Rails owns;
      `Meta::FacebookLogin#authorize_url` must use the SAME value). Confirm the
      exact prod callback path before submitting — mismatch = `redirect_uri` error.
- [ ] Create an **FLB configuration**: token type = **System User**, attach the
      asset types (Ad accounts, Pages, Instagram, Catalogs) + the permissions in
      §4. Its `config_id` → `META_FBL_CONFIG_ID`.

## 4. Permissions needing **Advanced Access** (request in App Review)
For a full growth operator managing client assets, request Advanced Access for:
- [ ] `ads_management` — create/edit campaigns, ad sets, ads, budgets.
- [ ] `ads_read` — insights / reporting.
- [ ] `business_management` — manage assets in the client's Business Manager (System User).
- [ ] `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` — organic posting/reads.
- [ ] `pages_manage_ads` — run ads tied to a Page.
- [ ] `instagram_basic`, `instagram_content_publish` — IG read + publish.
- [ ] (if used) `catalog_management` — dynamic ads / product catalogs.
- [ ] (if used) `leads_retrieval` — pull Lead Ads leads.

Each permission needs: a **clear use-case description**, a **screencast** of the
exact flow in Sentrel (connect → the agent performing the action with human
approval), and **test credentials** (a reviewer login + a sandbox Business with
assets). Standard Access works only on assets *you* own — Advanced is required
for customers' accounts, which is the whole point.

## 5. The screencast (most common rejection cause)
Record a clean, narrated walk-through per permission group:
- [ ] User clicks **Connect Meta** in Sentrel → FLB consent → returns connected.
- [ ] The agent **drafts** a campaign/post and shows it; a **human approves** the
      spend/publish (highlight the approval gate — Meta favors human-in-the-loop).
- [ ] Show real data being read (insights) and an action being taken post-approval.
- Keep each clip short, no dead air, show the permission actually being used.

## 6. Special Ad Categories (declare, don't get caught)
If any client advertises **credit, employment, housing, or social/political**
issues, those campaigns must set `special_ad_categories` — Meta restricts
targeting and audits for it. The `meta-ads` skill already covers this; note it in
the review if relevant to your launch clients.

## 7. After approval — activate FLB
Set on the backend (kamal secrets), then flip the flag:
```
META_FBL_ENABLED=true
META_APP_ID=...            # the reviewed app
META_APP_SECRET=...
META_FBL_CONFIG_ID=...     # the System-User FLB configuration from §3
META_GRAPH_VERSION=v21.0
```
Then wire `Meta::FacebookLogin#authorize_url` into the Meta connect button
(tool: mcp path) and persist the returned System User token per-org (reuse
`McpServer` or a `MetaConnection` row). Implement `#refresh` (re-mint within the
60-day window) — it's stubbed until the config + System User id exist.

## Status of our side
- ✅ Legal pages live (`/privacy`, `/terms`, `/data-deletion`) — fill the 2 placeholders.
- ✅ FLB auth scaffolded (`backend/app/services/meta/facebook_login.rb`), flag-gated.
- ⏳ Business Verification + App Review = external Meta process (this doc).
- ⏳ Confirm the exact prod OAuth callback URL before submitting (§3).
