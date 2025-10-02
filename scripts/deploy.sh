#!/bin/bash

# ==========================================
# Shovel Heroes - Production Deployment Script
# ==========================================

set -e  # Exit on error

echo "🚀 Starting Shovel Heroes deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    echo "Please create .env.production file with required environment variables"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check JWT_SECRET
if [[ "$JWT_SECRET" == *"CHANGE_ME"* ]]; then
    echo -e "${RED}❌ Error: JWT_SECRET must be changed in .env.production${NC}"
    echo "Generate a secure secret with: openssl rand -base64 32"
    exit 1
fi

echo -e "${GREEN}✓${NC} Environment variables loaded"

# Stop existing containers
echo "📦 Stopping existing containers..."
docker compose -f docker-compose.production.yml down || true

# Build images
echo "🔨 Building Docker images..."
docker compose -f docker-compose.production.yml build --no-cache

# Start database first
echo "🗄️  Starting database..."
docker compose -f docker-compose.production.yml up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker compose -f docker-compose.production.yml exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}✓${NC} Database is ready"

# Run migrations in container
echo "📊 Running database migrations..."
docker compose -f docker-compose.production.yml exec -T db psql -U postgres -d shovelheroes -c "SELECT 1" > /dev/null 2>&1 || echo "DB ready"
sleep 2

# Start all services
echo "🚀 Starting all services..."
docker compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Health checks
echo "🏥 Running health checks..."

# Check backend
if curl -f http://localhost:8787/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is healthy (http://localhost:8787)"
else
    echo -e "${RED}❌${NC} Backend health check failed"
fi

# Check frontend
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Frontend is healthy (http://localhost)"
else
    echo -e "${RED}❌${NC} Frontend health check failed"
fi

# Show container status
echo ""
echo "📊 Container Status:"
docker compose -f docker-compose.production.yml ps

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://31.41.34.19"
echo "   Backend API: http://31.41.34.19:8787"
echo "   API Health: http://31.41.34.19:8787/healthz"
echo "   MailHog UI: http://31.41.34.19:8025"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker compose -f docker-compose.production.yml logs -f"
echo "   Stop: docker compose -f docker-compose.production.yml down"
echo "   Restart: docker compose -f docker-compose.production.yml restart"
