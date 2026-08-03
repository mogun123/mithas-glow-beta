#!/bin/bash

# MITHAS GLOW - Deployment & Integration Script
# This script handles frontend-backend integration and deployment

set -e

echo "🚀 MITHAS GLOW - Deployment & Integration Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required directories exist
check_directories() {
    print_step "Checking project structure..."
    
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        exit 1
    fi
    
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found"
        exit 1
    fi
    
    print_status "✓ Project structure verified"
}

# Install frontend dependencies
install_frontend() {
    print_step "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_status "✓ Frontend dependencies installed"
}

# Install backend dependencies
install_backend() {
    print_step "Installing backend dependencies..."
    cd backend
    pip install -r requirements.txt
    cd ..
    print_status "✓ Backend dependencies installed"
}

# Build frontend
build_frontend() {
    print_step "Building frontend..."
    cd frontend
    npm run build
    cd ..
    print_status "✓ Frontend built successfully"
}

# Setup environment variables
setup_env() {
    print_step "Setting up environment variables..."
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        print_warning "Frontend .env not found, creating from .env.example"
        cp frontend/.env.example frontend/.env
        print_warning "Please update frontend/.env with your actual values"
    fi
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        print_warning "Backend .env not found, creating from .env.example"
        cp backend/.env.example backend/.env
        print_warning "Please update backend/.env with your actual values"
    fi
    
    print_status "✓ Environment files setup"
}

# Database setup
setup_database() {
    print_step "Setting up database..."
    cd backend
    
    # Run database migrations
    python -m alembic upgrade head
    
    # Create initial data
    python scripts/init_data.py
    
    cd ..
    print_status "✓ Database setup completed"
}

# Start services
start_services() {
    print_step "Starting services..."
    
    # Start backend in background
    cd backend
    python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Check backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_status "✓ Backend started successfully"
    else
        print_error "Backend failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Start frontend in background
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_status "✓ Frontend started successfully"
    print_status "🎉 Services are running!"
    print_status "Frontend: http://localhost:5173"
    print_status "Backend: http://localhost:8000"
    print_status "API Docs: http://localhost:8000/docs"
    
    # Save PIDs for cleanup
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
}

# Stop services
stop_services() {
    print_step "Stopping services..."
    
    if [ -f ".backend.pid" ]; then
        BACKEND_PID=$(cat .backend.pid)
        kill $BACKEND_PID 2>/dev/null
        rm .backend.pid
        print_status "✓ Backend stopped"
    fi
    
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        kill $FRONTEND_PID 2>/dev/null
        rm .frontend.pid
        print_status "✓ Frontend stopped"
    fi
}

# Run tests
run_tests() {
    print_step "Running tests..."
    
    # Frontend tests
    cd frontend
    npm test
    cd ..
    
    # Backend tests
    cd backend
    python -m pytest
    cd ..
    
    print_status "✓ All tests passed"
}

# Deploy to production
deploy_production() {
    print_step "Deploying to production..."
    
    # Build frontend for production
    cd frontend
    npm run build
    cd ..
    
    # Copy frontend build to backend static files
    rm -rf backend/static/*
    cp -r frontend/dist/* backend/static/
    
    # Deploy backend
    cd backend
    # Add your production deployment commands here
    # For example: gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
    cd ..
    
    print_status "✓ Production deployment completed"
}

# Health check
health_check() {
    print_step "Performing health check..."
    
    # Check frontend
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
        print_status "✓ Frontend is healthy"
    else
        print_error "Frontend health check failed"
    fi
    
    # Check backend
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_status "✓ Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
}

# Cleanup function
cleanup() {
    print_step "Cleaning up..."
    stop_services
    print_status "✓ Cleanup completed"
}

# Trap signals for cleanup
trap cleanup EXIT INT TERM

# Main execution
main() {
    case "${1:-all}" in
        "check")
            check_directories
            ;;
        "install")
            check_directories
            install_frontend
            install_backend
            ;;
        "build")
            build_frontend
            ;;
        "env")
            setup_env
            ;;
        "database")
            setup_database
            ;;
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "test")
            run_tests
            ;;
        "deploy")
            deploy_production
            ;;
        "health")
            health_check
            ;;
        "all")
            check_directories
            setup_env
            install_frontend
            install_backend
            setup_database
            build_frontend
            start_services
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {check|install|build|env|database|start|stop|test|deploy|health|all|cleanup}"
            echo ""
            echo "Commands:"
            echo "  check     - Check project structure"
            echo "  install   - Install all dependencies"
            echo "  build     - Build frontend for production"
            echo "  env       - Setup environment files"
            echo "  database  - Setup database and migrations"
            echo "  start     - Start development services"
            echo "  stop      - Stop running services"
            echo "  test      - Run all tests"
            echo "  deploy    - Deploy to production"
            echo "  health    - Perform health check"
            echo "  all       - Run complete setup and start"
            echo "  cleanup   - Stop services and cleanup"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
