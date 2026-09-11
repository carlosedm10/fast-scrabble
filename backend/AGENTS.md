# Backend — Agent Instructions

Node + Fastify + Socket.IO + Postgres. Game logic lives in `src/game/`.

Read before changing anything:

1. [../docs/README.md](../docs/README.md) — system overview.
2. Game engine: `src/game/` — tiles, placement, scoring, dictionary, room state.

Known code flaws: [../INCONSISTENCIES.md](../INCONSISTENCIES.md).

## Non-negotiable rules

- **Validate on server** — placement, wildcards, and scoring are authoritative; never trust the client.
- **Persist rooms** — `saveRoom` after every state change; Postgres is source of truth across restarts.
- **Spanish wildcards** — reject K and W assignments via `isWildcardForbidden`.
- **Tests required** — add cases in `tests/` for new game rules.

## Local verification

- `cd backend && bun test`
- `CI=true make test-backend` from repo root
