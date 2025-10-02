# Shoe Store API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [API Documentation](#api-documentation)
5. [Setup Guides](#setup-guides)
6. [Deployment](#deployment)
7. [Testing](#testing)
8. [Contributing](#contributing)

## Overview

The Shoe Store API is a comprehensive e-commerce backend built with Node.js, Express, and MongoDB. It provides a complete solution for managing an online shoe store with features including:

### Core Features
- **User Management**: Registration, authentication, profiles, and role-based access
- **Product Catalog**: Product management with variants, categories, and search
- **Shopping Cart**: Persistent cart management with real-time updates
- **Order Processing**: Complete order lifecycle from creation to fulfillment
- **Payment Integration**: Stripe payment processing with webhooks
- **Review System**: Product reviews with moderation and helpful votes
- **Wishlist Management**: Multiple wishlists with sharing capabilities
- **Inventory Management**: Real-time stock tracking and low stock alerts
- **Flash Sales**: Time-limited promotional sales
- **Coupon System**: Flexible discount codes and promotions
- **Notification System**: Multi-channel notifications (email, push, in-app)
- **Analytics**: Comprehensive business intelligence and reporting
- **Admin Dashboard**: Complete administrative interface

### Technical Highlights
- **RESTful API**: Clean, consistent API design following REST principles
- **Real-time Features**: WebSocket integration for live updates
- **Caching**: Redis-based caching for improved performance
- **File Upload**: Cloudinary integration for image management
- **Email Service**: HTML email templates with Nodemailer
- **Background Jobs**: Cron-based task scheduling
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Security**: JWT authentication, input validation, rate limiting
- **Documentation**: Extensive API documentation and guides

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- Redis (v6.0 or higher) - Optional but recommended
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shoe-api
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

4. **Start the database**
   ```bash
   # MongoDB (if running locally)
   mongod

   # Redis (if running locally)
   redis-server
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

6. **Verify installation**
   ```bash
   curl http://localhost:5000/api/health
   ```

## Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   CDN           │
│   (React/Next)  │◄──►│   (Nginx)       │◄──►│   (Cloudinary)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express.js Application                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │   Routes    │ │ Middleware  │ │  Services   │ │  Models   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MongoDB       │    │   Redis Cache   │    │ External APIs   │
│   (Database)    │    │   (Sessions)    │    │ (Stripe, Email) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Backend Core
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL document database
- **Mongoose**: MongoDB object modeling

#### Authentication & Security
- **JWT**: JSON Web Tokens for stateless authentication
- **Passport.js**: Authentication middleware
- **bcryptjs**: Password hashing
- **Helmet**: Security headers
- **express-rate-limit**: API rate limiting

#### Caching & Performance
- **Redis**: In-memory data structure store
- **Compression**: Gzip compression middleware
- **Morgan**: HTTP request logger

#### External Services
- **Stripe**: Payment processing
- **Cloudinary**: Image management and CDN
- **Nodemailer**: Email service
- **Socket.IO**: Real-time communication

#### Development & Testing
- **Jest**: Testing framework
- **Supertest**: HTTP assertion library
- **Nodemon**: Development auto-restart
- **ESLint**: Code linting
- **Prettier**: Code formatting

### Directory Structure

```
shoe-api/
├── src/
│   ├── app.js                 # Express application setup
│   ├── server.js              # Server entry point
│   ├── config/                # Configuration files
│   │   ├── database.js        # MongoDB connection
│   │   ├── redis.js           # Redis configuration
│   │   ├── cloudinary.js      # Image upload config
│   │   └── passport.js        # Authentication strategies
│   ├── middleware/            # Custom middleware
│   │   ├── auth.js            # Authentication middleware
│   │   ├── validation.js      # Input validation
│   │   ├── errorHandler.js    # Error handling
│   │   └── logger.js          # Request logging
│   ├── models/                # Database models
│   │   ├── User.js            # User model
│   │   ├── Product.js         # Product model
│   │   ├── Order.js           # Order model
│   │   ├── Review.js          # Review model
│   │   └── Wishlist.js        # Wishlist model
│   ├── routes/                # API routes
│   │   ├── auth.js            # Authentication routes
│   │   ├── products.js        # Product routes
│   │   ├── orders.js          # Order routes
│   │   ├── reviews.js         # Review routes
│   │   └── wishlists.js       # Wishlist routes
│   ├── services/              # Business logic services
│   │   ├── emailService.js    # Email operations
│   │   ├── paymentService.js  # Payment processing
│   │   ├── notificationService.js # Notifications
│   │   └── analyticsService.js # Analytics & reporting
│   ├── utils/                 # Utility functions
│   │   └── helpers.js         # Common helper functions
│   └── tests/                 # Test files
│       ├── models/            # Model tests
│       ├── routes/            # Route tests
│       └── services/          # Service tests
├── docs/                      # Documentation
│   ├── api/                   # API documentation
│   ├── setup/                 # Setup guides
│   └── deployment/            # Deployment guides
├── public/                    # Static files
├── .env.example               # Environment variables template
├── package.json               # Dependencies and scripts
├── jest.config.js             # Test configuration
└── README.md                  # Project overview
```

## API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Authentication
Most endpoints require authentication using JWT tokens:

```bash
# Include in request headers
Authorization: Bearer <your-jwt-token>
```

### Response Format
All API responses follow a consistent format:

```json
{
  "status": "success|error",
  "message": "Human readable message",
  "data": {
    // Response data
  },
  "pagination": {
    // Pagination info (for paginated responses)
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Handling
Error responses include detailed information:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Rate Limiting
API endpoints are rate limited:
- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **File upload endpoints**: 10 requests per hour

## Setup Guides

### Development Setup
Detailed instructions for setting up the development environment:
- [Local Development Setup](setup/development.md)
- [Database Configuration](setup/database.md)
- [Environment Variables](setup/environment.md)

### Production Setup
Guidelines for production deployment:
- [Production Configuration](setup/production.md)
- [Security Checklist](setup/security.md)
- [Performance Optimization](setup/performance.md)

## Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Cloud Deployment
- [AWS Deployment Guide](deployment/aws.md)
- [Google Cloud Deployment](deployment/gcp.md)
- [Azure Deployment Guide](deployment/azure.md)

### CI/CD Pipeline
- [GitHub Actions Setup](deployment/github-actions.md)
- [Automated Testing](deployment/testing.md)
- [Deployment Strategies](deployment/strategies.md)

## Testing

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```

### Test Documentation
- [Testing Strategy](../src/tests/README.md)
- [Writing Tests](testing/writing-tests.md)
- [Test Coverage](testing/coverage.md)

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Use Prettier for code formatting
- Write comprehensive tests
- Document new features
- Follow semantic versioning

### Pull Request Process
1. Update documentation
2. Add tests for new features
3. Ensure CI passes
4. Request code review
5. Address feedback
6. Merge after approval

## Support

### Getting Help
- [FAQ](support/faq.md)
- [Troubleshooting Guide](support/troubleshooting.md)
- [API Reference](api/reference.md)

### Community
- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Wiki: Community-maintained documentation

---

For detailed information on specific topics, please refer to the individual documentation files in the `docs/` directory.
