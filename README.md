# Shoe Ecommerce API

A comprehensive, production-ready ecommerce API for a shoe store built with modern technologies and best practices.

## 🚀 Technology Stack

### Core Technologies

#### **Node.js (Runtime Environment)**

- **Purpose**: JavaScript runtime built on Chrome's V8 JavaScript engine
- **Usage**: Server-side execution environment for our API
- **Why**: Non-blocking I/O, excellent for handling concurrent requests, vast ecosystem
- **Version**: 18+ (LTS)

#### **Express.js (Web Framework)**

- **Purpose**: Fast, unopinionated web framework for Node.js
- **Usage**: HTTP server, routing, middleware management
- **Features Used**:
  - RESTful API routing
  - Middleware pipeline
  - Request/response handling
  - Static file serving
- **Why**: Minimal, flexible, robust feature set for web applications

#### **MongoDB (Database)**

- **Purpose**: NoSQL document database
- **Usage**: Primary data storage for products, users, orders, etc.
- **Features Used**:
  - Document-based storage
  - Flexible schema design
  - Aggregation pipelines
  - Indexing for performance
- **Why**: Flexible schema, horizontal scaling, JSON-like documents

#### **Mongoose (ODM)**

- **Purpose**: MongoDB object modeling for Node.js
- **Usage**: Schema definition, validation, query building
- **Features Used**:
  - Schema validation
  - Middleware (pre/post hooks)
  - Virtual properties
  - Population (joins)
- **Why**: Type safety, validation, elegant MongoDB object modeling

### Security & Authentication

#### **JWT (JSON Web Tokens)**

- **Purpose**: Stateless authentication mechanism
- **Usage**: User authentication, session management
- **Implementation**: Bearer token in Authorization header
- **Why**: Stateless, scalable, secure token-based authentication

#### **Passport.js (Authentication Middleware)**

- **Purpose**: Authentication middleware for Node.js
- **Usage**: Multiple authentication strategies
- **Strategies Used**:
  - Local Strategy (email/password)
  - JWT Strategy (token validation)
  - Google OAuth 2.0 (social login)
- **Why**: Flexible, supports 500+ authentication strategies

#### **bcryptjs (Password Hashing)**

- **Purpose**: Password hashing library
- **Usage**: Hash passwords before storing, compare during login
- **Security**: Salt rounds: 12 (recommended for production)
- **Why**: Secure, slow hashing algorithm resistant to rainbow table attacks

#### **Helmet.js (Security Headers)**

- **Purpose**: Secure Express apps by setting various HTTP headers
- **Usage**: Automatic security headers
- **Headers Set**:
  - Content Security Policy
  - X-Frame-Options
  - X-XSS-Protection
  - And more...
- **Why**: Defense against common web vulnerabilities

### Payment Processing

#### **Stripe (Payment Gateway)**

- **Purpose**: Online payment processing
- **Usage**: Credit card payments, webhooks, refunds
- **Features Used**:
  - Payment Intents API
  - Webhook handling
  - Refund processing
  - Metadata tracking
- **Why**: Reliable, secure, developer-friendly payment processing

### File Storage & Media

#### **Cloudinary (Image Management)**

- **Purpose**: Cloud-based image and video management
- **Usage**: Product image storage, optimization, transformation
- **Features Used**:
  - Image upload and storage
  - Automatic optimization
  - Responsive image delivery
  - Image transformations
- **Why**: CDN delivery, automatic optimization, comprehensive image management

#### **Multer (File Upload)**

- **Purpose**: Middleware for handling multipart/form-data
- **Usage**: File upload handling before Cloudinary processing
- **Why**: Standard for file uploads in Express applications

### Real-time Communication

#### **Socket.IO (WebSocket Library)**

- **Purpose**: Real-time bidirectional event-based communication
- **Usage**: Live updates for orders, inventory, notifications
- **Features Used**:
  - Room-based messaging
  - Event-driven communication
  - Automatic fallback to polling
- **Real-time Features**:
  - Order status updates
  - Inventory changes
  - Flash sale notifications
  - Admin notifications
- **Why**: Reliable real-time communication with fallback options

### Background Processing

#### **Node-cron (Task Scheduler)**

- **Purpose**: Cron-like job scheduler for Node.js
- **Usage**: Scheduled tasks and background jobs
- **Jobs Implemented**:
  - Flash sale status checks
  - Expired coupon cleanup
  - Daily report generation
  - Inventory alerts
- **Why**: Simple, reliable task scheduling

### Email Services

#### **Nodemailer (Email Client)**

- **Purpose**: Email sending from Node.js applications
- **Usage**: Transactional emails, notifications
- **Email Types**:
  - Welcome emails
  - Order confirmations
  - Password resets
  - Shipping notifications
  - Marketing emails
- **Why**: Most popular Node.js email solution, supports multiple transports

### Development & Testing

#### **Jest (Testing Framework)**

