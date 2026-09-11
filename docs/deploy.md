# Deploy — fast-scrabble

Production runs on the Hetzner VM at `167.233.36.55`, served at `https://games.carloseduardo.es/scrabble`.

## Architecture

```
Browser → Caddy (edge) → 127.0.0.1:3200 (frontend)
                      → 127.0.0.1:8200 (backend API + Socket.IO)
                      → Postgres (internal, compose network)
```

## Caddy routes

See `deploy/host/edge/sites/games.caddy`:

- `/scrabble/api*` → backend `:8200`
- `/scrabble/socket.io*` → backend `:8200`
- `/scrabble*` → frontend `:3200`
- `/` → 302 redirect to `/scrabble`

## Server setup

1. Clone/rsync app to `/opt/apps/fast-scrabble`
2. Copy `.env_template` → `.env` and set production secrets
3. Run `make prod-up` (or `docker compose -f compose.prod.yaml up --build -d`)
4. Install Caddy site config from `deploy/host/edge/sites/games.caddy`

## GitHub Actions deploy

`deploy.yml` runs on push to `main` when secrets are configured:

| Secret | Purpose |
|---|---|
| `DEPLOY_HOST` | VM IP or hostname (`167.233.36.55`) |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private key for deploy |
| `DEPLOY_PATH` | Remote path (`/opt/apps/fast-scrabble`) |

Manual deploy: `./deploy/remote-deploy.sh` with the same env vars.

## VM .env (required)

```
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=scrabble
DATABASE_URL=postgresql://...@postgres-scrabble:5432/scrabble
SECRET_KEY=...
CORS_ORIGIN=https://games.carloseduardo.es
```
