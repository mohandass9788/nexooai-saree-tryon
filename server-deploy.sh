#!/usr/bin/env bash
# ==============================================================================
# NeXooAi Virtual Saree Try-On — Live Server Pull & Run Script
# (Uses pre-built GHCR Docker Images — NO building on the server)
# ==============================================================================

set -e

echo "======================================================================"
echo "  NeXooAi Server Deployment (Pull Pre-built GHCR Images)"
echo "======================================================================"

COMPOSE_FILE="docker-compose.prod.yml"

# 1. Check Docker & Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed on this server."
    echo "Run: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Docker Compose is not installed."
    exit 1
fi

# 2. Prepare .env
if [ ! -f .env ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env
    RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 40)
    sed -i "s/replace-this-with-a-secure-random-secret-key-in-production/${RANDOM_SECRET}/g" .env
    echo "🔑 Generated random SECRET_KEY in .env"
fi

mkdir -p media

# 3. Pull latest pre-built images from GitHub Container Registry
echo "⬇️ Pulling latest pre-built Docker images from GHCR..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE pull

# 4. Start all 3 containers: PostgreSQL + Backend + Frontend
echo "🚀 Starting containers (PostgreSQL, Backend, Frontend)..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE up -d

echo "⏳ Waiting 6 seconds for database to initialize..."
sleep 6

# 5. Run Database Initializer (Tables & Master Admin Seeding)
echo "🗄️ Initializing Database schema and default seeds..."
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE exec -T backend python -m backend.app.db.init_db || true

echo ""
echo "📊 Current Container Status:"
$DOCKER_COMPOSE_CMD -f $COMPOSE_FILE ps

echo ""
echo "======================================================================"
echo "  ✅ NeXooAi Live Deployment Successful!"
echo "  Frontend / Kiosk:     http://<your-server-ip>/"
echo "  Backend API:          http://<your-server-ip>/api/v1/health"
echo "======================================================================"
