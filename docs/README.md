# fast-scrabble — The One Doc

Real-time multiplayer Scrabble for 2–4 players. Spanish (FISE) or English rules, chosen once when the host creates a room. No accounts — nickname and token in the browser.

## The layers

```
Browser (/scrabble/) → Socket.IO + REST → Fastify backend → Postgres (room state)
                     ↘ static Vite build (prod) or dev server (local)
```

- **Frontend** (`frontend/`) — React SPA, tap-to-place board, wildcard letter picker.
- **Backend** (`backend/`) — authoritative game engine, Socket.IO events, room persistence.
- **Postgres** — JSONB room state; survives server restarts.

## The taxonomy

| Term | Meaning |
|---|---|
| **Room** | A game lobby with a 6-char shareable code |
| **Language** | `es` (FISE) or `en` (Hasbro) — fixed at room creation |
| **Tile** | Letter or blank wildcard from the bag |
| **Rack** | Player's hand (7 tiles when playing) |
| **Placement** | One turn's tiles placed in a straight line |

## How it's built

```
create/join room → Socket.IO room:* events → game engine validates → Postgres save → broadcast room:updated
```

### Principles that matter

- **Server is authoritative** — placement, scoring, and wildcard rules are validated in `backend/src/game/`.
- **Language is immutable** — set when the host creates the room; joiners cannot change it.
- **Minimal dictionary** — bundled word lists for demo; production should use full open lexicons (see caveats below).

## How data flows

- **Reads**: Client syncs via `room:sync` or listens to `room:updated`.
- **Writes**: `game:play`, `game:pass`, `game:exchange`, `room:start` mutate state, persist to Postgres, broadcast.
- **Auth**: Opaque token per player in localStorage; no user accounts.

### Entities

- **Room**: code, language, status, board, bag, players, turn index.
- **Player**: nickname, token, rack, score.

### One example, end to end

1. Host picks Español, enters nickname, clicks Create Game.
2. Backend creates room, deals tiles, returns code and token.
3. Friend opens `/scrabble/p/ABC123`, joins with nickname.
4. Host clicks Start; play begins.
5. Active player selects rack tile, taps board cell, plays word; server scores and broadcasts.

## Key decisions and caveats

- **FISE Spanish bag**: 100 tiles, Ñ included, no K/W, CH/LL/RR as single tiles, 2 blanks (cannot represent K/W).
- **Dictionary copyright**: Word lists are simplified subsets for development. Full hunspell/ENABLE/SOWPODS lists have licensing terms — verify before production use.
- **Base path `/scrabble/`**: Required for shared `games.carloseduardo.es` host behind Caddy.

## Where the details live

- Game engine: `backend/src/game/`
- Socket handlers: `backend/src/socket.ts`
- Deploy: `docs/deploy.md`, `docs/server.md`
- Caddy site: `deploy/host/edge/sites/games.caddy`
