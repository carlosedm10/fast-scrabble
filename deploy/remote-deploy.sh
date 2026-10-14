#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
DEPLOY_USER="${DEPLOY_USER:?DEPLOY_USER is required}"
DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH is required}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-22}"
EDGE_PATH="${EDGE_PATH:-/opt/apps/edge}"
CADDY_SITE="games.caddy"
SSH_KEY="${DEPLOY_SSH_KEY:-}"

# Trust only the known_hosts file the workflow wrote from DEPLOY_KNOWN_HOSTS.
SSH_OPTS=(
  -p "$DEPLOY_SSH_PORT"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="${HOME}/.ssh/known_hosts"
  -o GlobalKnownHostsFile=/dev/null
)
if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
fi

echo "==> Syncing to ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH} (port ${DEPLOY_SSH_PORT})"
rsync -avz --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'postgres_data_scrabble' \
  -e "ssh ${SSH_OPTS[*]}" \
  ./ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

echo "==> Building stack, installing Caddy site, reloading edge"
ssh "${SSH_OPTS[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<REMOTE
set -euo pipefail
DEPLOY_PATH="${DEPLOY_PATH}"
EDGE_PATH="${EDGE_PATH}"
CADDY_SITE="${CADDY_SITE}"

cd "\${DEPLOY_PATH}"
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found on server."
  echo "Copy deploy/env.production.example to .env and set production secrets."
  exit 1
fi

echo "==> docker compose up (prod)"
docker compose -f compose.prod.yaml up --build -d --force-recreate
docker compose -f compose.prod.yaml ps

echo "==> Installing Caddy site config"
install -D -m 644 "\${DEPLOY_PATH}/deploy/host/edge/sites/\${CADDY_SITE}" "\${EDGE_PATH}/sites/\${CADDY_SITE}"

echo "==> Reloading edge Caddy"
cd "\${EDGE_PATH}"
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
REMOTE

echo "==> Deploy complete"
