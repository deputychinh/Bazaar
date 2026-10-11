# Bazaar — one command per task. `make help` lists them.
.DEFAULT_GOAL := help
SHELL := /bin/bash
BACKEND := cd backend &&
COMPOSE := docker compose
INFRA := mysql mongo redis kafka kafka-ui storage mailpit
INIT_JOBS := kafka-init storage-init

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------
env: ## Create .env from .env.example (keeps an existing .env)
	@cp -n .env.example .env && echo "created .env" || echo ".env already exists"

install: env ## Install repo tooling and backend dependencies
	npm install
	$(BACKEND) npm install

# --- local infrastructure ----------------------------------------------------
up: env ## Start MySQL, MongoDB, Redis, Kafka (+ topics), Kafka UI, object storage, Mailpit
	$(COMPOSE) up -d --wait --wait-timeout 300 $(INFRA)
	@for job in $(INIT_JOBS); do $(COMPOSE) run --rm --no-deps $$job || exit 1; done
	@$(MAKE) --no-print-directory urls

down: ## Stop the infrastructure (data is kept)
	$(COMPOSE) down

ps: ## Show container status
	$(COMPOSE) ps -a

logs: ## Follow infrastructure logs (make logs s=kafka for one service)
	$(COMPOSE) logs -f $(s)

nuke: ## Stop the infrastructure and DELETE all local data volumes
	$(COMPOSE) down -v

urls: ## Print the local tool URLs
	@echo "  Kafka UI     http://localhost:8085"
	@echo "  Mailpit      http://localhost:8026"
	@echo "  Storage UI   http://localhost:9003"

# --- databases ---------------------------------------------------------------
migrate: ## Apply Prisma migrations to the MySQL databases (services added from P1)
	$(BACKEND) npm run migrate --workspaces --if-present

db-schema: ## Apply MongoDB schema files (collections, validators, indexes)
	backend/db/scripts/apply.sh schema

seed: ## Load seed data (data.sql / data.js)
	backend/db/scripts/apply.sh data

db-reset: ## Drop every Bazaar database, then migrate, apply schema and seed
	backend/db/scripts/apply.sh drop
	@$(MAKE) --no-print-directory migrate db-schema seed

# --- quality -----------------------------------------------------------------
lint: ## Lint backend code and check formatting
	$(BACKEND) npm run lint
	npx prettier --check .

typecheck: ## Type-check every backend package
	$(BACKEND) npm run typecheck

test: ## Unit tests with coverage
	$(BACKEND) npm test

test-int: ## Integration tests (needs `make up`)
	$(BACKEND) npm run test:int

build: ## Build every backend package
	$(BACKEND) npm run build

ci: lint typecheck test build ## Run the CI pipeline locally

format: ## Format every file with Prettier
	npx prettier --write .

.PHONY: help env install up down ps logs nuke urls migrate db-schema seed db-reset lint typecheck test test-int build ci format
