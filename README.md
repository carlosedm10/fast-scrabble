# fast-scrabble

Real-time multiplayer Scrabble — Spanish (FISE) and English rules, 2–4 players, no accounts.

**Play at:** `https://games.carloseduardo.es/scrabble` (when deployed)

## Quick start

```bash
cp .env_template .env
make build
make up
```

Open http://localhost:3000/scrabble/

## Commands

| Command | Description |
|---|---|
| `make up` | Start dev stack |
| `make down` | Stop stack |
| `make lint` | Typecheck backend + frontend |
| `make test` | Run backend tests |
| `make prod-up` | Start production compose |

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn-style components
- **Backend:** Bun + Fastify + Socket.IO + Postgres 16
- **Deploy:** Docker Compose on Hetzner, Caddy edge proxy

## Docs

- [docs/README.md](docs/README.md) — architecture and game rules
- [docs/deploy.md](docs/deploy.md) — production deploy
- [AGENTS.md](AGENTS.md) — agent/developer orientation

## Secrets (you configure)

- Local: copy `.env_template` → `.env`
- CI deploy: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`
- VM: production `.env` with real `POSTGRES_PASSWORD`, `SECRET_KEY`
