.DEFAULT_GOAL := help
COMPOSE := docker compose

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the whole stack (web :8080, API :8000)
	$(COMPOSE) up --build -d
	@echo "\n  Wellora is running:  web → http://localhost:$${WEB_PORT:-8080}   API docs → http://localhost:$${API_PORT:-8000}/docs\n"

down: ## Stop everything (data is kept)
	$(COMPOSE) down

logs: ## Follow logs from all services
	$(COMPOSE) logs -f

ps: ## Show running services
	$(COMPOSE) ps

test: ## Run backend + frontend lint and test suites in Docker
	$(COMPOSE) --profile test build backend-tests frontend-tests
	$(COMPOSE) --profile test run --rm backend-tests
	$(COMPOSE) --profile test run --rm frontend-tests

demo: ## Start with sample data for the demo user
	WELLORA_SEED_DEMO=true $(MAKE) up

reset: ## Stop and DELETE all stored data
	$(COMPOSE) down -v

.PHONY: help up down logs ps test demo reset
