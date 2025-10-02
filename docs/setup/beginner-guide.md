# Complete Beginner's Guide to Setting Up the Shoe Store API

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Understanding the Technology Stack](#understanding-the-technology-stack)
5. [Configuration Explained](#configuration-explained)
6. [Testing Your Setup](#testing-your-setup)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Next Steps](#next-steps)

## Introduction

Welcome to the complete beginner's guide for setting up the Shoe Store API! This guide is designed for developers who are new to Node.js, Express, MongoDB, or API development in general. We'll walk through every step in detail, explaining what each component does and why it's important.

### What You'll Learn
- How to set up a complete Node.js API from scratch
- Understanding of modern web development technologies
- Database setup and configuration
- API testing and validation
- Best practices for development environment setup

### What This API Does
The Shoe Store API is a complete e-commerce backend that handles:
- User registration and authentication
- Product catalog management
- Shopping cart functionality
- Order processing and payment
- Review and rating system
- Admin dashboard and analytics

## Prerequisites

Before we start, you'll need to install several tools on your computer. Don't worry - we'll explain what each one does!

### Required Software

#### 1. Node.js (JavaScript Runtime)
**What it is:** Node.js allows you to run JavaScript on your computer (not just in web browsers).

**Installation:**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the prompts
4. Verify installation by opening terminal/command prompt and typing:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers for both commands.

#### 2. MongoDB (Database)
**What it is:** MongoDB is a NoSQL database that stores data in flexible, JSON-like documents.

**Installation Options:**

**Option A: MongoDB Community Server (Local Installation)**
1. Go to [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Download for your operating system
3. Install following the setup wizard
4. Start MongoDB service:
   - **Windows:** MongoDB should start automatically as a service
   - **macOS:** Run `brew services start mongodb/brew/mongodb-community`
   - **Linux:** Run `sudo systemctl start mongod`

**Option B: MongoDB Atlas (Cloud Database - Recommended for Beginners)**
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier available)
4. Get your connection string (we'll use this later)

#### 3. Redis (Optional but Recommended)
**What it is:** Redis is an in-memory data store used for caching to make your API faster.

**Installation:**
- **Windows:** Download from [redis.io/download](https://redis.io/download) or use WSL
- **macOS:** Run `brew install redis`
- **Linux:** Run `sudo apt-get install redis-server`

**Start Redis:**
```bash
redis-server
```

#### 4. Git (Version Control)
**What it is:** Git helps you track changes in your code and collaborate with others.

**Installation:**
1. Go to [git-scm.com](https://git-scm.com/)
2. Download and install for your operating system
3. Verify: `git --version`

#### 5. Code Editor
**Recommended:** Visual Studio Code from [code.visualstudio.com](https://code.visualstudio.com/)

**Useful Extensions for VS Code:**
- JavaScript (ES6) code snippets
- Prettier - Code formatter
- ESLint
- Thunder Client (for API testing)
- MongoDB for VS Code

## Step-by-Step Installation

### Step 1: Get the Code

1. **Open your terminal/command prompt**
2. **Navigate to where you want to store the project:**
   ```bash
   cd Desktop  # or wherever you prefer
   ```
3. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd shoe-api
   ```

### Step 2: Install Dependencies

**What are dependencies?** These are pre-written code packages that our API uses to function.

```bash
npm install
```

This command reads the `package.json` file and installs all required packages. You'll see a `node_modules` folder created - this contains all the dependencies.

### Step 3: Environment Configuration

**What is environment configuration?** These are settings that change based on where your app runs (development, testing, production).

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Open the `.env` file in your code editor and configure it:**

```bash
# Basic Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/shoe-store
# If using MongoDB Atlas, replace with your connection string:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shoe-store

# JWT (Authentication) Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Email Configuration (for sending emails)
EMAIL_FROM=noreply@yourstore.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary (Image Storage) - Sign up at cloudinary.com
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe (Payment Processing) - Sign up at stripe.com
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Step 4: Set Up External Services

#### Cloudinary (Image Storage)
1. Go to [cloudinary.com](https://cloudinary.com/) and create a free account
2. In your dashboard, find your Cloud Name, API Key, and API Secret
3. Add these to your `.env` file

#### Stripe (Payment Processing)
1. Go to [stripe.com](https://stripe.com/) and create an account
2. In your dashboard, go to Developers > API Keys
3. Copy your Secret Key (starts with `sk_test_`)
4. Add it to your `.env` file

#### Email Service (Gmail Example)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. Use this app password in your `.env` file

### Step 5: Initialize the Database

**What this does:** Creates the initial database structure and adds some sample data.

```bash
npm run seed
```

This command will:
- Connect to your MongoDB database
- Create necessary collections (tables)
- Add sample products, users, and categories
- Set up database indexes for better performance

### Step 6: Start the Application

```bash
npm run dev
```

**What happens when you run this:**
1. Node.js starts the Express server
2. Connects to MongoDB database
3. Connects to Redis (if configured)
4. Sets up all API routes
5. Starts listening for requests on port 5000

You should see output like:
```
🚀 Server running on port 5000
✅ MongoDB connected successfully
✅ Redis connected successfully
📊 Database seeded with sample data
```

## Understanding the Technology Stack

### Node.js
- **Purpose:** JavaScript runtime that lets you run JavaScript on servers
- **Why we use it:** Fast, efficient, and uses the same language as frontend development
- **In our project:** Powers the entire backend server

### Express.js
- **Purpose:** Web framework for Node.js
- **Why we use it:** Makes it easy to create APIs and handle HTTP requests
- **In our project:** Handles routing, middleware, and HTTP request/response

### MongoDB
- **Purpose:** NoSQL database for storing data
- **Why we use it:** Flexible schema, works well with JavaScript objects
- **In our project:** Stores users, products, orders, reviews, etc.

### Mongoose
- **Purpose:** MongoDB object modeling for Node.js
- **Why we use it:** Provides schema validation and easier database operations
- **In our project:** Defines data models and handles database queries

### Redis
- **Purpose:** In-memory data store for caching
- **Why we use it:** Makes the API faster by storing frequently accessed data in memory
- **In our project:** Caches product data, user sessions, and API responses

### JWT (JSON Web Tokens)
- **Purpose:** Secure way to transmit information between parties
- **Why we use it:** Stateless authentication that scales well
- **In our project:** User authentication and authorization

### Stripe
- **Purpose:** Payment processing platform
- **Why we use it:** Secure, reliable payment handling
- **In our project:** Processes credit card payments for orders

### Cloudinary
- **Purpose:** Cloud-based image and video management
- **Why we use it:** Handles image uploads, resizing, and CDN delivery
- **In our project:** Manages product images and user avatars

## Configuration Explained

### Environment Variables
Environment variables are settings that can change based on where your app runs:

```bash
NODE_ENV=development  # Tells the app it's in development mode
PORT=5000            # Which port the server listens on
MONGODB_URI=...      # Where to find the database
JWT_SECRET=...       # Secret key for creating authentication tokens
```

### Package.json Scripts
These are shortcuts for common tasks:

```json
{
  "scripts": {
    "start": "node src/server.js",           // Start in production
    "dev": "nodemon src/server.js",          // Start with auto-restart
    "test": "jest",                          // Run tests
    "seed": "node src/scripts/seed.js"       // Add sample data
  }
}
```

### Database Connection
The app connects to MongoDB using the connection string in `MONGODB_URI`:

```javascript
// Local MongoDB
mongodb://localhost:27017/shoe-store

// MongoDB Atlas (cloud)
mongodb+srv://username:password@cluster.mongodb.net/shoe-store
```

## Testing Your Setup

### 1. Health Check
Open your browser and go to: `http://localhost:5000/api/health`

You should see:
```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2023-07-01T10:00:00.000Z"
}
```

### 2. API Testing with Thunder Client (VS Code Extension)

1. Install Thunder Client extension in VS Code
2. Create a new request
3. Test these endpoints:

**Get Products:**
- Method: GET
- URL: `http://localhost:5000/api/products`

**Register User:**
- Method: POST
- URL: `http://localhost:5000/api/auth/register`
- Body (JSON):
```json
{
  "email": "test@example.com",
  "password": "password123",
  "profile": {
    "firstName": "Test",
    "lastName": "User"
  }
}
```

### 3. Database Verification

**Using MongoDB Compass (GUI Tool):**
1. Download MongoDB Compass from [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
2. Connect using your MongoDB URI
3. You should see a `shoe-store` database with collections like `users`, `products`, `orders`

**Using Command Line:**
```bash
mongo  # or mongosh for newer versions
use shoe-store
show collections
db.products.find().limit(5)  # Show first 5 products
```

## Common Issues and Solutions

### Issue 1: "Cannot connect to MongoDB"
**Symptoms:** Error message about MongoDB connection failure

**Solutions:**
1. **Check if MongoDB is running:**
   ```bash
   # Check if MongoDB process is running
   ps aux | grep mongod  # macOS/Linux
   # or check Windows Services for MongoDB
   ```

2. **Start MongoDB:**
   ```bash
   # macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows - MongoDB should start automatically
   ```

3. **Check connection string in .env file**
4. **For MongoDB Atlas:** Ensure your IP is whitelisted and credentials are correct

### Issue 2: "Port 5000 already in use"
**Symptoms:** Error about port being in use

**Solutions:**
1. **Change port in .env file:**
   ```bash
   PORT=3001  # or any other available port
   ```

2. **Kill process using port 5000:**
   ```bash
   # Find process using port 5000
   lsof -i :5000  # macOS/Linux
   netstat -ano | findstr :5000  # Windows
   
   # Kill the process (replace PID with actual process ID)
   kill -9 PID  # macOS/Linux
   taskkill /PID PID /F  # Windows
   ```

### Issue 3: "Module not found" errors
**Symptoms:** Error about missing modules

**Solutions:**
1. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be v18 or higher
   ```

### Issue 4: Redis connection errors
**Symptoms:** Redis connection warnings

**Solutions:**
1. **Install and start Redis:**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Make Redis optional by commenting out in .env:**
   ```bash
   # REDIS_URL=redis://localhost:6379
   ```

### Issue 5: Email sending fails
**Symptoms:** Errors when trying to send emails

**Solutions:**
1. **Use Gmail App Password instead of regular password**
2. **Enable "Less secure app access" (not recommended)**
3. **Use a different email service like SendGrid or Mailgun**

## Next Steps

### 1. Explore the API
- Use Thunder Client or Postman to test different endpoints
- Try creating users, products, and orders
- Understand the request/response format

### 2. Understand the Code Structure
```
src/
├── models/     # Database schemas (User, Product, Order, etc.)
├── routes/     # API endpoints grouped by feature
├── middleware/ # Functions that run before route handlers
├── services/   # Business logic and external API integrations
├── config/     # Configuration files for database, etc.
└── utils/      # Helper functions and utilities
```

### 3. Learn Key Concepts

**Models (Database Schemas):**
- Look at `src/models/User.js` to understand how user data is structured
- See how validation rules are defined
- Understand relationships between models

**Routes (API Endpoints):**
- Examine `src/routes/auth.js` for authentication endpoints
- See how middleware is used for authentication and validation
- Understand request handling and response formatting

**Middleware:**
- Study `src/middleware/auth.js` to understand authentication
- See how errors are handled in `src/middleware/errorHandler.js`

### 4. Customize for Your Needs
- Modify product schema to add new fields
- Add new API endpoints
- Customize email templates
- Add new user roles and permissions

### 5. Deploy Your API
Once you're comfortable with local development:
- Learn about production deployment
- Set up environment variables for production
- Configure domain and SSL certificates
- Set up monitoring and logging

### 6. Build a Frontend
Create a React, Vue, or Angular frontend that consumes this API:
- User registration and login
- Product browsing and search
- Shopping cart functionality
- Order management
- Admin dashboard

## Conclusion

Congratulations! You now have a fully functional e-commerce API running on your machine. This setup provides:

- **Complete user management** with authentication and authorization
- **Product catalog** with search and filtering
- **Shopping cart** and order processing
- **Payment integration** with Stripe
- **Review system** for products
- **Admin functionality** for managing the store
- **Real-time features** with WebSocket support
- **Comprehensive testing** suite
- **Production-ready** architecture

Take your time to explore each component, understand how they work together, and don't hesitate to experiment with the code. The best way to learn is by doing!

### Resources for Further Learning
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [MongoDB University](https://university.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [JWT.io](https://jwt.io/) - Learn about JSON Web Tokens
- [Stripe Documentation](https://stripe.com/docs)

Happy coding! 🚀
