# Server — Port allocation

Shared Hetzner host `games.carloseduardo.es` (`167.233.36.55`).

| App | Frontend | Backend | Path |
|---|---|---|---|
| wedding-invitations | 3100 | 8100 | `/` (or app-specific) |
| **fast-scrabble** | **3200** | **8200** | `/scrabble` |

## fast-scrabble

- Frontend container: `scrabble_frontend` → host `3200`
- Backend container: `scrabble_backend` → host `8200`
- Database: `scrabble_db` (internal only, no host port in prod)
- Deploy path: `/opt/apps/fast-scrabble`
- Compose file: `compose.prod.yaml`

## Caddy

Edge config: `deploy/host/edge/sites/games.caddy`

Reload after changes: `sudo systemctl reload caddy` (or your edge reload command).
