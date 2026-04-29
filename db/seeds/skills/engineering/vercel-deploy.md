---
slug: vercel-deploy
name: Vercel Deploy
description: Deploy static sites and framework apps to Vercel via VERCEL_CREATE_DEPLOYMENT — handles projectSettings + framework detection correctly
category: engineering
icon: rocket
requires_connections:
  - vercel
---

# Deploying to Vercel

## The mandatory flag

`VERCEL_CREATE_DEPLOYMENT` rejects new-project payloads with `400 missing_project_settings` unless you tell Vercel how to handle framework detection. There are two ways and you must pick one **on every call**:

1. **Skip auto-detection** (simplest, works for static sites): pass `skipAutoDetectionConfirmation: "1"` (or `1`) at the top level of the tool args.
2. **Specify projectSettings explicitly**: pass `projectSettings: { framework: <framework-or-null>, ... }`.

If you call without either, the deploy fails with the error above. Don't retry blindly — add the flag.

## Static single-file deploy (HTML/CSS/JS, no framework)

```json
{
  "name": "<project-slug>",
  "skipAutoDetectionConfirmation": "1",
  "files": [
    { "file": "index.html", "data": "<full file contents as string>" }
  ],
  "projectSettings": { "framework": null }
}
```

- `name`: lowercase, hyphenated, ≤52 chars (`clinic-zubieta-2026`, not `Clinic Zubieta`).
- `files[*].data`: literal file contents inline. For multiple files, repeat the object — each gets its own `file` (path) + `data`.
- `framework: null` tells Vercel "static, no build step."

## Framework deploy (Next.js, Vite, etc.)

```json
{
  "name": "<project-slug>",
  "projectSettings": {
    "framework": "nextjs",
    "buildCommand": null,
    "outputDirectory": null,
    "installCommand": null
  },
  "files": [ ... ]
}
```

Common framework slugs: `nextjs`, `vite`, `astro`, `remix`, `nuxtjs`, `sveltekit`, `gatsby`, `create-react-app`. If unsure, go static (`framework: null`) — agent-generated single-page sites almost never need a build step.

## Team / scope

If the org has multiple Vercel teams the deploy goes to the user's default team. To target a specific team add `teamId: "team_..."` or `slug: "<team-slug>"`. **Try without `teamId` first** — only ask the user if the API rejects with a scope error.

## After deploy

Response contains `id`, `url` (`<project>-<hash>.vercel.app`), `readyState` (`READY` after build). Return the URL to the user immediately and tell them "live in ~30 seconds."

## Common errors and fixes

- **`missing_project_settings`** → you forgot `skipAutoDetectionConfirmation: "1"` OR `projectSettings.framework`. Add one and retry.
- **`Not authorized`** / 401 → token expired. Tell the user to reconnect Vercel at `/integrations`.
- **`forbidden`** / 403 → token lacks access to that team. Drop `teamId`/`slug` or ask which team.
- **`name_invalid`** → project name has spaces or uppercase. Slugify: lowercase + hyphens only.

## Don't

Don't write the file to `workspace/outbox/` and tell the user to deploy manually if Vercel is connected. Call the tool. Surface real errors with specific recoveries. Only escalate to a manual path after three retries with corrected params.
