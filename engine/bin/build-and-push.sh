#!/usr/bin/env bash
# Build the engine image + push to GHCR so Fly Machines can pull it.
#
# Usage:
#   bin/build-and-push.sh           # tag :latest + :<git-sha>
#   bin/build-and-push.sh v0.3.0    # tag :v0.3.0 + :latest + :<git-sha>
#
# Prereqs:
#   - docker logged in to ghcr.io: `echo $GHCR_PAT | docker login ghcr.io -u qubitam --password-stdin`
#   - buildx enabled (default on modern Docker Desktop)

set -euo pipefail

REGISTRY="${REGISTRY:-ghcr.io/qubitam}"
IMAGE="${REGISTRY}/alchemy-engine"
SHA="$(git rev-parse --short HEAD)"
EXTRA_TAG="${1:-}"

# Multi-arch so the same image works on Fly (amd64) + Hetzner ARM (arm64).
PLATFORMS="linux/amd64,linux/arm64"

echo "==> Building ${IMAGE} for ${PLATFORMS}"
echo "    tags: latest, ${SHA}${EXTRA_TAG:+, ${EXTRA_TAG}}"

# Bake the current SHA into the image so /ops/runs can show which version
# produced a given audit log.
echo "${SHA}" > .git-sha

TAGS=(-t "${IMAGE}:latest" -t "${IMAGE}:${SHA}")
if [ -n "${EXTRA_TAG}" ]; then
  TAGS+=(-t "${IMAGE}:${EXTRA_TAG}")
fi

docker buildx build \
  --platform "${PLATFORMS}" \
  "${TAGS[@]}" \
  --push \
  .

rm -f .git-sha
echo ""
echo "✓ Pushed ${IMAGE}:${SHA}"
echo "  and    ${IMAGE}:latest"
[ -n "${EXTRA_TAG}" ] && echo "  and    ${IMAGE}:${EXTRA_TAG}"
echo ""
echo "Next:"
echo "  1. In Rails .env set ENGINE_IMAGE=${IMAGE}:latest"
echo "  2. Create an agent in the UI — provisioner will pull this image"
