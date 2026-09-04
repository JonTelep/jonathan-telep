.PHONY: dev build run stop clean all help restart

IMAGE_NAME = jonathan-telep
CONTAINER_NAME = jonathan-telep
PORT = 3000

help:
	@echo "Available targets:"
	@echo "  make build       - Build the container image"
	@echo "  make run         - Run the container"
	@echo "  make stop        - Stop the running container"
	@echo "  make clean       - Stop and remove container and image"
	@echo "  make all         - Build and run (default)"
	@echo "  make restart     - Stop, build, and run"
	@echo "  make dev         - Run the local dev server (node) on http://localhost:8000"

all: build run

# Local dev: node server.js serves the site and proxies /api/mrate and /api/space.
# Loads FRED_API_KEY from .env if present (needed for the mrate command / ticker).
dev:
	@if [ -f .env ]; then set -a; . ./.env; set +a; fi; \
	echo "Dev server at http://localhost:8000  (landing)  http://localhost:8000/terminal  (terminal)"; \
	node server.js

build:
	@echo "Building container image..."
	podman build -t $(IMAGE_NAME) .

run:
	@echo "Running container..."
	podman run -d --name $(CONTAINER_NAME) --env-file .env -p $(PORT):3000 $(IMAGE_NAME)
	@echo "Container running at http://localhost:$(PORT)"

stop:
	@echo "Stopping container..."
	-podman stop $(CONTAINER_NAME)
	-podman rm $(CONTAINER_NAME)

clean: stop
	@echo "Removing image..."
	-podman rmi $(IMAGE_NAME)

restart: stop build run
