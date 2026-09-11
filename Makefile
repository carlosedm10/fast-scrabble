PROJECT_SLUG := scrabble

# ------------------------------ Docker Compose ------------------------------ #
.PHONY: build up down restart build-backend build-frontend prod-up prod-down

build:
	@echo ":: build: ."
	docker compose build
	@echo "Images built. Run 'make up' to start."

build-backend:
	$(MAKE) -C backend build

build-frontend:
	$(MAKE) -C frontend build

up:
	@echo ":: up: ."
	docker compose up -d --force-recreate
	@echo "Backend:  http://localhost:8000/"
	@echo "Frontend: http://localhost:3000/scrabble/"

down:
	@echo ":: down: ."
	docker compose down --remove-orphans

restart:
	@echo ":: restart: ."
	docker compose restart

prod-up:
	@echo ":: prod-up: ."
	docker compose -f compose.prod.yaml up --build -d --force-recreate

prod-down:
	@echo ":: prod-down: ."
	docker compose -f compose.prod.yaml down --remove-orphans

# ----------------------------- Backend Package Management ----------------------------- #
.PHONY: bun-lock-backend bun-add-backend

bun-lock-backend:
	docker compose run --rm backend-$(PROJECT_SLUG) bun install

bun-add-backend:
	docker compose run --rm backend-$(PROJECT_SLUG) bun add $(PKG)

# ----------------------------- Frontend Package Management ----------------------------- #
.PHONY: bun-install bun-add

bun-install:
	$(MAKE) -C frontend bun-install

bun-add:
	$(MAKE) -C frontend bun-add PKG=$(PKG)

# ----------------------------- Terminals ----------------------------- #
.PHONY: backend-shell frontend-shell postgres-shell

backend-shell:
	docker compose exec backend-$(PROJECT_SLUG) sh

frontend-shell:
	docker compose exec frontend-$(PROJECT_SLUG) sh

postgres-shell:
	docker compose exec postgres-$(PROJECT_SLUG) psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-scrabble}

# ----------------------------- Debugging ----------------------------- #
.PHONY: logs-backend logs-frontend logs-db logs

logs-backend:
	docker compose logs -f backend-$(PROJECT_SLUG)

logs-frontend:
	docker compose logs -f frontend-$(PROJECT_SLUG)

logs-db:
	docker compose logs -f postgres-$(PROJECT_SLUG)

logs:
	docker compose logs -f backend-$(PROJECT_SLUG) frontend-$(PROJECT_SLUG)

# ----------------------------- Database ----------------------------- #
.PHONY: migrate db-load-schema-test

migrate:
	$(MAKE) -C backend migrate

db-load-schema-test:
	@echo "Schema auto-created on backend boot"

# ----------------------------- Code Formatting ----------------------------- #
.PHONY: lint-backend lint-frontend lint format-backend format-frontend format lint-fix-backend lint-fix-frontend lint-fix

lint-backend:
	$(MAKE) -C backend lint

lint-frontend:
	$(MAKE) -C frontend lint

lint:
	make lint-backend
	make lint-frontend

format-backend:
	$(MAKE) -C backend format

format-frontend:
	$(MAKE) -C frontend format

format:
	make format-backend
	make format-frontend

lint-fix-backend:
	docker compose exec -T backend-$(PROJECT_SLUG) sh -c "bun run lint"

lint-fix-frontend:
	docker compose exec -T frontend-$(PROJECT_SLUG) sh -c "bun run lint"

lint-fix:
	make lint-fix-backend
	make lint-fix-frontend

# ----------------------------- Testing ----------------------------- #
.PHONY: test-backend test-frontend test

test-backend:
	$(MAKE) -C backend test

test-frontend:
	$(MAKE) -C frontend test

test:
	make test-backend
	make test-frontend

# ----------------------------- ⛔️ DANGER ZONE ⛔️ ----------------------------- #
.PHONY: clean clean-builder

clean:
	docker compose down --volumes --remove-orphans

clean-builder: clean
	docker builder prune -f
