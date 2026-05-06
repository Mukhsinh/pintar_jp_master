# Production Startup Script for JASPEL KPI System
# This script builds and starts the application in production mode

Write-Host "=== JASPEL KPI System - Production Startup ===" -ForegroundColor Green
Write-Host "Starting production build and server..." -ForegroundColor Yellow

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local file not found. Please create it with required environment variables." -ForegroundColor Red
    exit 1
}

Write-Host "`n--- Step 1: Installing dependencies ---" -ForegroundColor Yellow
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to install dependencies: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n--- Step 2: Building application ---" -ForegroundColor Yellow
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Build failed: $_" -ForegroundColor Red
    Write-Host "Please check the build output above for errors." -ForegroundColor Red
    exit 1
}

Write-Host "`n--- Step 3: Starting production server ---" -ForegroundColor Yellow
Write-Host "Server will start on http://localhost:3002" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

try {
    npm run start
} catch {
    Write-Host "ERROR: Failed to start server: $_" -ForegroundColor Red
    exit 1
}