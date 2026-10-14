# Deploy — fast-scrabble

Producción en el VPS Hetzner (`167.233.36.55`), servido en `https://games.carloseduardo.es/scrabble/`.

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

- `/scrabble` → 308 `/scrabble/` (Vite `base` requires the trailing slash)
- `/` → 302 `/scrabble/`
- `/scrabble/api*` → `:8200`
- `/scrabble/socket.io*` → `:8200`
- `/scrabble*` → `:3200`

## Configuración de GitHub (entorno `production`)

El job de deploy usa el entorno `production`. Sin fallback `secrets || vars`. Si falta un secreto o una variable obligatoria, el workflow falla. La clave de host sale de `ssh-keyscan` en cada deploy.

`DEPLOY_PATH` es la constante `/opt/apps/fast-scrabble` en el workflow. No es secreto ni variable.

| Nombre | Tipo | Valor |
|---|---|---|
| `DEPLOY_HOST` | secret | `167.233.36.55` |
| `DEPLOY_USER` | secret | `deploy` |
| `DEPLOY_SSH_KEY` | secret | misma clave privada que wedding (`~/.ssh/wedding_deploy`) |
| `DEPLOY_SSH_PORT` | secret, opcional | vacío significa `22` |
| `POSTGRES_PASSWORD` | secret | contraseña de Postgres |
| `POSTGRES_USER` | variable | usuario de Postgres (`scrabble`) |
| `POSTGRES_DB` | variable | base de datos (`scrabble`) |

El workflow escribe el `.env` del servidor con esas tres claves de Postgres, más `DATABASE_URL` (la compone, no hay que definirla), `NODE_ENV=production`, `PORT=8200`, `BASE_PATH=/scrabble` y `CORS_ORIGIN=https://games.carloseduardo.es`. No imprime el contenido.

El workflow `.github/workflows/deploy.yml` se ejecuta en push a `main` (o manualmente).

Deploy manual (el `.env` del servidor se conserva si no pasas `DEPLOY_ENV_FILE`):

```bash
export DEPLOY_HOST=167.233.36.55
export DEPLOY_USER=deploy
export DEPLOY_SSH_KEY=~/.ssh/wedding_deploy
export DEPLOY_PATH=/opt/apps/fast-scrabble
# export DEPLOY_SSH_PORT=22
# export DEPLOY_ENV_FILE=/ruta/al/env/renderizado
./deploy/remote-deploy.sh
```

## Checklist primera vez en el servidor

1. Crear directorio: `sudo mkdir -p /opt/apps/fast-scrabble && sudo chown deploy:deploy /opt/apps/fast-scrabble`
2. Definir los secretos y variables del entorno `production` (el workflow escribe `.env` en el deploy).
3. Levantar stack: `docker compose -f compose.prod.yaml up --build -d` (hace falta un `.env` ya escrito, o lanzar el workflow)
4. Verificar puertos locales: `curl -s http://127.0.0.1:8200/scrabble/api/health` y `curl -sI http://127.0.0.1:3200/scrabble/`
5. Instalar site Caddy (o dejar que `remote-deploy.sh` lo haga):
   ```bash
   install -D -m 644 deploy/host/edge/sites/games.caddy /opt/apps/edge/sites/games.caddy
   cd /opt/apps/edge && docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile
   ```
6. Probar: `https://games.carloseduardo.es/scrabble/` (bare `/scrabble` 308s here)

## Qué hace `deploy/remote-deploy.sh`

1. `ssh-keyscan` del host de deploy
2. `rsync` del repo al servidor (excluye `.git`, `node_modules`, `.env`)
3. Si hay `DEPLOY_ENV_FILE`, lo instala como `.env` del servidor (modo `600`)
4. `docker compose -f compose.prod.yaml up --build -d --force-recreate`
5. Copia `deploy/host/edge/sites/games.caddy` → `/opt/apps/edge/sites/`
6. Recarga Caddy en `/opt/apps/edge`

## `.env` de producción

Lo escribe el workflow en cada deploy. La forma está en `deploy/env.production.example` (nunca commitear `.env`).

```
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=scrabble
DATABASE_URL=postgresql://...@postgres-scrabble:5432/scrabble
NODE_ENV=production
PORT=8200
BASE_PATH=/scrabble
CORS_ORIGIN=https://games.carloseduardo.es
```

`compose.prod.yaml` expone solo en loopback (`127.0.0.1:3200`, `127.0.0.1:8200`); Caddy en el edge enruta el tráfico público.
