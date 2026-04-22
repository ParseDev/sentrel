# Per-agent deployment — status + what to do next

Snapshot of where we are on shipping one-Fly-Machine-per-agent, what's wired,
what's still a gap, and the exact order to close each gap.

## Status right now

### ✅ Done (in this repo + the engine repo)

| Piece | Path | What it does |
|---|---|---|
| Hosting comparison | `docs/per-agent-hosting.md` | Fly vs Hetzner vs DO vs AWS — picked Fly for phase 1 |
| Engine Dockerfile | `alchemy_engine/Dockerfile` | Two-stage Bun build, `/data` volume, non-root, ~700MB |
| docker-compose | `alchemy_engine/docker-compose.yml` | Engine + Camofox sharing `/data`; works on any Docker host |
| fly.toml template | `alchemy_engine/fly.toml` | Per-agent Machine config, `primary_region = "lax"`, scale-to-zero |
| cloud-init.sh | `alchemy_engine/cloud-init.sh` | Generic bootstrap for Hetzner / DO / any VM |
| Provisioner service | `app/services/agent_provisioner.rb` | Fly / Hetzner / Local / Null backends |
| Ready callback | `app/controllers/api/agent_instances_controller.rb` | `POST /api/agent_instances/ready` for cloud-init to ping |
| Screen view | `app/controllers/agent_screens_controller.rb`, `pages/agents/screen.tsx` | noVNC iframe, graceful fallback when no VM |
| instances schema | migration `20260422222921` | `provider`, `machine_id`, `public_ip`, `private_ip`, `machine_type`, `health_checked_at`, `provisioning_error` |
| Wire-up on create/destroy | `app/controllers/agents_controller.rb` | `AgentProvisioner.provision_for(agent)` after save; `terminate_for(agent)` before destroy |
| Fly app naming | `agent_provisioner.rb` | `alchemy-{env}-agent-{id}` (env = dev / staging / prod) |
| Build script | `alchemy_engine/bin/build-and-push.sh` | Multi-arch buildx → GHCR |

### 🟡 Ready but not tested in the wild

- `AgentProvisioner.provision_for` end-to-end call against real Fly API.
- Engine image actually built + pushed to `ghcr.io/qubitam/alchemy-engine:latest`.
- Camofox image at `ghcr.io/askjo/camofox-browser:latest` — the sibling repo has its own Dockerfile; needs its own CI action.

### 🔴 Gaps remaining

1. **Engine image publishing.** `bin/build-and-push.sh` exists locally; no CI yet. Every push to main should rebuild + push.
2. **Camofox image publishing.** Sibling repo has a Dockerfile but no GHCR push pipeline.
3. **Async provisioning.** Today `provision_for(agent)` is synchronous in the Rails request. Fly's ~10s boot is just barely acceptable; Hetzner's 60s is not. Move to Sidekiq when we go Hetzner.
4. **Secret hygiene.** FlyBackend injects secrets into Machine env directly. For prod we should use `fly secrets set` (encrypted at rest) instead.
5. **Display stack sidecar image.** Screen-view page expects a container exposing `:6080`. Not built yet — can be a tiny image with `xvfb + x11vnc + websockify` that shares the network ns with camofox.
6. **Multi-machine apps on Fly.** Right now FlyBackend creates one Machine per App. An App can hold N Machines — might want a single `alchemy-dev-agents` app with one Machine per agent_id instead. Trade-off: isolation (one app = one blast radius) vs dashboard clutter. Default is fine for now.

---

## How Fly Machines access Redis + Postgres + BullMQ

This is the question that has to be answered before we can actually ship. The engine talks to:

- **Postgres** — shared with Rails. Agent state, conversations, messages, audit logs.
- **Redis** — shared with Rails. BullMQ queues (`employee-<id>`), LISTEN/NOTIFY inbox (`agent-inbox-<id>`), health keys.
- **Rails HTTP** — for `/api/blobs`, `/api/task_events`, `/api/agent_instances/ready`.

Fly Machines are just Linux VMs with public egress. They reach any internet URL. The question is **where we host Postgres + Redis**.

### Option A (recommended for phase 1) — managed providers

- **Neon** (Postgres) — free tier covers dev; $19/mo for prod. Connection string over public internet, TLS required.
- **Upstash** (Redis) — free tier = 10k commands/day, $10/mo beyond. REST + native Redis protocol, global replication.
- **Rails deploy** — also Fly, also `lax` region.

