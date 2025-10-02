# Environment Setup Guide

## Overview

This guide provides detailed instructions for setting up development, staging, and production environments for the Shoe Store API across different operating systems and platforms.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Platform-Specific Instructions](#platform-specific-instructions)
3. [IDE and Tools Configuration](#ide-and-tools-configuration)
4. [Environment Variables Configuration](#environment-variables-configuration)
5. [Database Setup](#database-setup)
6. [External Services Configuration](#external-services-configuration)

## Development Environment Setup

### Prerequisites Checklist

#### Required Software
- [ ] **Node.js 18+** - JavaScript runtime
- [ ] **npm 8+** - Package manager (comes with Node.js)
- [ ] **MongoDB 6.0+** - Database
- [ ] **Redis 7+** - Caching and sessions
- [ ] **Git** - Version control
- [ ] **Code Editor** - VS Code recommended

#### Optional but Recommended
- [ ] **Docker Desktop** - Containerization
- [ ] **Postman** - API testing
- [ ] **MongoDB Compass** - Database GUI
- [ ] **Redis Commander** - Redis GUI

### Quick Setup Script

#### For Unix/Linux/macOS
```bash
#!/bin/bash
# setup.sh - Quick development environment setup

echo "🚀 Setting up Shoe Store API development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

# Clone repository (if not already cloned)
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone <repository-url> .
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file
if [ ! -f ".env" ]; then
    echo "⚙️ Setting up environment variables..."
    cp .env.example .env
    echo "✏️ Please edit .env file with your configuration"
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️ MongoDB is not running. Please start MongoDB service."
fi

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "⚠️ Redis is not running. Please start Redis service."
fi

echo "✅ Setup complete! Run 'npm run dev' to start the development server."
```

#### For Windows (PowerShell)
```powershell
# setup.ps1 - Quick development environment setup for Windows

Write-Host "🚀 Setting up Shoe Store API development environment..." -ForegroundColor Green

# Check if Node.js is installed
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check Node.js version
$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 18) {
    Write-Host "❌ Node.js version 18+ required. Current version: $(node -v)" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Copy environment file
if (!(Test-Path ".env")) {
    Write-Host "⚙️ Setting up environment variables..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✏️ Please edit .env file with your configuration" -ForegroundColor Cyan
}

Write-Host "✅ Setup complete! Run 'npm run dev' to start the development server." -ForegroundColor Green
```

## Platform-Specific Instructions

### Windows Setup

#### 1. Install Node.js
```powershell
# Option 1: Download from nodejs.org
# Go to https://nodejs.org/ and download LTS version

# Option 2: Using Chocolatey
choco install nodejs

# Option 3: Using Winget
winget install OpenJS.NodeJS
```

#### 2. Install MongoDB
```powershell
# Option 1: MongoDB Community Server
# Download from https://www.mongodb.com/try/download/community

# Option 2: Using Chocolatey
choco install mongodb

# Start MongoDB service
net start MongoDB
```

#### 3. Install Redis
```powershell
# Option 1: Download Redis for Windows
# https://github.com/microsoftarchive/redis/releases

# Option 2: Using Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Option 3: Using WSL2 with Ubuntu
wsl --install
# Then follow Linux instructions in WSL
```

#### 4. Configure Windows Environment
```powershell
# Add to PATH if needed
$env:PATH += ";C:\Program Files\nodejs"
$env:PATH += ";C:\Program Files\MongoDB\Server\6.0\bin"

# Set environment variables permanently
[Environment]::SetEnvironmentVariable("NODE_ENV", "development", "User")
```

### macOS Setup

#### 1. Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Install Required Software
```bash
# Install Node.js
brew install node

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@6.0

# Install Redis
brew install redis

# Install Git (if not already installed)
brew install git
```

#### 3. Start Services
```bash
# Start MongoDB
brew services start mongodb/brew/mongodb-community

# Start Redis
brew services start redis

# Or start manually
mongod --config /usr/local/etc/mongod.conf
redis-server /usr/local/etc/redis.conf
```

### Linux (Ubuntu/Debian) Setup

#### 1. Update Package Manager
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Install Node.js
```bash
# Option 1: Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Option 2: Using snap
sudo snap install node --classic

# Verify installation
node --version
npm --version
```

#### 3. Install MongoDB
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### 4. Install Redis
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Change 'supervised no' to 'supervised systemd'

# Restart Redis
sudo systemctl restart redis.service
sudo systemctl enable redis.service
```

### CentOS/RHEL Setup

#### 1. Install Node.js
```bash
# Enable EPEL repository
sudo yum install epel-release

# Install Node.js
sudo yum install nodejs npm

# Or using NodeSource
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs
```

#### 2. Install MongoDB
```bash
# Create MongoDB repository file
sudo tee /etc/yum.repos.d/mongodb-org-6.0.repo << EOF
[mongodb-org-6.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc
EOF

# Install MongoDB
sudo yum install mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

## IDE and Tools Configuration

### Visual Studio Code Setup

#### 1. Install VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "mongodb.mongodb-vscode",
    "humao.rest-client",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker"
  ]
}
```

#### 2. VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.env*": "dotenv"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

#### 3. Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch API Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon"
    }
  ]
}
```

### Git Configuration

#### 1. Global Git Setup
```bash
# Set up user information
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Set up useful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

#### 2. Project-Specific Git Hooks
```bash
# Pre-commit hook to run tests and linting
#!/bin/sh
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Please fix tests before committing."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
```

## Environment Variables Configuration

### Development Environment (.env)
```env
# Application Configuration
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/shoe-ecommerce-dev
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-development-jwt-secret-key
JWT_EXPIRE=7d

# Email Configuration (Development)
EMAIL_PROVIDER=gmail
EMAIL_USER=your-dev-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@localhost
EMAIL_FROM_NAME=Shoe Store Dev

# Payment Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret

# File Upload (Development)
CLOUDINARY_CLOUD_NAME=your-dev-cloud-name
CLOUDINARY_API_KEY=your-dev-api-key
CLOUDINARY_API_SECRET=your-dev-api-secret

# Security Settings
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/development.log

# Feature Flags
ENABLE_SWAGGER=true
ENABLE_CORS=true
ENABLE_RATE_LIMITING=false
```

### Testing Environment (.env.test)
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/shoe-ecommerce-test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret
STRIPE_SECRET_KEY=sk_test_test_key
LOG_LEVEL=error
ENABLE_RATE_LIMITING=false
```

## Database Setup

### MongoDB Configuration

#### 1. Create Database and User
```javascript
// mongo-init.js
use shoe-ecommerce-dev;

db.createUser({
  user: "shoestore",
  pwd: "password123",
  roles: [
    {
      role: "readWrite",
      db: "shoe-ecommerce-dev"
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.products.createIndex({ name: "text", description: "text", brand: "text" });
db.orders.createIndex({ user: 1, createdAt: -1 });
```

#### 2. MongoDB Configuration File
```yaml
# /etc/mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid

security:
  authorization: enabled
```

### Redis Configuration

#### 1. Redis Configuration File
```conf
# /etc/redis/redis.conf
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
save 900 1
save 300 10
save 60 10000
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## External Services Configuration

### Stripe Setup
1. Create account at [stripe.com](https://stripe.com)
2. Get test API keys from dashboard
3. Set up webhook endpoints
4. Configure webhook events

### Cloudinary Setup
1. Create account at [cloudinary.com](https://cloudinary.com)
2. Get API credentials from dashboard
3. Configure upload presets
4. Set up transformation settings

### Email Service Setup
1. **Gmail**: Enable 2FA and create app password
2. **SendGrid**: Create account and get API key
3. **AWS SES**: Set up SES and get credentials

This comprehensive environment setup guide ensures consistent development environments across all platforms and team members.
