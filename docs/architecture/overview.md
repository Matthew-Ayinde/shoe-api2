# Architecture Overview

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Application Architecture](#application-architecture)
3. [Data Architecture](#data-architecture)
4. [Security Architecture](#security-architecture)
5. [Performance Architecture](#performance-architecture)
6. [Deployment Architecture](#deployment-architecture)
7. [Scalability Considerations](#scalability-considerations)

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Web Browser   │   Mobile App    │    Admin Dashboard          │
│   (React/Next)  │   (React Native)│    (React/Vue)              │
└─────────────────┴─────────────────┴─────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer                 │
│                         (Nginx)                                │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Auth      │ │  Products   │ │   Orders    │ │  Reviews  │ │
│  │  Service    │ │   Service   │ │   Service   │ │  Service  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │  Payment    │ │   Email     │ │   Cache     │ │Analytics  │ │
│  │  Service    │ │   Service   │ │   Service   │ │ Service   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   MongoDB   │ │    Redis    │ │ Cloudinary  │ │  Stripe   │ │
│  │ (Database)  │ │   (Cache)   │ │  (Images)   │ │(Payments) │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### Client Layer
- **Web Browser**: Customer-facing e-commerce interface
- **Mobile App**: Native mobile shopping experience
- **Admin Dashboard**: Store management and analytics interface

#### API Gateway
- **Load Balancing**: Distributes requests across multiple server instances
- **SSL Termination**: Handles HTTPS encryption/decryption
- **Rate Limiting**: Prevents API abuse and ensures fair usage
- **Request Routing**: Routes requests to appropriate services

#### Application Layer
- **Express.js Server**: Main application server handling HTTP requests
- **Business Logic**: Core e-commerce functionality and rules
- **External Integrations**: Third-party service integrations
- **Real-time Communication**: WebSocket connections for live updates

#### Data Layer
- **Primary Database**: MongoDB for persistent data storage
- **Cache Layer**: Redis for high-performance data access
- **File Storage**: Cloudinary for image and media management
- **Payment Processing**: Stripe for secure payment handling

## Application Architecture

### Layered Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Routes    │ │ Middleware  │ │Controllers  │ │Validation │ │
│  │ (Express)   │ │(Auth, CORS) │ │  (Logic)    │ │ (Joi/Yup) │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Services  │ │  Utilities  │ │   Events    │ │   Jobs    │ │
│  │(Core Logic) │ │ (Helpers)   │ │(Pub/Sub)    │ │ (Cron)    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Models    │ │Repositories │ │   Cache     │ │External   │ │
│  │ (Mongoose)  │ │(Data Access)│ │  (Redis)    │ │APIs       │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure and Responsibilities

```
src/
├── app.js                 # Express application setup
├── server.js              # Server entry point and configuration
├── config/                # Configuration management
│   ├── database.js        # MongoDB connection and settings
│   ├── redis.js           # Redis connection and configuration
│   ├── cloudinary.js      # Image upload configuration
│   └── passport.js        # Authentication strategies
├── middleware/            # Express middleware functions
│   ├── auth.js            # Authentication and authorization
│   ├── validation.js      # Request validation
│   ├── errorHandler.js    # Global error handling
│   ├── logger.js          # Request logging
│   └── rateLimiter.js     # API rate limiting
├── models/                # Database models and schemas
│   ├── User.js            # User data model
│   ├── Product.js         # Product catalog model
│   ├── Order.js           # Order management model
│   ├── Review.js          # Product review model
│   ├── Wishlist.js        # User wishlist model
│   └── Cart.js            # Shopping cart model
├── routes/                # API route definitions
│   ├── auth.js            # Authentication endpoints
│   ├── products.js        # Product management endpoints
│   ├── orders.js          # Order processing endpoints
│   ├── reviews.js         # Review system endpoints
│   ├── wishlists.js       # Wishlist management endpoints
│   ├── cart.js            # Shopping cart endpoints
│   ├── payments.js        # Payment processing endpoints
│   └── admin.js           # Administrative endpoints
├── services/              # Business logic services
│   ├── authService.js     # Authentication business logic
│   ├── productService.js  # Product management logic
│   ├── orderService.js    # Order processing logic
│   ├── paymentService.js  # Payment processing logic
│   ├── emailService.js    # Email communication
│   ├── notificationService.js # Multi-channel notifications
│   ├── cacheService.js    # Caching strategies
│   └── analyticsService.js # Business intelligence
├── utils/                 # Utility functions and helpers
│   ├── helpers.js         # Common helper functions
│   ├── constants.js       # Application constants
│   ├── validators.js      # Custom validation functions
│   └── logger.js          # Logging utilities
└── tests/                 # Test suites
    ├── unit/              # Unit tests
    ├── integration/       # Integration tests
    └── e2e/               # End-to-end tests
```

### Design Patterns Used

#### 1. MVC (Model-View-Controller) Pattern
- **Models**: Data structure and business rules (Mongoose schemas)
- **Views**: JSON API responses (no traditional views in API)
- **Controllers**: Route handlers that process requests

#### 2. Service Layer Pattern
- Separates business logic from route handlers
- Promotes code reusability and testability
- Centralizes complex operations

#### 3. Repository Pattern
- Abstracts data access logic
- Provides consistent interface for data operations
- Enables easy testing with mock repositories

#### 4. Middleware Pattern
- Modular request processing pipeline
- Cross-cutting concerns (auth, logging, validation)
- Reusable and composable functionality

## Data Architecture

### Database Design

#### MongoDB Collections Structure

```
shoe-store (Database)
├── users                  # User accounts and profiles
├── products              # Product catalog
├── orders                # Order transactions
├── reviews               # Product reviews and ratings
├── wishlists            # User wishlists
├── carts                # Shopping carts
├── categories           # Product categories
├── coupons              # Discount codes
├── flashsales           # Time-limited sales
├── notifications        # User notifications
└── analytics            # Business metrics
```

#### Data Relationships

```
User (1) ──────────── (M) Orders
  │                        │
  │                        │
  └── (M) Reviews ──── (1) Product
  │                        │
  │                        │
  └── (M) Wishlists ─── (M) Products
  │
  │
  └── (1) Cart ──────── (M) Products

Product (1) ──────── (M) Reviews
   │
   │
   └── (M) Categories (M)

Order (1) ────────── (M) OrderItems
  │                      │
  │                      │
  └── (1) Payment ──── (1) Product
```

#### Indexing Strategy

```javascript
// User Collection Indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "profile.firstName": 1, "profile.lastName": 1 })
db.users.createIndex({ "createdAt": -1 })

// Product Collection Indexes
db.products.createIndex({ "name": "text", "description": "text" })
db.products.createIndex({ "category": 1, "gender": 1 })
db.products.createIndex({ "brand": 1 })
db.products.createIndex({ "priceRange.min": 1, "priceRange.max": 1 })
db.products.createIndex({ "ratings.average": -1 })
db.products.createIndex({ "createdAt": -1 })

// Order Collection Indexes
db.orders.createIndex({ "user": 1, "createdAt": -1 })
db.orders.createIndex({ "status": 1 })
db.orders.createIndex({ "orderNumber": 1 }, { unique: true })

// Review Collection Indexes
db.reviews.createIndex({ "product": 1, "createdAt": -1 })
db.reviews.createIndex({ "user": 1 })
db.reviews.createIndex({ "rating": 1 })
db.reviews.createIndex({ "moderationStatus": 1 })
```

### Caching Strategy

#### Redis Cache Patterns

```
Cache Key Patterns:
├── user:profile:{userId}           # User profile data
├── product:details:{productId}     # Product information
├── product:list:{filters_hash}     # Product search results
├── cart:{userId}                   # User shopping cart
├── session:{sessionId}             # User sessions
├── analytics:dashboard             # Dashboard metrics
└── inventory:stock:{productId}     # Real-time stock levels
```

#### Cache TTL (Time To Live) Strategy

```javascript
const CACHE_TTL = {
  USER_PROFILE: 3600,      // 1 hour
  PRODUCT_DETAILS: 3600,   // 1 hour
  PRODUCT_LIST: 1800,      // 30 minutes
  CART_DATA: 86400,        // 24 hours
  ANALYTICS: 900,          // 15 minutes
  INVENTORY: 300,          // 5 minutes
  SESSION: 604800          // 7 days
}
```

## Security Architecture

### Authentication & Authorization

#### JWT Token Flow

```
1. User Login Request
   ├── Validate Credentials
   ├── Generate JWT Token
   └── Return Token + User Data

2. Authenticated Request
   ├── Extract JWT from Header
   ├── Verify Token Signature
   ├── Check Token Expiration
   ├── Extract User Information
   └── Proceed with Request

3. Token Refresh (Optional)
   ├── Check Refresh Token
   ├── Generate New Access Token
   └── Return New Token
```

#### Role-Based Access Control (RBAC)

```javascript
const ROLES = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
  ADMIN: 'admin'
}

const PERMISSIONS = {
  // Customer permissions
  'customer': [
    'read:own_profile',
    'update:own_profile',
    'create:order',
    'read:own_orders',
    'create:review'
  ],
  
  // Staff permissions
  'staff': [
    ...PERMISSIONS.customer,
    'read:all_orders',
    'update:order_status',
    'moderate:reviews',
    'read:analytics'
  ],
  
  // Admin permissions
  'admin': [
    ...PERMISSIONS.staff,
    'create:product',
    'update:product',
    'delete:product',
    'manage:users',
    'access:admin_panel'
  ]
}
```

### Data Security

#### Input Validation & Sanitization

```javascript
// Request validation pipeline
1. Schema Validation (Joi/Yup)
   ├── Required fields check
   ├── Data type validation
   ├── Format validation (email, phone)
   └── Custom business rules

2. Sanitization
   ├── HTML sanitization (prevent XSS)
   ├── SQL injection prevention
   ├── NoSQL injection prevention
   └── Path traversal prevention

3. Rate Limiting
   ├── Per-IP rate limits
   ├── Per-user rate limits
   ├── Endpoint-specific limits
   └── Sliding window algorithm
```

#### Password Security

```javascript
// Password hashing with bcrypt
const hashPassword = async (password) => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Password strength requirements
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true
}
```

### API Security Headers

```javascript
// Security headers with Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))
```

## Performance Architecture

### Caching Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client-Side Caching                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Browser   │ │   Mobile    │ │    CDN      │ │   Proxy   │ │
│  │   Cache     │ │   Cache     │ │   Cache     │ │   Cache   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Application-Level Caching                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │    Redis    │ │   Memory    │ │   Query     │ │   API     │ │
│  │   Cache     │ │   Cache     │ │   Cache     │ │   Cache   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database-Level Caching                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   MongoDB   │ │   Index     │ │   Query     │ │Connection │ │
│  │   Cache     │ │   Cache     │ │   Plan      │ │   Pool    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Database Optimization

#### Query Optimization Strategies

```javascript
// 1. Efficient Aggregation Pipelines
const getProductAnalytics = async () => {
  return await Product.aggregate([
    { $match: { isActive: true } },
    { $group: {
        _id: "$category",
        totalProducts: { $sum: 1 },
        avgRating: { $avg: "$ratings.average" },
        totalRevenue: { $sum: "$totalSales" }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 }
  ])
}

// 2. Selective Field Projection
const getProductList = async (filters) => {
  return await Product.find(filters)
    .select('name brand priceRange images ratings')
    .populate('category', 'name')
    .lean() // Returns plain JavaScript objects
}

// 3. Pagination with Skip/Limit
const getPaginatedProducts = async (page, limit) => {
  const skip = (page - 1) * limit
  return await Product.find()
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
}
```

### Connection Pooling

```javascript
// MongoDB connection pooling
const mongooseOptions = {
  maxPoolSize: 10,        // Maximum connections
  minPoolSize: 5,         // Minimum connections
  maxIdleTimeMS: 30000,   // Close after 30s of inactivity
  serverSelectionTimeoutMS: 5000, // How long to try selecting server
  socketTimeoutMS: 45000, // How long a send/receive can take
  bufferMaxEntries: 0,    // Disable mongoose buffering
  bufferCommands: false   // Disable mongoose buffering
}

// Redis connection pooling
const redisOptions = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000
}
```

## Deployment Architecture

### Container Architecture

```dockerfile
# Multi-stage Docker build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
# Deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shoe-api
spec:
  replicas: 3
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
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Scalability Considerations

### Horizontal Scaling

#### Load Balancing Strategy

```nginx
# Nginx load balancer configuration
upstream shoe_api {
    least_conn;
    server api1:5000 weight=3;
    server api2:5000 weight=3;
    server api3:5000 weight=2;
    server api4:5000 backup;
}

server {
    listen 80;
    server_name api.shoestore.com;
    
    location / {
        proxy_pass http://shoe_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Database Scaling

```javascript
// MongoDB Replica Set Configuration
const replicaSetConfig = {
  _id: "shoe-store-rs",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", arbiterOnly: true }
  ]
}

// Read preference for scaling reads
const readPreference = {
  primary: "primary",           // All reads from primary
  secondary: "secondary",       // All reads from secondary
  primaryPreferred: "primaryPreferred", // Primary first, then secondary
  secondaryPreferred: "secondaryPreferred" // Secondary first, then primary
}
```

### Microservices Migration Path

```
Monolithic API (Current)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Decomposition                       │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Auth Service  │ Product Service │    Order Service            │
│   - User mgmt   │ - Catalog mgmt  │    - Order processing       │
│   - JWT tokens  │ - Search/filter │    - Payment integration    │
│   - OAuth       │ - Reviews       │    - Inventory updates      │
└─────────────────┴─────────────────┴─────────────────────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────┬─────────────────┬─────────────────────────────┐
│ Notification    │  Analytics      │    Admin Service            │
│ Service         │  Service        │    - Dashboard              │
│ - Email/SMS     │  - Reporting    │    - User management        │
│ - Push notifs   │  - Metrics      │    - System config          │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

This architecture provides a solid foundation for a scalable, maintainable, and secure e-commerce API that can grow with your business needs.
