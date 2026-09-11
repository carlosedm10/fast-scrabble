# Frontend — Agent Instructions

Vite + React + TypeScript + Tailwind. Served at `/scrabble/`.

Read before changing anything:

1. [../docs/README.md](../docs/README.md) — system overview.
2. Socket client: `src/lib/socket.ts` — path differs in dev vs prod.

Known code flaws: [../INCONSISTENCIES.md](../INCONSISTENCIES.md).

## Non-negotiable rules

- **Brand palette** — dark `#0A0A0A`/`#151515`, cyan `#049EE2`/`#17C0FD`, white accent (not default Zinc).
- **Tap-to-place** — board cells are buttons; rack tiles select then tap cell (tablet-first).
- **Wildcard dialog** — blank tiles open letter picker; Spanish excludes K/W.
- **No secrets in frontend** — token/nickname in localStorage only.

## Local verification

- `cd frontend && bun run lint`
- Dev: http://localhost:3000/scrabble/
