#!/bin/bash

# MITHAS GLOW Backend Deployment Script
# Production deployment for FastAPI backend

set -e

echo "🚀 Starting MITHAS GLOW Backend Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo "📦 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo "🗄️ Starting database and services..."
docker-compose -f docker-compose.prod.yml up -d db redis meilisearch

echo "⏳ Waiting for database to be ready..."
sleep 30

echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec api python -m alembic upgrade head

echo "🌐 Starting API server..."
docker-compose -f docker-compose.prod.yml up -d api

echo "🔍 Checking service health..."
sleep 10

# Health check
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ API server is healthy!"
else
    echo "❌ API server health check failed!"
    docker-compose -f docker-compose.prod.yml logs api
    exit 1
fi

echo "🔍 Checking database connection..."
if docker-compose -f docker-compose.prod.yml exec -T api python -c "from app.database import engine; engine.connect()" > /dev/null 2>&1; then
    echo "✅ Database connection is healthy!"
else
    echo "❌ Database connection failed!"
    docker-compose -f docker-compose.prod.yml logs db
    exit 1
fi

echo "🔍 Checking Redis connection..."
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis connection is healthy!"
else
    echo "❌ Redis connection failed!"
    docker-compose -f docker-compose.prod.yml logs redis
    exit 1
fi

echo "🔍 Checking Meilisearch connection..."
if curl -f http://localhost:7700/health > /dev/null 2>&1; then
    echo "✅ Meilisearch connection is healthy!"
else
    echo "❌ Meilisearch connection failed!"
    docker-compose -f docker-compose.prod.yml logs meilisearch
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "📍 API Endpoint: http://localhost:8000"
echo "📍 Health Check: http://localhost:8000/health"
echo "📍 API Docs: http://localhost:8000/docs"
echo "📍 Database: localhost:5432"
echo "📍 Redis: localhost:6379"
echo "📍 Meilisearch: localhost:7700"

echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo "🔧 To view logs: docker-compose -f docker-compose.prod.yml logs -f [service-name]"
echo "🛑 To stop: docker-compose -f docker-compose.prod.yml down"
echo "🔄 To restart: docker-compose -f docker-compose.prod.yml restart"
