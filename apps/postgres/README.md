# PostgreSQL DDL Visualizer

A full-stack application that parses PostgreSQL DDL statements and generates interactive ER diagrams in real-time. Write or paste your database schema, and instantly visualize table relationships, constraints, and column details.

## Overview

This project consists of two main components:

- **Backend**: FastAPI service that parses PostgreSQL DDL using `pglast` and returns structured schema data
- **Frontend**: React + TypeScript web application with Monaco editor and ReactFlow diagram visualization

## Features

- Real-time DDL parsing and validation
- Interactive ER diagram generation with auto-layout
- SQL syntax highlighting with Monaco Editor
- Support for all PostgreSQL constraint types (PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK)
- Dark mode support
- Export diagrams as PNG, SVG, or DDL
- Auto-save to localStorage
- Detailed error reporting with line/column positions

## Quick Start

### Prerequisites

**Recommended (Docker/Podman)**:
- Docker 20.10+ and Docker Compose 2.0+, OR
- Podman 4.0+ and podman-compose

**Alternative (Local Development)**:
- Python 3.11+ (for backend)
- Node.js 18+ and npm (for frontend)

### Option 1: Docker Compose (Recommended)

The fastest way to run the application is using Docker Compose:

```bash
# Using Docker
docker-compose up --build

# Using Podman
podman-compose up --build

# Or use the Makefile (see below)
make up
```

The application will be available at:
- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:6005/api
- **API Docs**: http://localhost:6005/docs

See [DOCKER.md](./DOCKER.md) for detailed Docker deployment instructions.

### Option 2: Using Makefile

We provide a Makefile with convenient commands for both Docker and Podman:

```bash
# Start all services
make up

# Stop all services
make down

# View logs
make logs

# Rebuild and start
make rebuild

# See all available commands
make help
```

### Option 3: Local Development

For development with hot-reload:

#### 1. Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend API will be available at `http://localhost:8000`

#### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

**Note**: For local development, update `frontend/.env` to use `http://localhost:8000/api`

### Using the Application

1. Open your browser to the frontend URL (http://localhost:3005 for Docker, http://localhost:5173 for local)
2. Click "Load Example" to see sample DDL, or write your own
3. Watch the ER diagram update automatically as you type
4. Interact with the diagram (zoom, pan, select tables)
5. Export your diagram or DDL as needed

## Technology Stack

### Backend
- **Python 3.11+** - Core language
- **FastAPI** - Modern async web framework
- **pglast** - PostgreSQL parser (wraps libpg_query)
- **Pydantic** - Data validation
- **uvicorn** - ASGI server

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **ReactFlow** - Interactive diagrams
- **Monaco Editor** - VSCode-powered SQL editor
- **TailwindCSS** - Styling
- **Dagre** - Graph auto-layout algorithm

## Project Structure

```
visualize-postgres/
├── backend/              # FastAPI backend service
│   ├── main.py          # API endpoints
│   ├── parser.py        # DDL parsing logic
│   ├── models.py        # Data models
│   ├── tests/           # Test suite
│   ├── Dockerfile       # Backend container config
│   ├── .dockerignore    # Docker ignore patterns
│   └── README.md        # Backend documentation
│
├── frontend/            # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── utils/       # API, layout, export utilities
│   │   └── types/       # TypeScript interfaces
│   ├── Dockerfile       # Frontend container config
│   ├── nginx.conf       # Nginx configuration
│   ├── .dockerignore    # Docker ignore patterns
│   ├── package.json
│   └── README.md        # Frontend documentation
│
├── docker-compose.yaml   # Container orchestration
├── Makefile             # Build automation (Docker/Podman)
├── DOCKER.md            # Docker deployment guide
└── README.md            # This file
```

## Example DDL

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

The backend exposes the following API endpoints:

- `POST /api/parse` - Parse DDL and return structured schema
- `GET /api/health` - Health check endpoint

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Makefile Commands

A comprehensive Makefile is provided with support for both Docker and Podman:

```bash
# View all available commands
make help

# Quick start/stop
make up              # Start all services
make down            # Stop all services
make restart         # Restart all services

# Building
make build           # Build without starting
make rebuild         # Rebuild and restart
make up-build        # Build and start

# Logs
make logs            # All service logs
make logs-backend    # Backend logs only
make logs-frontend   # Frontend logs only

# Individual services
make backend         # Start backend only
make frontend        # Start frontend only
make backend-build   # Build backend only
make frontend-build  # Build frontend only

# Utilities
make health          # Check service health
make ps              # Show service status
make clean           # Remove containers and volumes
make dev-setup       # Setup local development (non-container)
```

The Makefile automatically detects whether you have Podman or Docker installed and uses the appropriate commands.

### Running Tests

Backend tests:
```bash
# With Makefile
make test-backend

# Or directly
cd backend
pytest tests/test_parser.py -v
```

### Code Style

The project follows standard best practices:
- Python: Type hints, docstrings, PEP 8
- TypeScript: Strict mode, ESLint configuration
- Clear separation of concerns

## Performance

- DDL parsing: < 100ms for typical schemas (20-50 tables)
- Diagram rendering: < 500ms for 50-table schemas
- Editor responsiveness: < 16ms per keystroke
- Auto-parse debounce: 500ms after typing stops

## Troubleshooting

### Backend Won't Start

Ensure Python 3.11+ is installed and dependencies are installed:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend Can't Connect to Backend

1. Verify backend is running: `http://localhost:8000/api/health`
2. Check CORS configuration in `backend/main.py`
3. Ensure `.env` file has correct backend URL (if using custom URL)

### pglast Installation Issues

If you encounter build errors, install build dependencies:

**Ubuntu/Debian:**
```bash
sudo apt-get install build-essential python3-dev
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
Install Microsoft Visual C++ Build Tools

## Documentation

For detailed documentation on each component:

- [Backend README](./backend/README.md) - API details, parser logic, testing
- [Frontend README](./frontend/README.md) - Component structure, usage, export options

## License

This project is open source.

## Contributing

1. Write tests for new features
2. Ensure all tests pass
3. Follow existing code style
4. Update relevant README files
