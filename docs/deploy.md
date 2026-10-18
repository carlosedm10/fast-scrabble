# Host it yourself

fast-scrabble runs as three containers from `compose.prod.yaml`: the
frontend (Vite preview), the backend (Bun, Fastify, Socket.IO) and
Postgres 16. Both app ports bind to `127.0.0.1` only, so you need a reverse
proxy in front for TLS. Everything is served under `/scrabble/`.

```
Browser → reverse proxy (TLS) → 127.0.0.1:3200  frontend
                              → 127.0.0.1:8200  API + Socket.IO
                                 Postgres on the compose network only
```

## Requirements

- A Linux host with Docker and the Compose plugin
- A DNS name pointing at it, for example `scrabble.example.com`
- Ports 80 and 443 open for the proxy

## Steps

1. Get the code onto the host:

   ```bash
   git clone https://github.com/carlosedm10/fast-scrabble.git
   cd fast-scrabble
   ```

2. Create `.env` from the production template and fill it in:

   ```bash
   cp deploy/env.production.example .env
   ```

   - `PUBLIC_HOST`: your hostname, without `https://`
   - `POSTGRES_PASSWORD` and the same password inside `DATABASE_URL`
   - `SECRET_KEY`: a long random string, e.g. `openssl rand -hex 32`
   - `CORS_ORIGIN`: `https://` plus `PUBLIC_HOST`

   Never commit `.env`.

3. Build and start:

   ```bash
   make prod-up
   ```

4. Check the local ports:

   ```bash
   curl -s http://127.0.0.1:8200/scrabble/api/health
   curl -sI http://127.0.0.1:3200/scrabble/
   ```

5. Put a reverse proxy in front. With Caddy, copy
   `deploy/Caddyfile.example`, replace `scrabble.example.com` with your
   `PUBLIC_HOST`, and reload Caddy. Any proxy works if it:

   - redirects `/scrabble` to `/scrabble/` (Vite preview 404s the bare path)
   - sends `/scrabble/api*` and `/scrabble/socket.io*` to `127.0.0.1:8200`,
     with WebSocket upgrades
   - sends the rest of `/scrabble*` to `127.0.0.1:3200`

6. Open `https://<PUBLIC_HOST>/scrabble/`.

## Updating

```bash
git pull
make prod-up
```

`make prod-up` rebuilds the images and recreates the containers. The
Postgres volume `postgres_data_scrabble` keeps the data.

## Backups

Dump the database from the running container:

```bash
docker exec scrabble_db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom > scrabble.dump
```
