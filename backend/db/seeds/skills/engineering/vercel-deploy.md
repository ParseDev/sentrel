---
slug: vercel-deploy
name: Vercel Deploy
description: Deploy static sites and framework apps to Vercel and read deploy status via the Vercel REST API — handles projectSettings + framework detection correctly.
category: engineering
icon: rocket
requires_connections:
  - vercel
---

# Deploying to Vercel

Call the Vercel REST API with the **`request`** tool (server `apps`):

```
request({ provider: "vercel", method, path, query?, body? })
```

- **Base is `https://api.vercel.com`** — give `path` relative, starting with `/` (e.g. `/v13/deployments`).
- **Auth is injected for you.** Vercel is connected via a pasted API token; Rails attaches it as a bearer token on every call. NEVER ask for, include, or echo a token.
- **Do NOT use the `vercel` CLI or git.** They aren't authenticated here. Every Vercel action goes through `request(...)`.
- Result is `{ status, body }` — read `body` for the deployment object and `status` for HTTP errors.

## The mandatory flag — READ THIS (it's the #1 mistake)

`POST /v13/deployments` rejects new-project payloads with **`400 missing_project_settings`** unless you tell Vercel how to handle framework detection. There are two ways and you must pick one **on every call**:

1. **Skip auto-detection** (simplest, works for static sites): pass `skipAutoDetectionConfirmation: "1"` (or `1`) — accepted either as a **query** param or in the **body**.
2. **Specify projectSettings explicitly**: pass `body.projectSettings: { framework: <slug-or-null>, ... }`.

If you call with neither, the deploy fails with the error above. Don't retry blindly — add the flag.

## Static single-file deploy (HTML/CSS/JS, no framework)

```
request({
  provider: "vercel",
  method: "POST",
  path: "/v13/deployments",
  query: { skipAutoDetectionConfirmation: "1" },
  body: {
    name: "<project-slug>",
    files: [
      { file: "index.html", data: "<full file contents as a string>" }
    ],
    projectSettings: { framework: null }
  }
})
```

- `name`: lowercase, hyphenated, ≤52 chars (`clinic-zubieta-2026`, not `Clinic Zubieta`).
- `files[*]`: inline a file with `{ file: "<relative path>", data: "<contents>" }`. For multiple files, repeat the object — each gets its own `file` (path) + `data`. (A `files` entry with only `file` references an already-uploaded blob; for agent-generated sites, always inline `data`.)
- `projectSettings.framework: null` tells Vercel "static, no build step."

## Framework deploy (Next.js, Vite, etc.)

```
request({
  provider: "vercel",
  method: "POST",
  path: "/v13/deployments",
  body: {
    name: "<project-slug>",
    files: [ ... ],
    projectSettings: {
      framework: "nextjs",
      buildCommand: null,
      outputDirectory: null,
      installCommand: null
    }
  }
})
```

- Providing `projectSettings.framework` satisfies the detection requirement, so you don't also need `skipAutoDetectionConfirmation`.
- `null` on `buildCommand` / `outputDirectory` / `installCommand` means "auto-detect."
- Common framework slugs: `nextjs`, `vite`, `astro`, `remix`, `nuxtjs`, `sveltekit`, `gatsby`, `create-react-app`. If unsure, go static (`framework: null`) — agent-generated single-page sites almost never need a build step.
- `target` (optional, top-level body): omit for a `preview` deploy, or `"production"` to deploy live.

## Team / scope

The deploy goes to the connected account's default team. To target a specific team add **`teamId: "team_..."`** (or `slug: "<team-slug>"`) as a **query** param:

```
request({ provider:"vercel", method:"POST", path:"/v13/deployments",
          query:{ teamId:"team_abc123", skipAutoDetectionConfirmation:"1" },
          body:{ name:"...", files:[...], projectSettings:{ framework:null } } })
```

**Try without `teamId` first** — only add it (or ask the user) if the API rejects with a `403 forbidden` / scope error.

## Reading deploy status

The `POST` response body already contains `id`, `url` (`<project>-<hash>.vercel.app`), and `readyState`. Return the URL to the user immediately and tell them "live in ~30 seconds." To poll the build to completion:

| Do | Call |
|---|---|
| Get one deployment | `GET /v13/deployments/{id}` · `query:{ teamId? }` — read `readyState` |
| List recent deployments | `GET /v6/deployments` · `query:{ limit:20, projectId?, teamId? }` |

- `readyState` values: `QUEUED` → `BUILDING` → `READY` (live) or `ERROR` (build failed) / `CANCELED`.
- `{id}` is the `id` (or `uid`) from the create response. Pass the same `teamId` you deployed with, or the lookup 404s.

## Errors — what to do

| Status | `body` says | Do |
|---|---|---|
| 400 | `missing_project_settings` | You forgot the mandatory flag. Add `query.skipAutoDetectionConfirmation:"1"` OR `body.projectSettings.framework`, then retry. |
| 400 | `name_invalid` | `name` has spaces or uppercase. Slugify: lowercase + hyphens only, ≤52 chars. Retry. |
| 401 | `Not authorized` / bad token | Token expired or revoked. Connection issue — tell the user to reconnect Vercel at `/integrations`. Don't retry. |
| 403 | `forbidden` | Token lacks access to that team. Drop `query.teamId`/`slug`, or ask the user which team. |
| 404 | on status lookup | Wrong `id`, or you omitted the `teamId` the deploy was scoped to. Re-check both. |

## Don't

- Don't use the `vercel` CLI / git — use `request(...)`.
- Don't write the file to `workspace/outbox/` and tell the user to deploy manually when Vercel is connected. Call `request(...)`.
- Don't ask the user for a token — auth is already connected.
- Don't call `POST /v13/deployments` without `skipAutoDetectionConfirmation` or `projectSettings.framework`.
- Don't escalate to a manual path until you've surfaced the real error and retried with corrected params.
