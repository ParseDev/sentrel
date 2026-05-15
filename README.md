# Alchemy

AI employee agents that live inside the tools your team already uses.

## Repo layout

```
alchemy/
├── backend/     # Rails 8 control plane + Inertia/React frontend
├── engine/      # TypeScript sidecar (one per agent, runs on Fly Machines)
├── docs/        # Architecture + ops docs
├── .github/     # CI workflows (engine-image, app-deploy)
└── bin/         # Root orchestrators (setup, dev)
```

Two services, one repo:

- **`backend/`** — the Rails app at `https://alchemy.scribemd.ai`. Users sign in here, manage agents, set policies, see traces. Deployed to a single EC2 host via kamal.
- **`engine/`** — the per-agent TypeScript engine (Bun + Claude Agent SDK). Each agent runs on its own Fly Machine; engine consumes Redis for inbound jobs and posts back to Rails for tool calls (email, Slack, secrets, etc.).

The two communicate through:
1. Redis (inbound message queue + pub/sub for sync)
2. Rails `/api/*` endpoints (engine → Rails, with `X-Engine-Secret`)

## Local dev

```bash
# One-time:
bin/setup

# Run everything (Rails + Vite + Sidekiq + Engine):
bin/dev
```

`bin/setup` installs both halves. `bin/dev` runs the combined Procfile.

Prerequisites:
- Ruby (see `backend/.ruby-version`)
- Node 20+ and npm
- [Bun](https://bun.sh) for the engine
- Postgres + Redis running locally

## Deploy

- **Rails (`backend/`)** — push to `main` with changes under `backend/**` triggers `.github/workflows/app-deploy.yml`, which runs `kamal deploy`.
- **Engine (`engine/`)** — push to `main` with changes under `engine/**` triggers `.github/workflows/engine-image.yml`, which builds `ghcr.io/parsedev/alchemy-engine:latest`. Each agent's Fly Machine pulls the new image on cold boot.

Both workflows have `workflow_dispatch` so you can re-run them manually from the Actions tab.

## Docs

- `docs/deploy.md` — production deploy walkthrough
- `docs/per-agent-hosting.md` — how each agent gets its own Fly Machine
- `docs/integrations.md` — Composio + native integrations
- `docs/slack-integration-plan.md` — Slack channel design notes
- `docs/monorepo-merge.md` — how this monorepo got merged
