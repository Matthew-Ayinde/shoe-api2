# Production Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Database Setup](#database-setup)
6. [SSL and Security](#ssl-and-security)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Performance Optimization](#performance-optimization)
10. [Backup and Recovery](#backup-and-recovery)

## Pre-Deployment Checklist

### Code Preparation
- [ ] All tests passing (`npm test`)
- [ ] Code linting passed (`npm run lint`)
- [ ] Security audit completed (`npm audit`)
- [ ] Dependencies updated to latest stable versions
- [ ] Environment variables documented
- [ ] API documentation updated
- [ ] Performance testing completed
- [ ] Load testing completed

### Security Checklist
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are secure
- [ ] API keys are properly configured
- [ ] CORS settings are restrictive
- [ ] Rate limiting is configured
- [ ] Input validation is comprehensive
- [ ] Error messages don't expose sensitive data
- [ ] HTTPS is enforced
- [ ] Security headers are configured

### Infrastructure Checklist
- [ ] Domain name registered and configured
- [ ] SSL certificate obtained
- [ ] Database backup strategy implemented
- [ ] Monitoring tools configured
- [ ] Log aggregation setup
- [ ] CDN configured for static assets
- [ ] Email service configured
- [ ] Payment gateway configured

## Environment Setup

### Production Environment Variables

Create a comprehensive `.env.production` file:

```bash
# Application Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Domain and URLs
DOMAIN=yourstore.com
API_URL=https://api.yourstore.com
FRONTEND_URL=https://yourstore.com
ADMIN_URL=https://admin.yourstore.com

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shoe-store-prod
MONGODB_OPTIONS=retryWrites=true&w=majority&maxPoolSize=10

# Redis Configuration
REDIS_URL=redis://username:password@redis-host:6379
REDIS_TLS_URL=rediss://username:password@redis-host:6380

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-256-bits-minimum
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRE=30d

# Email Configuration (Production SMTP)
EMAIL_FROM=noreply@yourstore.com
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-production-cloud
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-live-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_WEBHOOK_ENDPOINT=https://api.yourstore.com/api/payments/webhook

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.yourstore.com/api/auth/google/callback

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:admin@yourstore.com

# Monitoring and Logging
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHE=true
CACHE_TTL=3600

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://yourstore.com,https://admin.yourstore.com
```

### Environment Security

```bash
# Encrypt environment file
gpg --symmetric --cipher-algo AES256 .env.production

# Decrypt for deployment
gpg --decrypt .env.production.gpg > .env.production

# Set proper permissions
chmod 600 .env.production
```

## Docker Deployment

### Multi-Stage Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

### Docker Compose for Production

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: production
    image: shoe-api:latest
    container_name: shoe-api
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
    depends_on:
      - mongodb
      - redis
    networks:
      - shoe-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongodb:
    image: mongo:6.0
    container_name: shoe-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: shoe-store
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - shoe-network

  redis:
    image: redis:7-alpine
    container_name: shoe-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - shoe-network

  nginx:
    image: nginx:alpine
    container_name: shoe-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - shoe-network

volumes:
  mongodb_data:
  redis_data:

networks:
  shoe-network:
    driver: bridge
```

### Nginx Configuration

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream shoe_api {
        least_conn;
        server app:5000 max_fails=3 fail_timeout=30s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.yourstore.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name api.yourstore.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # API Routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://shoe_api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Auth Routes (Stricter Rate Limiting)
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            
            proxy_pass http://shoe_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health Check
        location /health {
            access_log off;
            proxy_pass http://shoe_api/api/health;
        }

        # Static Files (if any)
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }
    }
}
```

## Cloud Deployment

### AWS Deployment with ECS

#### Task Definition

```json
{
  "family": "shoe-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "shoe-api",
      "image": "your-account.dkr.ecr.region.amazonaws.com/shoe-api:latest",
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
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:shoe-api/mongodb-uri"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:shoe-api/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/shoe-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:5000/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Service Definition

```json
{
  "serviceName": "shoe-api-service",
  "cluster": "shoe-api-cluster",
  "taskDefinition": "shoe-api:1",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": [
        "subnet-12345678",
        "subnet-87654321"
      ],
      "securityGroups": [
        "sg-12345678"
      ],
      "assignPublicIp": "ENABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/shoe-api-tg/1234567890123456",
      "containerName": "shoe-api",
      "containerPort": 5000
    }
  ],
  "deploymentConfiguration": {
    "maximumPercent": 200,
    "minimumHealthyPercent": 50
  }
}
```

### Kubernetes Deployment

#### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shoe-api
  labels:
    app: shoe-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: shoe-api
  template:
    metadata:
      labels:
        app: shoe-api
    spec:
      containers:
      - name: shoe-api
        image: shoe-api:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "5000"
        envFrom:
        - secretRef:
            name: shoe-api-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: logs
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: shoe-api-service
spec:
  selector:
    app: shoe-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shoe-api-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.yourstore.com
    secretName: shoe-api-tls
  rules:
  - host: api.yourstore.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: shoe-api-service
            port:
              number: 80
```

