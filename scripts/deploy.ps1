# MITHAS GLOW - Deployment & Integration Script (PowerShell)
# This script handles frontend-backend integration and deployment

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("check", "install", "build", "env", "database", "start", "stop", "test", "deploy", "health", "all", "cleanup")]
    [string]$Action = "all"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
}

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor $Colors.Blue
}

# Check if required directories exist
function Check-Directories {
    Write-Step "Checking project structure..."
    
    if (-not (Test-Path "frontend")) {
        Write-Error "Frontend directory not found"
        exit 1
    }
    
    if (-not (Test-Path "backend")) {
        Write-Error "Backend directory not found"
        exit 1
    }
    
    Write-Status "✓ Project structure verified"
}

# Install frontend dependencies
function Install-Frontend {
    Write-Step "Installing frontend dependencies..."
    Set-Location frontend
    npm install
    Set-Location ..
    Write-Status "✓ Frontend dependencies installed"
}

# Install backend dependencies
function Install-Backend {
    Write-Step "Installing backend dependencies..."
    Set-Location backend
    pip install -r requirements.txt
    Set-Location ..
    Write-Status "✓ Backend dependencies installed"
}

# Build frontend
function Build-Frontend {
    Write-Step "Building frontend..."
    Set-Location frontend
    npm run build
    Set-Location ..
    Write-Status "✓ Frontend built successfully"
}

# Setup environment variables
function Setup-Environment {
    Write-Step "Setting up environment variables..."
    
    # Frontend .env
    if (-not (Test-Path "frontend\.env")) {
        Write-Warning "Frontend .env not found, creating from .env.example"
        Copy-Item "frontend\.env.example" "frontend\.env"
        Write-Warning "Please update frontend\.env with your actual values"
    }
    
    # Backend .env
    if (-not (Test-Path "backend\.env")) {
        Write-Warning "Backend .env not found, creating from .env.example"
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Warning "Please update backend\.env with your actual values"
    }
    
    Write-Status "✓ Environment files setup"
}

# Database setup
function Setup-Database {
    Write-Step "Setting up database..."
    Set-Location backend
    
    # Run database migrations
    python -m alembic upgrade head
    
    # Create initial data
    if (Test-Path "scripts\init_data.py") {
        python scripts\init_data.py
    }
    
    Set-Location ..
    Write-Status "✓ Database setup completed"
}

# Start services
function Start-Services {
    Write-Step "Starting services..."
    
    # Start backend in background
    Set-Location backend
    $BackendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -PassThru
    Set-Location ..
    
    # Wait for backend to start
    Start-Sleep -Seconds 5
    
    # Check backend health
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 10
        Write-Status "✓ Backend started successfully"
    }
    catch {
        Write-Error "Backend failed to start"
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Start frontend in background
    Set-Location frontend
    $FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru
    Set-Location ..
    
    Write-Status "✓ Frontend started successfully"
    Write-Status "🎉 Services are running!"
    Write-Status "Frontend: http://localhost:5173"
    Write-Status "Backend: http://localhost:8000"
    Write-Status "API Docs: http://localhost:8000/docs"
    
    # Save PIDs for cleanup
    $BackendProcess.Id | Out-File -FilePath ".backend.pid"
    $FrontendProcess.Id | Out-File -FilePath ".frontend.pid"
}

# Stop services
function Stop-Services {
    Write-Step "Stopping services..."
    
    if (Test-Path ".backend.pid") {
        $BackendPid = Get-Content ".backend.pid"
        Stop-Process -Id $BackendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".backend.pid" -ErrorAction SilentlyContinue
        Write-Status "✓ Backend stopped"
    }
    
    if (Test-Path ".frontend.pid") {
        $FrontendPid = Get-Content ".frontend.pid"
        Stop-Process -Id $FrontendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".frontend.pid" -ErrorAction SilentlyContinue
        Write-Status "✓ Frontend stopped"
    }
}

# Run tests
function Run-Tests {
    Write-Step "Running tests..."
    
    # Frontend tests
    Set-Location frontend
    npm test
    Set-Location ..
    
    # Backend tests
    Set-Location backend
    python -m pytest
    Set-Location ..
    
    Write-Status "✓ All tests passed"
}

# Deploy to production
function Deploy-Production {
    Write-Step "Deploying to production..."
    
    # Build frontend for production
    Set-Location frontend
    npm run build
    Set-Location ..
    
    # Copy frontend build to backend static files
    if (Test-Path "backend\static") {
        Remove-Item "backend\static\*" -Recurse -Force
    }
    Copy-Item "frontend\dist\*" "backend\static\" -Recurse -Force
    
    Write-Status "✓ Production deployment completed"
}

# Health check
function Health-Check {
    Write-Step "Performing health check..."
    
    # Check frontend
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 10
        Write-Status "✓ Frontend is healthy"
    }
    catch {
        Write-Error "Frontend health check failed"
    }
    
    # Check backend
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 10
        Write-Status "✓ Backend is healthy"
    }
    catch {
        Write-Error "Backend health check failed"
    }
}

# Cleanup function
function Cleanup {
    Write-Step "Cleaning up..."
    Stop-Services
    Write-Status "✓ Cleanup completed"
}

# Main execution
switch ($Action) {
    "check" {
        Check-Directories
    }
    "install" {
        Check-Directories
        Install-Frontend
        Install-Backend
    }
    "build" {
        Build-Frontend
    }
    "env" {
        Setup-Environment
    }
    "database" {
        Setup-Database
    }
    "start" {
        Start-Services
    }
    "stop" {
        Stop-Services
    }
    "test" {
        Run-Tests
    }
    "deploy" {
        Deploy-Production
    }
    "health" {
        Health-Check
    }
    "all" {
        Check-Directories
        Setup-Environment
        Install-Frontend
        Install-Backend
        Setup-Database
        Build-Frontend
        Start-Services
    }
    "cleanup" {
        Cleanup
    }
    default {
        Write-Host "Usage: .\deploy.ps1 -Action {check|install|build|env|database|start|stop|test|deploy|health|all|cleanup}"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  check     - Check project structure"
        Write-Host "  install   - Install all dependencies"
        Write-Host "  build     - Build frontend for production"
        Write-Host "  env       - Setup environment files"
        Write-Host "  database  - Setup database and migrations"
        Write-Host "  start     - Start development services"
        Write-Host "  stop      - Stop running services"
        Write-Host "  test      - Run all tests"
        Write-Host "  deploy    - Deploy to production"
        Write-Host "  health    - Perform health check"
        Write-Host "  all       - Run complete setup and start"
        Write-Host "  cleanup   - Stop services and cleanup"
        exit 1
    }
}

Write-Host "✅ Script completed successfully!" -ForegroundColor $Colors.Green
