# CI/CD Pipeline Setup Guide

## Overview

This guide provides comprehensive instructions for setting up Continuous Integration and Continuous Deployment (CI/CD) pipelines for the Shoe Store API using GitHub Actions, with deployment options for various cloud platforms.

## Table of Contents

1. [GitHub Actions Setup](#github-actions-setup)
2. [Environment Configuration](#environment-configuration)
3. [Testing Pipeline](#testing-pipeline)
4. [Deployment Strategies](#deployment-strategies)
5. [Security and Secrets Management](#security-and-secrets-management)
6. [Monitoring and Notifications](#monitoring-and-notifications)

## GitHub Actions Setup

### Basic Workflow Structure

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Continuous Integration
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run security audit
        run: npm audit --audit-level moderate

      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://localhost:27017/shoe-ecommerce-test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-jwt-secret
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}

      - name: Generate test coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # Security Scanning
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # Build Docker Image
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push'
    
    outputs:
      image: ${{ steps.image.outputs.image }}
      digest: ${{ steps.build.outputs.digest }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Output image
        id: image
        run: |
          echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}" >> $GITHUB_OUTPUT

  # Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying ${{ needs.build.outputs.image }} to staging"
          # Add your staging deployment commands here

  # Deploy to Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying ${{ needs.build.outputs.image }} to production"
          # Add your production deployment commands here
```

## Environment Configuration

### GitHub Secrets Setup

Configure these secrets in your GitHub repository:

#### Required Secrets
```bash
# Database
MONGODB_URI_STAGING=mongodb://staging-db-url/shoe-ecommerce
MONGODB_URI_PRODUCTION=mongodb://production-db-url/shoe-ecommerce

# JWT
JWT_SECRET_STAGING=staging-jwt-secret-key
JWT_SECRET_PRODUCTION=production-jwt-secret-key

# Payment
STRIPE_SECRET_KEY_STAGING=sk_test_your_staging_key
STRIPE_SECRET_KEY_PRODUCTION=sk_live_your_production_key
STRIPE_WEBHOOK_SECRET_STAGING=whsec_staging_webhook_secret
STRIPE_WEBHOOK_SECRET_PRODUCTION=whsec_production_webhook_secret

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloud Services
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Deployment
DOCKER_REGISTRY_URL=your-registry-url
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-password

# Monitoring
CODECOV_TOKEN=your-codecov-token
SENTRY_DSN=your-sentry-dsn
```

### Environment-Specific Workflows

#### Staging Deployment
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Heroku Staging
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "shoe-store-api-staging"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
          usedocker: true
          docker_heroku_process_type: web
```

#### Production Deployment
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to AWS ECS
        run: |
          # Configure AWS CLI
          aws configure set aws_access_key_id ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws configure set aws_secret_access_key ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws configure set default.region ${{ secrets.AWS_REGION }}
          
          # Update ECS service
          aws ecs update-service \
            --cluster shoe-store-cluster \
            --service shoe-store-api \
            --force-new-deployment
```

## Testing Pipeline

### Comprehensive Test Configuration

#### Jest Configuration for CI
```javascript
// jest.config.ci.js
module.exports = {
  ...require('./jest.config.js'),
  
  // CI-specific settings
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Timeout for CI environment
  testTimeout: 30000,
  
  // Run tests in band for CI stability
  runInBand: true,
  
  // Fail fast on CI
  bail: 1
}
```

#### Test Scripts in package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:ci": "jest --config=jest.config.ci.js",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/ --ext .js",
    "lint:fix": "eslint src/ --ext .js --fix",
    "audit": "npm audit --audit-level moderate"
  }
}
```

## Deployment Strategies

### 1. Heroku Deployment

#### Heroku Configuration
```yaml
# Deploy to Heroku
- name: Deploy to Heroku
  uses: akhileshns/heroku-deploy@v3.12.12
  with:
    heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
    heroku_app_name: "shoe-store-api"
    heroku_email: ${{ secrets.HEROKU_EMAIL }}
    usedocker: true
    healthcheck: "https://shoe-store-api.herokuapp.com/api/health"
    delay: 5
    rollbackonhealthcheckfailed: true
```

### 2. AWS ECS Deployment

#### ECS Task Definition
```json
{
  "family": "shoe-store-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "shoe-store-api",
      "image": "your-registry/shoe-store-api:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:mongodb-uri"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/shoe-store-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 3. Digital Ocean App Platform

#### App Spec Configuration
```yaml
# .do/app.yaml
name: shoe-store-api
services:
- name: api
  source_dir: /
  github:
    repo: your-username/shoe-store-api
    branch: main
    deploy_on_push: true
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${MONGODB_URI}
    type: SECRET
  - key: JWT_SECRET
    value: ${JWT_SECRET}
    type: SECRET
  health_check:
    http_path: /api/health
databases:
- name: mongodb
  engine: MONGODB
  version: "6"
```

## Security and Secrets Management

### 1. Secrets Scanning
```yaml
# Add to workflow
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: main
    head: HEAD
```

### 2. Dependency Scanning
```yaml
- name: Run Snyk to check for vulnerabilities
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high
```

### 3. Container Scanning
```yaml
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
```

## Monitoring and Notifications

### 1. Slack Notifications
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2. Email Notifications
```yaml
- name: Send email notification
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 587
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "Deployment Status: ${{ job.status }}"
    body: "Deployment to ${{ github.ref }} completed with status: ${{ job.status }}"
    to: team@company.com
```

### 3. Health Check Monitoring
```yaml
- name: Health check after deployment
  run: |
    sleep 30
    curl -f https://your-api-url.com/api/health || exit 1
```

This CI/CD setup provides automated testing, security scanning, building, and deployment for the Shoe Store API across multiple environments.
