# fast-scrabble

Real-time multiplayer Scrabble — Spanish (FISE) and English rules, 2–4 players, no accounts.


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
- **Deploy:** Docker Compose behind any TLS reverse proxy (Caddy example included)

## Docs

- [docs/README.md](docs/README.md) — architecture and game rules
- [docs/deploy.md](docs/deploy.md) — host it yourself
- [AGENTS.md](AGENTS.md) — agent/developer orientation

## Secrets (you configure)

- Local: copy `.env_template` → `.env`
- Production: copy `deploy/env.production.example` → `.env` and set `PUBLIC_HOST`, `POSTGRES_PASSWORD` and `SECRET_KEY`

## License

[Apache 2.0](LICENSE)
