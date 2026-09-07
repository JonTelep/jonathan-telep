# Docker Deployment Guide

This guide explains how to deploy the PostgreSQL DDL Visualizer using Docker and Docker Compose.

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Build and Run

From the root directory of the project, run:

```bash
docker-compose up --build
```

This will:
1. Build the backend service (FastAPI + pglast)
2. Build the frontend service (React + Vite + nginx)
3. Start both services with proper networking
4. Expose the application on the configured ports

### Access the Application

- **Frontend**: http://localhost:3005
- **Backend API**: http://localhost:6005
- **API Documentation**: http://localhost:6005/docs
- **Health Check**: http://localhost:6005/api/health

## Port Configuration

### Default Ports

- **Frontend**: Port 3005 (nginx serving static React app)
- **Backend**: Port 6005 (FastAPI uvicorn server)

### Changing Ports

To change the exposed ports, edit the `docker-compose.yaml` file:

```yaml
services:
  backend:
    ports:
      - "YOUR_BACKEND_PORT:6005"  # Change YOUR_BACKEND_PORT

  frontend:
    ports:
      - "YOUR_FRONTEND_PORT:3005"  # Change YOUR_FRONTEND_PORT
```

**Important**: If you change the backend port, also update:
1. `frontend/.env` - Set `VITE_API_BASE_URL` to the new backend URL
2. Rebuild the frontend: `docker-compose up --build frontend`

## Docker Compose Commands

### Start Services (Detached Mode)
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Rebuild Services
```bash
# Rebuild all
docker-compose up --build

# Rebuild specific service
docker-compose up --build backend
docker-compose up --build frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

## Architecture

### Backend Container

- **Base Image**: `python:3.11-slim`
- **Framework**: FastAPI with uvicorn
- **Port**: 6005
- **Health Check**: Enabled (checks `/api/health` endpoint)
- **Build Dependencies**: Includes build-essential for pglast compilation

### Frontend Container

- **Build Stage**: `node:18-alpine` (builds Vite app)
- **Runtime Stage**: `nginx:alpine` (serves static files)
- **Port**: 3005
- **Configuration**: Custom nginx.conf with SPA routing support
- **Dependencies**: Frontend waits for backend health check

### Networking

- Both services run on a custom bridge network (`app-network`)
- Services can communicate using service names (`backend`, `frontend`)
- Health checks ensure frontend starts only after backend is ready

## Deployment on Coolify

Coolify will automatically detect and use the `docker-compose.yaml` file.

### Steps:

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. In Coolify, create a new application
3. Select your repository
4. Coolify will detect `docker-compose.yaml` automatically
5. Configure environment variables if needed
6. Deploy

### Environment Variables (Optional)

You can set these in Coolify's environment settings:

**Backend**:
- `PYTHONUNBUFFERED=1` (already set in docker-compose.yaml)

**Frontend**:
- `VITE_API_BASE_URL` - Backend API URL (defaults to http://localhost:6005/api)

### Port Mapping in Coolify

Coolify may handle port mapping differently. If deploying to Coolify:

1. The internal container ports remain 3005 and 6005
2. Coolify will map these to external ports based on your configuration
3. Update `VITE_API_BASE_URL` in the frontend environment to match your backend URL

## Production Considerations

### Security

1. **CORS Configuration**: Update `backend/main.py` to include your production domain:
   ```python
   allow_origins=[
       "https://yourdomain.com",
       "http://localhost:3005",
   ]
   ```

2. **Environment Variables**: Use Docker secrets or Coolify's secure environment variables for sensitive data

### Performance

1. **nginx Caching**: Static assets are cached for 1 year
2. **Gzip Compression**: Enabled in nginx for better performance
3. **Health Checks**: Ensure backend is ready before frontend starts

### Monitoring

View real-time logs:
```bash
# Combined logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

Check container status:
```bash
docker-compose ps
```

## Troubleshooting

### Backend Won't Start

1. Check logs: `docker-compose logs backend`
2. Verify Python dependencies are installing correctly
3. Ensure port 6005 is not already in use: `lsof -i :6005`

### Frontend Can't Connect to Backend

1. Verify backend is healthy: `curl http://localhost:6005/api/health`
2. Check CORS configuration in `backend/main.py`
3. Verify `VITE_API_BASE_URL` in frontend/.env matches backend URL
4. Check browser console for CORS errors

### Build Failures

**Backend pglast compilation errors**:
- The Dockerfile includes build-essential and python3-dev
- If issues persist, check Docker logs for specific compiler errors

**Frontend build errors**:
- Clear node_modules: `docker-compose build --no-cache frontend`
- Check package.json for dependency conflicts

### Port Already in Use

If ports 3005 or 6005 are in use:

```bash
# Find process using port
lsof -i :3005
lsof -i :6005

# Kill process or change ports in docker-compose.yaml
```

## Local Development vs Docker

### Local Development (Recommended for development)
- Backend: `cd backend && uvicorn main:app --reload` (port 8000)
- Frontend: `cd frontend && npm run dev` (port 5173)
- Fast hot-reload and debugging

### Docker (Recommended for production/deployment)
- Consistent environment
- Easy deployment to Coolify or other platforms
- Production-optimized builds

## Cleanup

Remove all containers, networks, and volumes:
```bash
docker-compose down -v
```

Remove built images:
```bash
docker-compose down --rmi all
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Coolify Documentation](https://coolify.io/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vite Production Build](https://vitejs.dev/guide/build.html)