Config:

```bash
# In Rails .env (and the provisioner passes through to each Machine)
ENGINE_DATABASE_URL=postgres://user:pw@ep-xxx.us-east-1.aws.neon.tech/alchemy?sslmode=require
ENGINE_REDIS_URL=rediss://default:pw@xxx.upstash.io:6379
```

`ENGINE_REDIS_URL` uses `rediss://` (TLS). BullMQ + ioredis handle TLS via URL. Change upstream if Redis is on a different host than Rails reaches.

Why this path first: zero DevOps work, zero downtime migrations, zero capacity planning. Both services have pay-as-you-go free tiers so dev costs $0.

### Option B — Fly-managed Postgres + Upstash

Fly has deprecated their first-party Postgres; Neon is now their recommended partner. Upstash runs natively on Fly. Same result as Option A, one fewer account to create.

### Option C — self-host on a Fly volume

Run your own Postgres + Redis as Fly apps in the same org. Private IPv6 6PN lets agent Machines reach `postgres.internal` + `redis.internal` without going over the public internet. Cheapest at scale but you own backups, replication, failover.

→ **Defer until you have >100 agents and a real DevOps budget.**

### Option D — Serverless Postgres + Serverless Redis

Postgres: Supabase / Neon with their REST proxies. Redis: Upstash REST API. Removes connection-count problems (neon is connection-limited on free tier). More complex in code.

→ **Not needed yet.**

### What to set on Rails (wire it now)

```bash
# Rails .env — these get passed through to every agent Machine via FlyBackend.env_for
ENGINE_DATABASE_URL=postgres://.../alchemy?sslmode=require
ENGINE_REDIS_URL=rediss://...
```

