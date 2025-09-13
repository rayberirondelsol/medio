.PHONY: help dev build test prod clean logs shell

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev: ## Start development server with hot reloading
	docker-compose up dev

build: ## Build production Docker image
	docker-compose build prod

test: ## Run tests in Docker container
	docker-compose --profile test up test

prod: ## Run production build locally
	docker-compose --profile production up prod

clean: ## Clean up Docker containers and volumes
	docker-compose down -v
	docker system prune -f

logs: ## Show logs from running containers
	docker-compose logs -f

shell: ## Open shell in development container
	docker-compose exec dev sh

install: ## Install dependencies locally (without Docker)
	npm install

start-local: ## Start development server locally (without Docker)
	npm start

build-local: ## Build production bundle locally (without Docker)
	npm run build

test-local: ## Run tests locally (without Docker)
	npm test

lint: ## Run linting in Docker container
	docker-compose run --rm dev npm run lint

lint-local: ## Run linting locally (without Docker)
	npm run lint

typecheck: ## Run type checking in Docker container
	docker-compose run --rm dev npm run typecheck

typecheck-local: ## Run type checking locally (without Docker)
	npm run typecheck

test-watch: ## Run tests in watch mode for TDD
	docker-compose run --rm dev npm test -- --watchAll

test-coverage: ## Run tests with coverage report
	docker-compose run --rm dev npm test -- --coverage --watchAll=false
