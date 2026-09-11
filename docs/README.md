# fast-scrabble — The One Doc

Real-time multiplayer Scrabble for 2–4 players (host picks the max when creating). Spanish (FISE) or English rules, chosen once when the host creates a room — that choice also sets the UI language. No accounts — nickname and token in the browser. Rooms expire 24 hours after the last move; scores are locked, then the room is deleted.

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
| **Room** | A game lobby with a 6-char shareable code and a max player count (2–4) |
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
- **Language is immutable** — set when the host creates the room; joiners inherit it for UI, bag, and lexicon.
- **24-hour inactivity** — last move (or last join if never started) older than 24 h → finish, broadcast ranking, delete the room.
- **Minimal dictionary** — bundled word lists for demo; production should use full open lexicons (see caveats below).

## How data flows

- **Reads**: Client syncs via `room:sync` or listens to `room:updated`.
- **Writes**: `game:play`, `game:pass`, `game:exchange`, `room:start` mutate state, persist to Postgres, broadcast.
- **Auth**: Opaque token per player in localStorage; no user accounts.

### Entities

- **Room**: code, language, maxPlayers, status, board, bag, players, turn index, lastMoveAt.
- **Player**: nickname, token, rack, score.

### One example, end to end

1. Host picks Español, player count, enters nickname, clicks Create Game.
2. Backend creates room, deals tiles, returns code and token.
3. Friend opens `/scrabble/p/ABC123` or types the code, joins with nickname.
4. Host confirms the 24 h warning and clicks Start; play begins.
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
