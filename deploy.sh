#!/usr/bin/env bash
# ==============================================================================
# NeXooAi Virtual Saree Try-On — Production Server Deployment Script
# Orchestrates 3 Containers: PostgreSQL + FastAPI Backend + Angular Frontend
# ==============================================================================

set -e

echo "============================================================"
echo "  NeXooAi Server Deployment (PostgreSQL + Backend + Frontend)"
echo "============================================================"

# 1. Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed on this server."
    echo "Please install Docker first: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 2. Check Docker Compose
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Docker Compose is not installed."
    echo "Please install docker compose plugin or docker-compose."
    exit 1
fi

echo "✅ Docker detected: $(docker --version)"
echo "✅ Compose detected: $($DOCKER_COMPOSE_CMD version)"

# 3. Create .env if not exists
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env
    
    # Generate random secret key
    RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 40)
    sed -i "s/replace-this-with-a-secure-random-secret-key-in-production/${RANDOM_SECRET}/g" .env
    echo "🔑 Generated random SECRET_KEY in .env"
fi

# Ensure media directory exists
mkdir -p media

# 4. Build and start containers
echo "🚀 Building and starting containers (PostgreSQL, Backend, Frontend)..."
$DOCKER_COMPOSE_CMD up -d --build

echo ""
echo "⏳ Waiting for PostgreSQL and Backend to be healthy..."
sleep 5

# 5. Display container status
echo ""
echo "📊 Container Status:"
$DOCKER_COMPOSE_CMD ps

echo ""
echo "============================================================"
echo "  NeXooAi Deployment Complete! 🎉"
echo "  Frontend (Kiosk UI):   http://<your-server-ip>/"
echo "  Backend API:          http://<your-server-ip>:8000/"
echo "  API Documentation:    http://<your-server-ip>:8000/docs"
echo "============================================================"
