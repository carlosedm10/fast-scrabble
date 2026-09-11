# fast-scrabble — Known Inconsistencies

Findings from initial build (2026-09-11). Fix opportunistically; delete entries as they land.

## Should fix

1. **Frontend socket path in dev** — Dev uses `/socket.io` directly; prod uses `/scrabble/socket.io`. Vite proxy handles local dev but paths must stay aligned with Caddy in prod.

## Worth a look

2. **Prod frontend preview port** — `compose.prod.yaml` maps `3200:3200` but dev Dockerfile defaults to 5173; prod command overrides to 3200.

3. **wedding-invitations server.md row** — wedding-invitations repo not in workspace; port row documented here only.

## Checked and clean

- **Spanish bag** — 100 tiles, no K/W, CH/LL/RR/Ñ present, 2 blanks.
- **Open lexicons** — `backend/src/game/lexicon/` loads full ES/EN lists; CLARA and similar common words validate.
- **K/W wildcard prohibition** — tested in `tests/kw-prohibition.test.ts` and `tests/wildcard.test.ts`.
- **Makefile lifecycle** — uses `up`/`down`/`build`/`restart`, not `start`/`stop`.
