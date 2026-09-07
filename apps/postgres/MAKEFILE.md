# Makefile Reference Guide

This Makefile provides convenient commands for managing the PostgreSQL DDL Visualizer with both Docker and Podman.

## Auto-Detection

The Makefile automatically detects your container runtime:
- If `podman` is available, it uses `podman-compose`
- Otherwise, it falls back to `docker-compose`

Check which runtime is being used:
```bash
make help
```

## Quick Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make up` | Start all services in detached mode |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make logs` | View logs from all services (follow mode) |

### Building

| Command | Description |
|---------|-------------|
| `make build` | Build all services without starting them |
| `make up-build` | Build and start all services |
| `make rebuild` | Rebuild and force-recreate all services |

### Individual Services

| Command | Description |
|---------|-------------|
| `make backend` | Start only the backend service |
| `make frontend` | Start only the frontend service |
| `make backend-build` | Build only the backend |
| `make frontend-build` | Build only the frontend |
| `make backend-restart` | Restart only the backend |
| `make frontend-restart` | Restart only the frontend |

### Logs

| Command | Description |
|---------|-------------|
| `make logs` | Follow logs from all services |
| `make logs-backend` | Follow backend logs only |
| `make logs-frontend` | Follow frontend logs only |
| `make backend-logs` | Alias for `logs-backend` |
| `make frontend-logs` | Alias for `logs-frontend` |

### Debugging

| Command | Description |
|---------|-------------|
| `make ps` | Show status of all services |
| `make health` | Check health of all services |
| `make backend-shell` | Open bash shell in backend container |
| `make frontend-shell` | Open sh shell in frontend container |

### Cleanup

| Command | Description |
|---------|-------------|
| `make clean` | Stop and remove containers, networks, volumes |
| `make clean-all` | Remove everything including images |

### Development

| Command | Description |
|---------|-------------|
| `make dev-setup` | Setup local development environment (venv + npm) |
| `make test-backend` | Run backend tests |

### Runtime-Specific

| Command | Description |
|---------|-------------|
| `make podman-info` | Show Podman system information (Podman only) |
| `make docker-info` | Show Docker system information (Docker only) |

### Aliases

Common aliases for convenience:

| Alias | Actual Command |
|-------|----------------|
| `make start` | `make up` |
| `make stop` | `make down` |
| `make log` | `make logs` |

## Common Workflows

### First Time Setup
```bash
# Build and start everything
make up-build

# Check that services are running
make ps

# Check health
make health

# View logs
make logs
```

### Daily Development with Containers
```bash
# Start services
make up

# View logs in real-time
make logs

# Restart after changes
make rebuild

# Stop when done
make down
```

### Debugging Issues
```bash
# Check service status
make ps

# Check health endpoints
make health

# View backend logs
make logs-backend

# Open shell in backend container
make backend-shell

# Restart specific service
make backend-restart
```

### Local Development (No Containers)
```bash
# One-time setup
make dev-setup

# Then manually:
# Terminal 1: cd backend && source venv/bin/activate && uvicorn main:app --reload
# Terminal 2: cd frontend && npm run dev
```

### Cleanup
```bash
# Remove containers and volumes
make clean

# Complete cleanup including images
make clean-all
```

## Service URLs

When services are running:
- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:6005/api
- **API Documentation**: http://localhost:6005/docs
- **Health Check**: http://localhost:6005/api/health

## Switching Between Docker and Podman

The Makefile automatically uses whichever runtime is available:

**To force Docker:**
```bash
# Temporarily override
CONTAINER_RUNTIME= make up
```

**To force Podman:**
```bash
# Ensure podman is in PATH
which podman
make up
```

## Troubleshooting

### "Command not found: podman-compose" or "docker-compose"

**For Podman:**
```bash
# Install podman-compose
pip install podman-compose
```

**For Docker:**
```bash
# Install docker-compose
# On Linux:
sudo apt-get install docker-compose

# On macOS with Homebrew:
brew install docker-compose
```

### Services Won't Start

```bash
# Check status
make ps

# View logs for errors
make logs

# Try rebuilding
make rebuild

# Check if ports are in use
lsof -i :3005
lsof -i :6005
```

### Permission Denied (Podman)

```bash
# Ensure podman socket is running (rootless mode)
systemctl --user start podman.socket

# Or use rootful mode
sudo make up
```

## Tips

1. **Colored output**: The Makefile uses colored output to make it easier to read
2. **Always use make help**: If you forget a command, `make help` shows everything
3. **Tab completion**: Most shells support tab completion for make targets
4. **Parallel builds**: Use `-j` flag for parallel builds: `make -j4 build`
5. **Quiet mode**: Use `-s` flag to suppress command echoing: `make -s up`

## Environment Variables

You can override environment variables:

```bash
# Use different ports (modify docker-compose.yaml)
make up

# Set Python to unbuffered mode (already default)
make up
```

## Integration with CI/CD

Use in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Build and test
  run: |
    make build
    make up -d
    make test-backend
    make down
```

## Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Podman Compose Documentation](https://github.com/containers/podman-compose)
- [GNU Make Manual](https://www.gnu.org/software/make/manual/)
