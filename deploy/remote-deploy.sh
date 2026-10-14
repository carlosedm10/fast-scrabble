#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST is required}"
DEPLOY_USER="${DEPLOY_USER:?DEPLOY_USER is required}"
DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH is required}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-22}"
EDGE_PATH="${EDGE_PATH:-/opt/apps/edge}"
CADDY_SITE="games.caddy"
SSH_KEY="${DEPLOY_SSH_KEY:-}"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-}"

if [[ ! "$DEPLOY_SSH_PORT" =~ ^[0-9]+$ ]]; then
  echo "DEPLOY_SSH_PORT must be a port number" >&2
  exit 1
fi

KNOWN_HOSTS="$(mktemp)"
trap 'rm -f "$KNOWN_HOSTS"' EXIT
# Fresh scan each deploy. Do not trust a pre-seeded known_hosts file.
if ! ssh-keyscan -p "$DEPLOY_SSH_PORT" -H "$DEPLOY_HOST" > "$KNOWN_HOSTS"; then
  echo "ssh-keyscan failed for the deploy host" >&2
  exit 1
fi
if ! grep -qE 'ssh-|ecdsa-' "$KNOWN_HOSTS"; then
  echo "ssh-keyscan returned no host keys" >&2
  exit 1
fi

SSH_OPTS=(
  -p "$DEPLOY_SSH_PORT"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$KNOWN_HOSTS"
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

if [[ -n "$DEPLOY_ENV_FILE" ]]; then
  if [[ ! -f "$DEPLOY_ENV_FILE" ]]; then
    echo "DEPLOY_ENV_FILE does not exist" >&2
    exit 1
  fi
  echo "==> Installing server .env"
  ssh "${SSH_OPTS[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "umask 077; cat > ${DEPLOY_PATH@Q}/.env" < "$DEPLOY_ENV_FILE"
fi

echo "==> Building stack, installing Caddy site, reloading edge"
ssh "${SSH_OPTS[@]}" "${DEPLOY_USER}@${DEPLOY_HOST}" bash -s <<REMOTE
set -euo pipefail
DEPLOY_PATH="${DEPLOY_PATH}"
EDGE_PATH="${EDGE_PATH}"
CADDY_SITE="${CADDY_SITE}"

cd "\${DEPLOY_PATH}"
if [[ ! -f .env ]]; then
  echo "ERROR: .env not found on server."
  echo "The deploy workflow writes it from the production environment."
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