## Database Setup

### MongoDB Atlas Production Setup

```javascript
// Connection with production options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false,
  retryWrites: true,
  w: 'majority',
  readPreference: 'primaryPreferred'
}

// Connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, mongoOptions)
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}
```

### Database Indexes for Production

```javascript
// Create production indexes
const createIndexes = async () => {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ 'profile.firstName': 1, 'profile.lastName': 1 })
    await User.collection.createIndex({ createdAt: -1 })
    
    // Product indexes
    await Product.collection.createIndex({ name: 'text', description: 'text' })
    await Product.collection.createIndex({ category: 1, gender: 1 })
    await Product.collection.createIndex({ brand: 1 })
    await Product.collection.createIndex({ 'priceRange.min': 1, 'priceRange.max': 1 })
    await Product.collection.createIndex({ 'ratings.average': -1 })
    await Product.collection.createIndex({ isActive: 1, isFeatured: 1 })
    
    // Order indexes
    await Order.collection.createIndex({ user: 1, createdAt: -1 })
    await Order.collection.createIndex({ status: 1 })
    await Order.collection.createIndex({ orderNumber: 1 }, { unique: true })
    
    // Review indexes
    await Review.collection.createIndex({ product: 1, createdAt: -1 })
    await Review.collection.createIndex({ user: 1 })
    await Review.collection.createIndex({ moderationStatus: 1 })
    
    console.log('Database indexes created successfully')
  } catch (error) {
    console.error('Error creating indexes:', error)
  }
}
```

## SSL and Security

### Let's Encrypt SSL Setup

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.yourstore.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers Configuration

```javascript
// Enhanced security middleware
const helmet = require('helmet')

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}))
```

## Monitoring and Logging

### Application Monitoring with Sentry

```javascript
const Sentry = require('@sentry/node')

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request) {
      delete event.request.headers.authorization
      delete event.request.headers.cookie
    }
    return event
  }
})

// Error handling middleware
app.use(Sentry.Handlers.errorHandler())
```

### Structured Logging with Winston

```javascript
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'shoe-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
})
```

### Health Check Endpoint

```javascript
// Health check with detailed status
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    checks: {}
  }

  try {
    // Database check
    await mongoose.connection.db.admin().ping()
    health.checks.database = { status: 'healthy' }
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message }
    health.status = 'unhealthy'
  }

  try {
    // Redis check
    await redis.ping()
    health.checks.redis = { status: 'healthy' }
  } catch (error) {
    health.checks.redis = { status: 'unhealthy', error: error.message }
  }

  const statusCode = health.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(health)
})
```

This production deployment guide provides a comprehensive approach to deploying the Shoe Store API in a production environment with proper security, monitoring, and scalability considerations.
