# Makefile for PostgreSQL DDL Visualizer
# Supports both Docker and Podman

# Detect container runtime (podman or docker)
CONTAINER_RUNTIME := $(shell command -v podman 2> /dev/null)
ifdef CONTAINER_RUNTIME
	COMPOSE = podman-compose
	RUNTIME = podman
else
	COMPOSE = docker-compose
	RUNTIME = docker
endif

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

.PHONY: help up down restart logs logs-backend logs-frontend build rebuild clean ps health backend frontend backend-build frontend-build backend-logs frontend-logs backend-shell frontend-shell

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)PostgreSQL DDL Visualizer - Makefile Commands$(NC)"
	@echo "$(YELLOW)Using: $(RUNTIME) / $(COMPOSE)$(NC)"
	@echo ""
	@echo "$(GREEN)Main Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Service URLs:$(NC)"
	@echo "  Frontend:    http://localhost:3005"
	@echo "  Backend API: http://localhost:6005/api"
	@echo "  API Docs:    http://localhost:6005/docs"

up: ## Start all services
	@echo "$(GREEN)Starting all services with $(COMPOSE)...$(NC)"
	$(COMPOSE) up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "Frontend: http://localhost:3005"
	@echo "Backend:  http://localhost:6005/api"

up-build: ## Build and start all services
	@echo "$(GREEN)Building and starting all services...$(NC)"
	$(COMPOSE) up -d --build
	@echo "$(GREEN)Services built and started!$(NC)"

down: ## Stop all services
	@echo "$(YELLOW)Stopping all services...$(NC)"
	$(COMPOSE) down
	@echo "$(GREEN)Services stopped!$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(NC)"
	$(COMPOSE) restart
	@echo "$(GREEN)Services restarted!$(NC)"

logs: ## View logs from all services
	$(COMPOSE) logs -f

logs-backend: ## View backend logs only
	$(COMPOSE) logs -f backend

logs-frontend: ## View frontend logs only
	$(COMPOSE) logs -f frontend

build: ## Build all services without starting
	@echo "$(GREEN)Building all services...$(NC)"
	$(COMPOSE) build
	@echo "$(GREEN)Build complete!$(NC)"

rebuild: ## Rebuild and restart all services
	@echo "$(GREEN)Rebuilding all services...$(NC)"
	$(COMPOSE) up -d --build --force-recreate
	@echo "$(GREEN)Rebuild complete!$(NC)"

clean: ## Stop and remove all containers, networks, and volumes
	@echo "$(YELLOW)Cleaning up containers, networks, and volumes...$(NC)"
	$(COMPOSE) down -v
	@echo "$(GREEN)Cleanup complete!$(NC)"

clean-all: ## Remove containers, networks, volumes, and images
	@echo "$(YELLOW)Removing everything including images...$(NC)"
	$(COMPOSE) down -v --rmi all
	@echo "$(GREEN)Full cleanup complete!$(NC)"

ps: ## Show status of all services
	$(COMPOSE) ps

health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(GREEN)Backend:$(NC)"
	@curl -s http://localhost:6005/api/health | grep -q healthy && echo "  Status: $(GREEN)Healthy$(NC)" || echo "  Status: $(YELLOW)Unhealthy$(NC)"
	@echo ""
	@echo "$(GREEN)Frontend:$(NC)"
	@curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n" http://localhost:3005

# Individual service commands
backend: ## Start backend service only
	@echo "$(GREEN)Starting backend service...$(NC)"
	$(COMPOSE) up -d backend

frontend: ## Start frontend service only
	@echo "$(GREEN)Starting frontend service...$(NC)"
	$(COMPOSE) up -d frontend

backend-build: ## Build backend service only
	@echo "$(GREEN)Building backend service...$(NC)"
	$(COMPOSE) build backend

frontend-build: ## Build frontend service only
	@echo "$(GREEN)Building frontend service...$(NC)"
	$(COMPOSE) build frontend

backend-logs: logs-backend ## Alias for logs-backend

frontend-logs: logs-frontend ## Alias for logs-frontend

backend-shell: ## Open a shell in the backend container
	$(COMPOSE) exec backend /bin/bash

frontend-shell: ## Open a shell in the frontend container
	$(COMPOSE) exec frontend /bin/sh

backend-restart: ## Restart backend service only
	@echo "$(YELLOW)Restarting backend service...$(NC)"
	$(COMPOSE) restart backend

frontend-restart: ## Restart frontend service only
	@echo "$(YELLOW)Restarting frontend service...$(NC)"
	$(COMPOSE) restart frontend

# Development helpers
dev-setup: ## Setup for local development (no containers)
	@echo "$(BLUE)Setting up local development environment...$(NC)"
	@echo ""
	@echo "$(GREEN)Backend setup:$(NC)"
	cd backend && python -m venv venv && \
		(. venv/bin/activate && pip install -r requirements.txt)
	@echo ""
	@echo "$(GREEN)Frontend setup:$(NC)"
	cd frontend && npm install
	@echo ""
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "To start backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
	@echo "To start frontend: cd frontend && npm run dev"

test-backend: ## Run backend tests
	@echo "$(GREEN)Running backend tests...$(NC)"
	cd backend && pytest tests/test_parser.py -v

# Podman-specific commands
podman-info: ## Show podman system info (podman only)
	@if [ "$(RUNTIME)" = "podman" ]; then \
		podman system info; \
	else \
		echo "$(YELLOW)This command is only available with podman$(NC)"; \
	fi

# Docker-specific commands
docker-info: ## Show docker system info (docker only)
	@if [ "$(RUNTIME)" = "docker" ]; then \
		docker system info; \
	else \
		echo "$(YELLOW)This command is only available with docker$(NC)"; \
	fi

# Aliases for common typos
start: up ## Alias for 'up'
stop: down ## Alias for 'down'
log: logs ## Alias for 'logs'
