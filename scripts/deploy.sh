#!/bin/bash
set -e

echo "=== Brothers Farm Deploy Script ==="
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Copying from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit .env and set your configuration."
    echo ""
fi

echo "Pulling latest code..."
git pull origin main

echo ""
echo "Building Docker image..."
$DOCKER_COMPOSE build

echo ""
echo "Starting container..."
$DOCKER_COMPOSE up -d

echo ""
echo "Waiting for server to start..."
sleep 3

echo ""
echo "Checking server health..."
if curl -s http://localhost:3232/api/health > /dev/null; then
    echo "✅ Server is running!"
else
    echo "⚠️  Server might still be starting..."
fi

echo ""
echo "=== Deploy Complete ==="
echo "App running at: http://localhost:3232"
echo ""
echo "Useful commands:"
echo "  View logs:   $DOCKER_COMPOSE logs -f"
echo "  Stop:        $DOCKER_COMPOSE down"
echo "  Restart:     $DOCKER_COMPOSE restart"
echo "  Status:      docker ps"
