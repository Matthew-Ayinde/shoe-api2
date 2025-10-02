# Docker Setup Guide

## Overview

This guide provides step-by-step instructions for setting up the Shoe Store API using Docker containers. Docker simplifies deployment by packaging the application and all its dependencies into portable containers.

## Prerequisites

### Required Software
- **Docker Desktop** - Download from [docker.com](https://www.docker.com/products/docker-desktop)
- **Docker Compose** - Included with Docker Desktop
- **Git** - For cloning the repository

### Verify Installation
```bash
# Check Docker installation
docker --version
docker-compose --version

# Test Docker is running
docker run hello-world
```

## Quick Start with Docker Compose

### 1. Clone the Repository
```bash
git clone <repository-url>
cd shoe-api
```

### 2. Create Environment File
```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file with your settings
# Note: For Docker, use container names for service URLs
```

### 3. Start All Services
```bash
# Start all services in the background
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Initialize the Database
```bash
# Run database migrations/seeds (if any)
docker-compose exec api npm run seed

# Create admin user
docker-compose exec api npm run create-admin
```

### 5. Access the Application
- **API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## Docker Configuration Files

### Dockerfile
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app .
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  # Main API service
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/shoe-ecommerce
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
    networks:
      - shoe-network

  # MongoDB database
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password123
      - MONGO_INITDB_DATABASE=shoe-ecommerce
    volumes:
      - mongodb_data:/data/db
      - ./docker/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped
    networks:
      - shoe-network

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - shoe-network

  # Nginx reverse proxy (optional)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - shoe-network

volumes:
  mongodb_data:
  redis_data:

networks:
  shoe-network:
    driver: bridge
```

### docker-compose.dev.yml (Development)
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      target: builder
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/shoe-ecommerce-dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
    depends_on:
      - mongodb
      - redis
    networks:
      - shoe-network

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_dev_data:/data/db
    networks:
      - shoe-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - shoe-network

volumes:
  mongodb_dev_data:

networks:
  shoe-network:
    driver: bridge
```

## Environment Configuration for Docker

### .env for Docker
```env
# Application
NODE_ENV=production
PORT=5000
API_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000

# Database (use container names)
MONGODB_URI=mongodb://mongodb:27017/shoe-ecommerce
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Email (configure your email service)
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@shoestore.com
EMAIL_FROM_NAME=Shoe Store

# Payment
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Docker Commands Reference

### Basic Operations
```bash
# Build and start services
docker-compose up --build

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs api
docker-compose logs -f mongodb

# Execute commands in containers
docker-compose exec api npm test
docker-compose exec mongodb mongo
```

### Development Commands
```bash
# Use development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Install new packages
docker-compose exec api npm install package-name

# Run tests
docker-compose exec api npm test

# Access container shell
docker-compose exec api sh
```

### Maintenance Commands
```bash
# Update images
docker-compose pull

# Rebuild containers
docker-compose build --no-cache

# Clean up unused containers/images
docker system prune

# View container resource usage
docker stats
```

## Production Deployment with Docker

### 1. Prepare Production Environment
```bash
# Create production directory
mkdir /opt/shoe-store
cd /opt/shoe-store

# Clone repository
git clone <repository-url> .

# Set up environment
cp .env.example .env
# Edit .env with production values
```

### 2. Configure Docker for Production
```bash
# Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Set up SSL certificates (if using nginx)
docker-compose exec nginx certbot --nginx -d yourdomain.com
```

### 3. Set Up Monitoring
```bash
# Add monitoring services to docker-compose
# - Prometheus for metrics
# - Grafana for dashboards
# - ELK stack for logging
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :5000

# Kill the process or change port in docker-compose.yml
```

#### 2. Database Connection Issues
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec api node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB');
"
```

#### 3. Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# For uploads directory
mkdir -p uploads
chmod 755 uploads
```

#### 4. Memory Issues
```bash
# Increase Docker memory limit in Docker Desktop settings
# Or add memory limits to docker-compose.yml:
services:
  api:
    mem_limit: 512m
    memswap_limit: 1g
```

### Health Checks
```bash
# Check API health
curl http://localhost:5000/api/health

# Check all services
docker-compose ps

# View resource usage
docker stats
```

## Security Considerations

### 1. Container Security
- Use non-root user in containers
- Keep base images updated
- Scan images for vulnerabilities
- Use multi-stage builds to reduce attack surface

### 2. Network Security
- Use custom networks
- Limit exposed ports
- Configure firewall rules
- Use secrets management

### 3. Data Security
- Use named volumes for persistent data
- Regular backups
- Encrypt sensitive data
- Secure database credentials

This Docker setup provides a complete containerized environment for the Shoe Store API, making it easy to deploy consistently across different environments.
