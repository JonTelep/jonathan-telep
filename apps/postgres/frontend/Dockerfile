# Frontend Dockerfile for PostgreSQL DDL Visualizer
# Stage 1: Build the application
FROM docker.io/library/node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with nginx
FROM docker.io/library/nginx:alpine

# Copy built assets from builder stage
RUN mkdir -p /usr/share/nginx/html/postgres-visualizer
COPY --from=builder /app/dist /usr/share/nginx/html/postgres-visualizer

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3005
EXPOSE 3005

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