If unset, the provisioner falls back to `DATABASE_URL` + `REDIS_URL` (Rails' own connection strings). That's usually wrong for prod — Rails might be on a private network that agent Machines can't see. Always set `ENGINE_*` explicitly.

### BullMQ specifically

BullMQ is Redis-native — whatever Redis you pick, BullMQ works. The engine connects via `ioredis` which handles TLS automatically when the URL starts with `rediss://`. No Fly-specific config.

---

## Concrete "ship phase 1 tonight" runbook

Prereqs:
- Fly.io account + `flyctl auth login`.
- Upstash Redis instance (free tier) → copy `rediss://...` URL.
- Neon Postgres instance (free tier) → copy `postgres://...` URL.
- GitHub Personal Access Token with `write:packages` scope → `docker login ghcr.io -u qubitam`.

Steps:

### 1. Build + push the engine image

```bash
cd /Users/abdel/Workspace/code/alchemy-ai/alchemy_engine
./bin/build-and-push.sh
```

Takes ~3-5 min the first time (multi-arch buildx). Subsequent builds are incremental.

### 2. Build + push the camofox image

```bash
cd /Users/abdel/Workspace/camofox-browser
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/askjo/camofox-browser:latest --push .
```

### 3. Set Rails .env

```bash
cd /Users/abdel/Workspace/code/alchemy-ai/alchemy
# Add to .env:
AGENT_PROVISIONER=fly
DEPLOY_ENV=dev
FLY_API_TOKEN=<from flyctl auth token>
FLY_ORG_SLUG=<your-fly-org>
FLY_REGION=lax
ENGINE_IMAGE=ghcr.io/qubitam/alchemy-engine:latest
ENGINE_DATABASE_URL=postgres://...neon.tech/alchemy?sslmode=require
ENGINE_REDIS_URL=rediss://...upstash.io:6379
ENGINE_API_SECRET=<match the engine's ENV>
RAILS_INTERNAL_URL=https://<your-rails-prod-host>
```

### 4. Bounce Rails

```bash
bin/rails restart
```

### 5. Create an agent in the UI

Open `/agents/new` → pick "SDR" (fast Haiku model, cheap to test) → name "Test Agent 1" → Hire.

Rails will:
1. Insert the agent row.
2. Install the SDR skill pack.
3. Call `EngineSync.trigger` (no-op; no engine running yet for this agent).
4. Call `AgentProvisioner.provision_for(agent)` → Fly Machines API.
5. Fly creates `alchemy-dev-agent-<id>`, attaches a 10GB volume, starts the Machine.
6. Engine container pulls `ghcr.io/qubitam/alchemy-engine:latest`, runs `bun src/main.ts`.
7. Engine connects to Neon + Upstash, reads `agents WHERE id = EMPLOYEE_ID`.
8. cloud-init isn't used on Fly — instead the engine itself pings `/api/agent_instances/ready` on boot (small addition, see gap #2 below).
9. Rails flips `instance.status = "running"`. Green dot appears.
10. User can message the agent via web chat / Telegram / WhatsApp — traffic reaches the agent's Fly Machine.

### 6. Open `/agents/agt_.../screen`

Should show either the noVNC iframe (if display-stack sidecar ships soon) or the "Display not exposed" placeholder.

### Troubleshooting

- If step 4 errors out: `fly apps list` — look for `alchemy-dev-agent-*`. `fly logs -a alchemy-dev-agent-<id>` shows the engine boot log.
- If image pull fails: the Machine can't reach ghcr. Make the image public on GHCR: `gh api -X PATCH /user/packages/container/alchemy-engine/visibility -f visibility=public`.
- If engine can't connect to Postgres: `ENGINE_DATABASE_URL` missing or Neon hibernated; `neon` auto-wakes on first connection but takes ~5s.

---

## Gaps we can wire NOW (quick wins, <1h each)

Ranked by ROI:

### G1 — Engine calls `/api/agent_instances/ready` itself on boot (15 min)

Right now the ready callback only fires from `cloud-init.sh` (Hetzner path). On Fly we skip cloud-init entirely — the engine starts directly from the image. Engine should call the ready endpoint itself after `main.ts` finishes init.

Add at the end of `src/main.ts`:

```ts
try {
  await fetch(`${process.env.RAILS_INTERNAL_URL}/api/agent_instances/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Engine-Secret": process.env.ENGINE_API_SECRET! },
    body: JSON.stringify({ employee_id: Number(config.employeeId), public_ip: process.env.FLY_PUBLIC_IP || null }),
  });
  logger.info("Reported ready to Rails");
} catch (err) {
  logger.warn("Could not report ready to Rails — will be picked up on next health check", { error: (err as Error).message });
}
```

### G2 — GitHub Action for engine image push (10 min)

`.github/workflows/engine-image.yml`:

```yaml
name: engine-image
on: { push: { branches: [main], paths: ['src/**', 'Dockerfile', 'package.json'] } }
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { packages: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v5
        with:
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            ghcr.io/qubitam/alchemy-engine:latest
            ghcr.io/qubitam/alchemy-engine:${{ github.sha }}
```

### G3 — Async provisioning via Sidekiq (30 min)

Wrap `AgentProvisioner.provision_for` in a `ProvisionAgentJob`:

```ruby
class ProvisionAgentJob
  include Sidekiq::Job
  def perform(agent_id)
    agent = Agent.find(agent_id)
    AgentProvisioner.provision_for(agent)
  end
end
```

Then in `agents_controller#create`:

```ruby
ProvisionAgentJob.perform_async(@agent.id)
```

Instead of:

```ruby
AgentProvisioner.provision_for(@agent)
```

User gets immediate feedback; Machine boots in background.

### G4 — Display stack sidecar image (45 min)

Tiny Dockerfile with Xvfb + x11vnc + websockify + novnc. Share `network_mode: service:camofox` so it sees the same display. Push to GHCR. Add to `docker-compose.yml` as an uncommented service.

### G5 — Graceful degradation when Fly is unreachable (10 min)

If `provision_for` raises, today we set instance.status = "failed" + log. Improve: also send the error message as an inline banner on the agent show page so the user isn't confused about why the green dot never arrived.

---

## Answer recap

- **Prefix**: shipped — `DEPLOY_ENV=dev|staging|prod` → `alchemy-{env}-agent-{id}`.
- **Fly region**: changed default to `lax` in both fly.toml + FlyBackend + docs.
- **Status**: Rails + engine scaffolding all committed. Not yet tested against real Fly because we haven't built + pushed the image. Steps above do that.
- **Gaps to wire now**: G1 + G2 are the cheapest and most necessary. G3 once Hetzner is on the table. G4 when screen view matters. G5 is polish.
- **Redis / BullMQ access**: use Upstash (rediss:// URL), set `ENGINE_REDIS_URL` in Rails. Agents on Fly reach it via the public internet over TLS. Same for Postgres via Neon.
