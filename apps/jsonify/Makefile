IMAGE := jsonify
CONTAINER := jsonify
PORT := 3006

.PHONY: build run stop clean logs help

build: ## Build the container image
	podman build -t $(IMAGE) .

run: build ## Build and run the container
	podman run -d --name $(CONTAINER) -p $(PORT):$(PORT) $(IMAGE)
	@echo "Running at http://localhost:$(PORT)"

stop: ## Stop the container
	-podman stop $(CONTAINER)
	-podman rm $(CONTAINER)

clean: stop ## Stop container and remove image
	-podman rmi $(IMAGE)

logs: ## Show container logs
	podman logs -f $(CONTAINER)

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'
