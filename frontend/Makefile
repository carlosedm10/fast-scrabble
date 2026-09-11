PROJECT_SLUG := scrabble
SERVICE := frontend-$(PROJECT_SLUG)

ifneq ($(filter true 1,$(CI) $(NATIVE)),)
define run_frontend
cd $(CURDIR) && $(1)
endef
else
define run_frontend
docker compose exec -T $(SERVICE) sh -c '$(1)'
endef
endif

.PHONY: build up down logs shell lint format test bun-install bun-add

build:
	@echo ":: build: frontend"
	docker compose build $(SERVICE)

up:
	@echo ":: up: frontend"
	docker compose up -d $(SERVICE)

down:
	@echo ":: down: frontend"
	docker compose stop $(SERVICE)

logs:
	docker compose logs -f $(SERVICE)

shell:
	docker compose exec $(SERVICE) sh

lint:
	@echo ":: lint: frontend"
	$(call run_frontend,bun run lint)

format:
	@echo ":: format: frontend"
	$(call run_frontend,bun run format)

test:
	@echo ":: test: frontend"
	$(call run_frontend,bun run test)

bun-install:
	docker compose exec -T $(SERVICE) bun install

bun-add:
	docker compose exec -T $(SERVICE) bun add $(PKG)
