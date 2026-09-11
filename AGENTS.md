# fast-scrabble — Agent Instructions

Full-stack multiplayer Scrabble (Node/Fastify + React/Vite) with Spanish FISE and English rules.

Read before changing anything:

1. [docs/README.md](docs/README.md) — taxonomy, architecture, data flows, key decisions.
2. [backend/AGENTS.md](backend/AGENTS.md) — game engine and API rules.
3. [frontend/AGENTS.md](frontend/AGENTS.md) — UI and Socket.IO client rules.

Known code flaws: [INCONSISTENCIES.md](INCONSISTENCIES.md).

Skills: [.cursor/skills/](.cursor/skills/) — scaffold, Docker, Makefile, CI, and doc conventions.

## Non-negotiable rules

- **Language is set once** — chosen when creating a room; all players inherit it.
- **Spanish FISE bag** — Ñ yes, K/W no, CH/LL/RR as single tiles, 2 blanks (cannot be K/W).
- **No accounts** — nickname + token in localStorage only.
- **Makefile contract** — CI and deploy call `make` targets; never duplicate tool commands in workflows.
- **Base path** — frontend `base: '/scrabble/'`; prod API at `/scrabble/api`, Socket.IO at `/scrabble/socket.io`.

## Local verification

- `cp .env_template .env && make build && make up`
- `make lint` / `make test` (set `CI=true` for native runs without Docker exec)
- App: http://localhost:3000/scrabble/