- **Purpose**: JavaScript testing framework
- **Usage**: Unit tests, integration tests
- **Features Used**:
  - Test suites and cases
  - Mocking and spying
  - Coverage reporting
  - Async testing
- **Why**: Zero configuration, snapshot testing, great developer experience

#### **Supertest (HTTP Testing)**

- **Purpose**: HTTP assertion library
- **Usage**: API endpoint testing
- **Why**: Perfect for testing Express applications

#### **Nodemon (Development Tool)**

- **Purpose**: Monitor for changes and automatically restart server
- **Usage**: Development environment only
- **Why**: Improves development workflow

### Middleware & Utilities

#### **CORS (Cross-Origin Resource Sharing)**

- **Purpose**: Enable cross-origin requests
- **Usage**: Allow frontend applications to access API
- **Configuration**: Specific origins, credentials support
- **Why**: Essential for frontend-backend communication

#### **Morgan (HTTP Logger)**

- **Purpose**: HTTP request logger middleware
- **Usage**: Request logging in development
- **Why**: Essential for debugging and monitoring

#### **Express Rate Limit**

- **Purpose**: Rate limiting middleware
- **Usage**: Prevent abuse and DDoS attacks
- **Configuration**: 100 requests per 15 minutes per IP
- **Why**: API protection and abuse prevention

#### **Express Mongo Sanitize**

- **Purpose**: Prevent NoSQL injection attacks
- **Usage**: Sanitize user input
- **Why**: Security against MongoDB injection attacks

#### **Compression**

- **Purpose**: Gzip compression middleware
- **Usage**: Compress response bodies
- **Why**: Reduce bandwidth usage and improve performance

#### **Express Validator**

- **Purpose**: Middleware for input validation and sanitization
- **Usage**: Validate request data
- **Features Used**:
  - Field validation
  - Custom validators
  - Sanitization
  - Error handling
- **Why**: Comprehensive validation solution

### Push Notifications

#### **Web Push**

- **Purpose**: Web push notification library
- **Usage**: Send push notifications to browsers
- **Why**: Engage users with timely notifications

### Logging

#### **Winston (Logging Library)**

- **Purpose**: Universal logging library
- **Usage**: Application logging, error tracking
- **Features Used**:
  - Multiple log levels
  - File and console transports
  - Log formatting
- **Why**: Flexible, feature-rich logging solution

### Containerization

#### **Docker (Containerization)**

- **Purpose**: Application containerization
- **Usage**: Consistent deployment environments
- **Services**:
  - API container
  - MongoDB container
  - Redis container (for caching)
  - Mongo Express (database admin)
- **Why**: Consistent environments, easy deployment, scalability

## 📁 Project Structure

```
shoe-ecommerce-api/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Custom middleware
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── tests/           # Test files
│   └── scripts/         # Database scripts
├── docs/                # Documentation
├── public/              # Static files
├── docker-compose.yml   # Docker configuration
├── Dockerfile          # Docker image definition
└── package.json        # Dependencies and scripts
```

## 🔧 Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/shoe-ecommerce

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@shoestore.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account
- Docker (optional, for containerized setup)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd shoe-ecommerce-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start MongoDB** (if running locally)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Or start your local MongoDB service
```

5. **Seed the database** (optional)

```bash
npm run seed
```

6. **Start the development server**

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Docker Setup

1. **Using Docker Compose** (recommended)

```bash
docker-compose up -d
```

This will start:

- API server on port 5000
- MongoDB on port 27017
- Redis on port 6379
- Mongo Express on port 8081

2. **Access the services**

- API: http://localhost:5000
- Mongo Express: http://localhost:8081 (admin/admin123)

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Response Format

All API responses follow this format:

```json
{
  "status": "success|error",
  "message": "Response message",
  "data": {
    // Response data
  }
}
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test API endpoints and database interactions
- **Test Database**: Uses separate test database to avoid data pollution

## 🔒 Security Features

1. **Authentication & Authorization**

   - JWT-based authentication
   - Role-based access control (Customer, Staff, Admin)
   - Google OAuth integration

2. **Input Validation & Sanitization**

   - Request validation using express-validator
   - MongoDB injection prevention
   - XSS protection

3. **Security Headers**

   - Helmet.js for security headers
   - CORS configuration
   - Rate limiting

4. **Password Security**
   - bcrypt hashing with salt rounds
   - Password strength requirements
   - Secure password reset flow

## 🚀 Deployment

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Use strong JWT secret
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure production database
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

### Docker Production

```bash
# Build production image
docker build -t shoe-ecommerce-api .

# Run production container
docker run -d -p 5000:5000 --env-file .env.production shoe-ecommerce-api
```

## 📊 Monitoring & Logging

- **Winston**: Structured logging with multiple levels
- **Morgan**: HTTP request logging
- **Health Check**: `/api/health` endpoint for monitoring
- **Error Handling**: Centralized error handling middleware

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
