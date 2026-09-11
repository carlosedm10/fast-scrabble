PROJECT_SLUG := scrabble
SERVICE := backend-$(PROJECT_SLUG)

ifneq ($(filter true 1,$(CI) $(NATIVE)),)
define run_backend
cd $(CURDIR) && $(1)
endef
else
define run_backend
docker compose exec -T $(SERVICE) sh -c '$(1)'
endef
endif

.PHONY: build up down logs shell lint format test migrate

build:
	@echo ":: build: backend"
	docker compose build $(SERVICE)

up:
	@echo ":: up: backend"
	docker compose up -d $(SERVICE) postgres-$(PROJECT_SLUG)

down:
	@echo ":: down: backend"
	docker compose stop $(SERVICE)

logs:
	docker compose logs -f $(SERVICE)

shell:
	docker compose exec $(SERVICE) sh

lint:
	@echo ":: lint: backend"
	$(call run_backend,bun run lint)

format:
	@echo ":: format: backend"
	$(call run_backend,bun run format)

test:
	@echo ":: test: backend"
	$(call run_backend,bun test)

migrate:
	@echo ":: migrate: backend (schema auto-created on boot)"
	@echo "Database schema is initialized on server start."
