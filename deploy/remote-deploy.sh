#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
DEPLOY_USER="${DEPLOY_USER:?DEPLOY_USER is required}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/apps/fast-scrabble}"
SSH_KEY="${DEPLOY_SSH_KEY:-}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

echo "==> Syncing to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'postgres_data_scrabble' \
  -e "ssh ${SSH_OPTS[*]}" \
  ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> Building and starting production stack"
ssh "${SSH_OPTS[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<REMOTE
set -euo pipefail
cd "${DEPLOY_PATH}"
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found on server. Copy from .env_template and configure secrets."
  exit 1
fi
docker compose -f compose.prod.yaml up --build -d --force-recreate
docker compose -f compose.prod.yaml ps
REMOTE

echo "==> Deploy complete"
