.PHONY: build run stop clean all help terminal logs

IMAGE_NAME = jonathan-telep
CONTAINER_NAME = jonathan-telep
PORT = 8080

help:
	@echo "Available targets:"
	@echo "  make build       - Build the container image"
	@echo "  make run         - Run the container"
	@echo "  make stop        - Stop the running container"
	@echo "  make clean       - Stop and remove container and image"
	@echo "  make all         - Build and run (default)"
	@echo "  make restart     - Stop, build, and run"
	@echo "  make logs        - Follow logs from the running container"
	@echo "  make terminal    - Open terminal in container"

all: build run

build:
	@echo "Building container image..."
	podman build -t $(IMAGE_NAME) .

run:
	@echo "Running container..."
	podman run -d --name $(CONTAINER_NAME) -p $(PORT):3000 \
		-e POSTGRES_HOST=host.containers.internal \
		$(IMAGE_NAME)
	@echo "Container running at http://127.0.0.1:$(PORT)"

stop:
	@echo "Stopping container..."
	-podman stop $(CONTAINER_NAME)
	-podman rm $(CONTAINER_NAME)

clean: stop
	@echo "Removing image..."
	-podman rmi $(IMAGE_NAME)

restart: stop build run

terminal:
	@echo "Opening terminal in container..."
	podman exec -it $(CONTAINER_NAME) /bin/sh

logs:
	@echo "Following container logs (Ctrl+C to exit)..."
	podman logs -f $(CONTAINER_NAME)
