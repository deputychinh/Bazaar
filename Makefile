# Bazaar — one command per task. `make help` lists them.
.DEFAULT_GOAL := help
SHELL := /bin/bash
BACKEND := cd backend &&
COMPOSE := docker compose
INFRA := mysql mongo redis kafka kafka-ui storage mailpit
INIT_JOBS := kafka-init storage-init
GATEWAY_SECRETS := backend/services/gateway/.secrets
# Images: tag = git sha (plan §11); the registry is the kind cluster's local one.
REGISTRY ?= localhost:5001
TAG ?= $(shell git rev-parse --short HEAD)
SERVICES := gateway:4000 catalog:4010 order:4020 notification:4030
MIGRATORS := gateway order

help: ## Show this help
	@grep -E '^[a-z0-9-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- setup -------------------------------------------------------------------
env: ## Create .env from .env.example (keeps an existing .env)
	@cp -n .env.example .env && echo "created .env" || echo ".env already exists"

install: env keys ## Install repo tooling and backend dependencies
	npm install
	$(BACKEND) npm install

keys: ## Create the local RS256 key pair for access tokens (kept if it exists)
	@mkdir -p $(GATEWAY_SECRETS)
	@test -f $(GATEWAY_SECRETS)/jwt-private.pem || ( \
		openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out $(GATEWAY_SECRETS)/jwt-private.pem 2>/dev/null && \
		openssl pkey -in $(GATEWAY_SECRETS)/jwt-private.pem -pubout -out $(GATEWAY_SECRETS)/jwt-public.pem && \
		chmod 600 $(GATEWAY_SECRETS)/jwt-private.pem && echo "created JWT keys in $(GATEWAY_SECRETS)" )

# --- local infrastructure ----------------------------------------------------
up: env ## Start MySQL, MongoDB, Redis, Kafka (+ topics), Kafka UI, object storage, Mailpit
	$(COMPOSE) up -d --wait --wait-timeout 300 $(INFRA)
	@for job in $(INIT_JOBS); do $(COMPOSE) run --rm --no-deps $$job || exit 1; done
	@$(MAKE) --no-print-directory urls

up-full: env keys ## Everything from images behind the edge proxy: http://bazaar.localhost:8000
	TAG=$(TAG) $(COMPOSE) --profile full up -d --build --wait --wait-timeout 300

down: ## Stop the infrastructure and the apps (data is kept)
	$(COMPOSE) --profile full down

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
	set -a && source .env && set +a && cd backend && npm run migrate --workspaces --if-present

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

e2e: ## Playwright journeys (needs the stack running: up, seed, services, admin site on :3200)
	cd e2e && npm ci && npx playwright install chromium && npx playwright test

build: ## Build every backend package
	$(BACKEND) npm run build

openapi: ## Regenerate backend/openapi/*.json and db/*/schema.sql
	$(BACKEND) npm run build && npm run openapi -w @bazaar/gateway && npm run openapi -w @bazaar/catalog && npm run openapi -w @bazaar/order && npm run openapi -w @bazaar/notification && npm run db:schema-sql -w @bazaar/gateway && npm run db:schema-sql -w @bazaar/order

ci: lint typecheck test build ## Run the CI pipeline locally

format: ## Format every file with Prettier
	npx prettier --write .

# --- images ------------------------------------------------------------------
images: ## Build every image tagged $(REGISTRY)/bazaar/<app>:<git sha>
	@set -e; for entry in $(SERVICES); do name=$${entry%%:*}; port=$${entry##*:}; \
		echo "→ $$name"; docker build -q --build-arg SERVICE=$$name --build-arg PORT=$$port \
			-t $(REGISTRY)/bazaar/$$name:$(TAG) backend; done
	@set -e; for name in $(MIGRATORS); do echo "→ $$name-migrate"; docker build -q --target migrate \
		--build-arg SERVICE=$$name -t $(REGISTRY)/bazaar/$$name-migrate:$(TAG) backend; done
	@echo "→ web"; docker build -q -t $(REGISTRY)/bazaar/web:$(TAG) frontend-web
	@echo "→ admin"; docker build -q -t $(REGISTRY)/bazaar/admin:$(TAG) frontend-admin

# --- kubernetes (staging on kind) --------------------------------------------
k8s-up: k8s-up-cluster release ## Cluster + add-ons, then release the current sha → http://bazaar.localhost

k8s-up-cluster: ## Only the kind cluster, local registry and add-ons (Traefik, metrics-server, Strimzi)
	infra/k8s/kind/cluster.sh up

k8s-down: ## Delete the kind cluster (registry images are kept)
	infra/k8s/kind/cluster.sh down

k8s-status: ## Nodes, Helm releases and Bazaar pods
	infra/k8s/kind/cluster.sh status

k8s-load: images ## Build every image and push it to the cluster registry (localhost:5001)
	@set -e; for name in gateway catalog order notification gateway-migrate order-migrate web admin; do \
		docker push -q $(REGISTRY)/bazaar/$$name:$(TAG); done

release: k8s-load ## Build, push and deploy the current sha to kind (data → db-setup → apps)
	infra/k8s/deploy.sh $(TAG)

rollback: ## Deploy an earlier sha that is still in the registry: make rollback TAG=<sha>
	@test -n "$(filter command line,$(origin TAG))" || { echo "usage: make rollback TAG=<sha>"; exit 1; }
	infra/k8s/deploy.sh $(TAG)

dev-gateway: keys ## Run the gateway with reload on :4000
	$(BACKEND) npm run dev -w @bazaar/gateway

dev-catalog: ## Run the catalog service with reload on :4010
	$(BACKEND) npm run dev -w @bazaar/catalog

dev-order: ## Run the order service with reload on :4020
	$(BACKEND) npm run dev -w @bazaar/order

dev-notification: ## Run the notification service with reload on :4030
	$(BACKEND) npm run dev -w @bazaar/notification

.PHONY: help env install keys up-full dev-gateway dev-catalog dev-order dev-notification up down ps logs nuke urls migrate db-schema seed db-reset lint typecheck test test-int build openapi ci format e2e images k8s-up k8s-up-cluster k8s-down k8s-status k8s-load release rollback
