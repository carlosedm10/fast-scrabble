# Deploy — fast-scrabble

Producción en el VPS Hetzner (`167.233.36.55`), servido en `https://games.carloseduardo.es/scrabble`.

## Layout del servidor

```
/opt/apps/
  edge/                    ← Caddy compartido (80/443)
  wedding-invitations/     ← :3100 / :8100
  fast-scrabble/           ← :3200 / :8200
```

| App | Frontend | Backend | Path |
|---|---|---|---|
| wedding-invitations | 3100 | 8100 | `/` |
| **fast-scrabble** | **3200** | **8200** | `/scrabble` |

## Arquitectura

```
Browser → Caddy (edge) → 127.0.0.1:3200 (frontend)
                      → 127.0.0.1:8200 (backend API + Socket.IO)
                      → Postgres (red interna compose)
```

Rutas Caddy (`deploy/host/edge/sites/games.caddy`):

- `/scrabble/api*` → `:8200`
- `/scrabble/socket.io*` → `:8200`
- `/scrabble*` → `:3200`
- `/` → 302 `/scrabble`

## Secretos GitHub (repo `fast-scrabble`)

| Secret | Valor |
|---|---|
| `DEPLOY_HOST` | `167.233.36.55` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | misma clave privada que wedding (`~/.ssh/wedding_deploy`) |
| `DEPLOY_PATH` | `/opt/apps/fast-scrabble` |

El workflow `.github/workflows/deploy.yml` se ejecuta en push a `main` (o manualmente). Si faltan secretos, omite el deploy remoto.

Deploy manual (mismas variables de entorno):

```bash
export DEPLOY_HOST=167.233.36.55
export DEPLOY_USER=deploy
export DEPLOY_SSH_KEY=~/.ssh/wedding_deploy
export DEPLOY_PATH=/opt/apps/fast-scrabble
./deploy/remote-deploy.sh
```

## Checklist primera vez en el servidor

1. Crear directorio: `sudo mkdir -p /opt/apps/fast-scrabble && sudo chown deploy:deploy /opt/apps/fast-scrabble`
2. Copiar plantilla de entorno:
   ```bash
   cd /opt/apps/fast-scrabble
   cp deploy/env.production.example .env
   nano .env   # contraseñas y SECRET_KEY
   ```
3. Levantar stack: `docker compose -f compose.prod.yaml up --build -d`
4. Verificar puertos locales: `curl -s http://127.0.0.1:8200/scrabble/api/health` y `curl -sI http://127.0.0.1:3200/scrabble/`
5. Instalar site Caddy (o dejar que `remote-deploy.sh` lo haga):
   ```bash
   install -D -m 644 deploy/host/edge/sites/games.caddy /opt/apps/edge/sites/games.caddy
   cd /opt/apps/edge && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
   ```
6. Probar: `https://games.carloseduardo.es/scrabble`

## Qué hace `deploy/remote-deploy.sh`

1. `rsync` del repo al servidor (excluye `.git`, `node_modules`, `.env`)
2. `docker compose -f compose.prod.yaml up --build -d --force-recreate`
3. Copia `deploy/host/edge/sites/games.caddy` → `/opt/apps/edge/sites/`
4. Recarga Caddy en `/opt/apps/edge`

## `.env` de producción

Plantilla: `deploy/env.production.example` (nunca commitear `.env`).

Variables clave:

```
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=scrabble
DATABASE_URL=postgresql://...@postgres-scrabble:5432/scrabble
SECRET_KEY=...
PORT=8200
BASE_PATH=/scrabble
CORS_ORIGIN=https://games.carloseduardo.es
NODE_ENV=production
```

`compose.prod.yaml` expone solo en loopback (`127.0.0.1:3200`, `127.0.0.1:8200`); Caddy en el edge enruta el tráfico público.
