# Alchemy engine — one image per agent.
#
# Runs on Fly Machines (primary), Hetzner, DigitalOcean, or any Docker host.
# Image is agent-agnostic; the running agent is selected at runtime via the
# EMPLOYEE_ID env var, injected by the provisioner at machine-create time.
#
# Companions (sibling containers on the same machine, same `/data` volume):
#   - askjo/camofox-browser — stealth Firefox HTTP service on :9377
#   - askjo/display-stack    — Xvfb + x11vnc + noVNC for live-screen view (optional,
#                              future Phase 3). Not required for headless operation.
#
# Ports exposed by this image:
#   3300  — engine gateway (HTTP + WebSocket). Rails reaches it here.
#
# Size budget: ~600-800 MB. Bun + node_modules + a few OS utilities.

# --- Stage 1: install deps ----------------------------------------------------
# Debian (glibc) base — onnxruntime-node + tesseract + several other native
# deps ship glibc-linked binaries. We avoid the claude-agent-sdk's ENOENT by
# overriding pathToClaudeCodeExecutable to the bundled JS CLI at runtime,
# so we never need the SDK's native platform binary at all.
FROM oven/bun:1.1.38-slim AS deps

WORKDIR /srv/engine

# Copy lock + manifest first for layer caching on dep-only changes.
# NOT --frozen-lockfile: the lockfile is generated on the developer's Mac
# and skips Linux-only platform optional deps (see Bun issue #26156).
#
# Bun installs BOTH the glibc and musl variants of claude-agent-sdk's
# native binary (both declare os: linux). The SDK's resolver tries musl
# first — on Debian/glibc that spawn fails with ENOENT. Deleting the
# musl copies forces the resolver to fall through to the glibc variant.
COPY package.json bun.lock ./
RUN bun install \
  && rm -rf \
       node_modules/@anthropic-ai/claude-agent-sdk-linux-x64-musl \
       node_modules/@anthropic-ai/claude-agent-sdk-linux-arm64-musl

# --- Stage 2: runtime image ---------------------------------------------------
FROM oven/bun:1.1.38-slim AS runtime

# System packages needed at runtime:
#   - poppler / tesseract — PDF extraction fallbacks (rag/extractor.ts)
#   - ffmpeg              — media conversion for voice notes
#   - ca-certificates + curl — TLS + healthcheck
#   - tini                — PID 1 zombie reaper
RUN apt-get update && apt-get install -y --no-install-recommends \
      poppler-utils tesseract-ocr \
      ffmpeg \
      ca-certificates curl \
      tini \
    && rm -rf /var/lib/apt/lists/*

# Non-root user. Everything persistent lives in /data, which the provisioner
# mounts as a volume. Agent state survives restarts because /data does.
RUN useradd --create-home --shell /bin/bash engine
WORKDIR /srv/engine

# node_modules from the builder stage — chown so the engine user can write
# caches under node_modules (e.g. onnxruntime-node's model dir).
COPY --from=deps --chown=engine:engine /srv/engine/node_modules ./node_modules

# Engine source (see .dockerignore for exclusions)
COPY --chown=engine:engine . .

# Ensure the engine user has a writable XDG cache dir for libraries that
# download models at runtime (e.g. @huggingface/transformers).
RUN mkdir -p /home/engine/.cache && chown -R engine:engine /home/engine

# /data is the single persistent mount. Everything else is ephemeral.
# Layout inside /data matches config.dataDir = "/data":
#   /data/memories/         — memory.md
#   /data/skills/           — SKILL.md files (re-provisioned on /sync)
#   /data/workspace/        — agent's working files (outbox, screenshots, notes)
#   /data/rag/              — per-agent + per-org SQLite vector stores
#   /data/camofox/          — Camofox profile + cookies (shared with sibling)
#   /data/hf-cache/         — @huggingface/transformers model cache
ENV DATA_DIR=/data
# Point transformer libraries at the persistent volume so the ~25 MB
# MiniLM-L6-v2 model downloads once per agent and survives restarts.
# Without this, onnxruntime + transformers default to node_modules/.cache
# which isn't writable after Fly mounts /data over a fresh volume.
ENV HF_HOME=/data/hf-cache
ENV TRANSFORMERS_CACHE=/data/hf-cache
ENV XDG_CACHE_HOME=/data/hf-cache
RUN mkdir -p /data/memories /data/skills /data/workspace /data/rag /data/camofox /data/hf-cache \
    && chown -R engine:engine /data
VOLUME ["/data"]

USER engine

# Health probe — Fly / k8s reads this
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:3300/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["bun", "run", "src/main.ts"]
