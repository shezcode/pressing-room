#!/usr/bin/env bash
# Deploys the image CI pushed to GHCR. Run it from your own machine: the VPS only accepts SSH from the
# tailnet, so CI can't reach it. See docs/deploy.md.
#
#   scripts/deploy.sh          # the latest image from main
#   scripts/deploy.sh <sha>    # a specific public-repo commit (CI tags each image with its SHA)

set -euo pipefail

TAG="${1:-latest}"
HOST="${DEPLOY_HOST:-willy}"        # an SSH host (alias) that reaches the VPS over the tailnet
DIR="${DEPLOY_DIR:-pressing-room}"  # relative to that user's home
IMAGE="ghcr.io/shezcode/pressing-room:${TAG}"

cd "$(git rev-parse --show-toplevel)"
echo "==> Deploying ${IMAGE} to ${HOST}:${DIR}"

scp docker-compose.prod.yml "${HOST}:${DIR}/docker-compose.prod.yml"

ssh "${HOST}" bash -s <<EOF
set -euo pipefail
cd "${DIR}"
test -f .env || { echo ".env missing in ${DIR}: copy .env.example there and fill it in" >&2; exit 1; }
# Written to .env rather than exported, so a later restart (the nightly reset) runs the same image
if grep -q '^IMAGE=' .env; then sed -i 's|^IMAGE=.*|IMAGE=${IMAGE}|' .env; else echo 'IMAGE=${IMAGE}' >> .env; fi
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps
EOF
