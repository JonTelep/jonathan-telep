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

# Node 22+; use an installed mise Node when the shell has no configured version.
dev:
	@if node --version >/dev/null 2>&1 && npm --version >/dev/null 2>&1; then npm run dev; \
	elif command -v mise >/dev/null 2>&1; then mise exec node@26.7.0 -- npm run dev; \
	else echo "Install Node.js 22+ to run make dev"; exit 1; fi

build:
	@echo "Building container image..."
	podman build --format docker -t $(IMAGE_NAME) .

run:
	@echo "Running container..."
	podman run -d --name $(CONTAINER_NAME) $(if $(wildcard .env),--env-file .env,) -p $(PORT):3000 $(IMAGE_NAME)
	@echo "Container running at http://localhost:$(PORT)"

stop:
	@echo "Stopping container..."
	-podman stop $(CONTAINER_NAME)
	-podman rm $(CONTAINER_NAME)

clean: stop
	@echo "Removing image..."
	-podman rmi $(IMAGE_NAME)

restart: stop build run
