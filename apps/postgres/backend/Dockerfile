# Backend Dockerfile for PostgreSQL DDL Visualizer
FROM docker.io/library/python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for pglast
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port 6005
EXPOSE 6005

# Run the application on port 6005
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6005"]
