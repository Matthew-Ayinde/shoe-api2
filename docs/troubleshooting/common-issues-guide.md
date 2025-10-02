# Common Issues and Troubleshooting Guide

## Overview

This guide provides solutions to common issues you might encounter while setting up, developing, or deploying the Shoe Store API. Each issue includes symptoms, causes, and step-by-step solutions.

## Table of Contents

1. [Installation and Setup Issues](#installation-and-setup-issues)
2. [Database Connection Issues](#database-connection-issues)
3. [Authentication and Authorization Issues](#authentication-and-authorization-issues)
4. [API and Route Issues](#api-and-route-issues)
5. [Performance Issues](#performance-issues)
6. [Deployment Issues](#deployment-issues)
7. [Testing Issues](#testing-issues)

## Installation and Setup Issues

### Issue 1: Node.js Version Compatibility

**Symptoms:**
- `npm install` fails with version errors
- Application crashes on startup
- Syntax errors with modern JavaScript features

**Causes:**
- Using Node.js version < 18
- Outdated npm version
- Package compatibility issues

**Solutions:**
```bash
# Check current versions
node --version
npm --version

# Update Node.js to latest LTS
# Option 1: Download from nodejs.org
# Option 2: Using nvm (recommended)
nvm install --lts
nvm use --lts

# Update npm
npm install -g npm@latest

# Clear npm cache if issues persist
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: Permission Errors on Installation

**Symptoms:**
- `EACCES` permission errors during npm install
- Cannot write to global directories
- Installation fails with permission denied

**Solutions:**

#### For macOS/Linux:
```bash
# Option 1: Use nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node

# Option 2: Change npm default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 3: Fix permissions (not recommended)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

#### For Windows:
```powershell
# Run PowerShell as Administrator
# Or use Chocolatey
choco install nodejs

# Or use Windows Package Manager
winget install OpenJS.NodeJS
```

### Issue 3: Environment Variables Not Loading

**Symptoms:**
- `undefined` values for environment variables
- Application uses default values instead of .env values
- Configuration errors on startup

**Solutions:**
```bash
# Check if .env file exists
ls -la .env

# Copy from example if missing
cp .env.example .env

# Verify .env file format (no spaces around =)
# Correct: NODE_ENV=development
# Incorrect: NODE_ENV = development

# Check if dotenv is loaded early in app.js
# Should be at the top of the file
require('dotenv').config()

# For Windows, check file encoding (should be UTF-8)
# Use notepad++ or VS Code to check/convert encoding
```

## Database Connection Issues

### Issue 1: MongoDB Connection Failed

**Symptoms:**
- `MongoNetworkError: failed to connect to server`
- `ECONNREFUSED` errors
- Application hangs on database connection

**Diagnosis:**
```bash
# Check if MongoDB is running
# macOS/Linux:
ps aux | grep mongod
sudo systemctl status mongod

# Windows:
net start | findstr MongoDB
sc query MongoDB
```

**Solutions:**

#### Start MongoDB Service:
```bash
# macOS (Homebrew):
brew services start mongodb-community

# Linux (systemd):
sudo systemctl start mongod
sudo systemctl enable mongod

# Windows:
net start MongoDB
# Or use Services.msc GUI
```

#### Check MongoDB Configuration:
```bash
# Check MongoDB logs
# Linux: /var/log/mongodb/mongod.log
# macOS: /usr/local/var/log/mongodb/mongo.log
# Windows: C:\Program Files\MongoDB\Server\6.0\log\mongod.log

tail -f /var/log/mongodb/mongod.log

# Check MongoDB configuration
# Linux: /etc/mongod.conf
# macOS: /usr/local/etc/mongod.conf
# Windows: C:\Program Files\MongoDB\Server\6.0\bin\mongod.cfg
```

#### Fix Connection String:
```javascript
// Check connection string format
// Correct formats:
mongodb://localhost:27017/shoe-ecommerce
mongodb://username:password@localhost:27017/shoe-ecommerce
mongodb+srv://username:password@cluster.mongodb.net/shoe-ecommerce

// Common mistakes:
// - Missing database name
// - Wrong port (default is 27017)
// - Special characters in password not URL encoded
```

### Issue 2: Redis Connection Issues

**Symptoms:**
- `ECONNREFUSED` on Redis connection
- Session storage not working
- Cache operations failing

**Solutions:**
```bash
# Check if Redis is running
redis-cli ping
# Should return "PONG"

# Start Redis service
# macOS:
brew services start redis

# Linux:
sudo systemctl start redis
sudo systemctl enable redis

# Windows (if using WSL):
sudo service redis-server start

# Check Redis configuration
redis-cli config get "*"

# Test Redis connection
redis-cli
> set test "hello"
> get test
> exit
```

## Authentication and Authorization Issues

### Issue 1: JWT Token Issues

**Symptoms:**
- "Invalid token" errors
- Users getting logged out immediately
- Authentication middleware failing

**Diagnosis:**
```bash
# Check JWT secret configuration
echo $JWT_SECRET

# Verify token format in requests
# Should be: Authorization: Bearer <token>
```

**Solutions:**
```javascript
// Check JWT secret is set and consistent
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

// Verify token generation
const jwt = require('jsonwebtoken')
const token = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET, { expiresIn: '7d' })
console.log('Generated token:', token)

// Verify token validation
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  console.log('Decoded token:', decoded)
} catch (error) {
  console.error('Token verification failed:', error.message)
}
```

### Issue 2: Password Hashing Issues

**Symptoms:**
- Users cannot log in with correct passwords
- Password comparison always fails
- bcrypt errors

**Solutions:**
```javascript
// Check bcrypt installation
npm list bcrypt

// Reinstall bcrypt if needed
npm uninstall bcrypt
npm install bcrypt

// Test password hashing
const bcrypt = require('bcrypt')

const testPassword = async () => {
  const password = 'testpassword'
  const hash = await bcrypt.hash(password, 12)
  console.log('Hash:', hash)
  
  const isValid = await bcrypt.compare(password, hash)
  console.log('Password valid:', isValid)
}

testPassword()
```

## API and Route Issues

### Issue 1: CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Preflight requests failing
- API calls blocked by browser

**Solutions:**
```javascript
// Check CORS configuration in app.js
const cors = require('cors')

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3001', // Admin dashboard
      'http://localhost:3002'  // Staff dashboard
    ]
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
```

### Issue 2: Route Not Found (404 Errors)

**Symptoms:**
- API endpoints return 404
- Routes not being matched
- Middleware not executing

**Diagnosis:**
```bash
# Check route registration order in app.js
# Routes should be registered before error handlers

# Verify route paths
curl -X GET http://localhost:5000/api/products
curl -X GET http://localhost:5000/api/health

# Check for typos in route definitions
grep -r "router\." src/routes/
```

**Solutions:**
```javascript
// Ensure routes are registered in correct order
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
// ... other routes

// 404 handler should be AFTER all routes
app.use(notFound)
app.use(errorHandler)

// Check route file exports
// routes/products.js should have:
module.exports = router

// Check route definitions
router.get('/', getAllProducts)  // /api/products/
router.get('/:id', getProduct)   // /api/products/:id
```

### Issue 3: Request Body Not Parsed

**Symptoms:**
- `req.body` is undefined
- POST/PUT requests fail
- JSON parsing errors

**Solutions:**
```javascript
// Ensure body parsing middleware is configured
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Check Content-Type header in requests
// Should be: Content-Type: application/json

// Test with curl
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Performance Issues

### Issue 1: Slow Database Queries

**Symptoms:**
- API responses are slow
- Database timeouts
- High CPU usage

**Diagnosis:**
```javascript
// Enable MongoDB query logging
mongoose.set('debug', true)

// Check for missing indexes
db.products.getIndexes()
db.users.getIndexes()
db.orders.getIndexes()

// Analyze slow queries
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

**Solutions:**
```javascript
// Add missing indexes
// In your models:
productSchema.index({ name: 'text', description: 'text', brand: 'text' })
productSchema.index({ brand: 1, category: 1 })
productSchema.index({ 'variants.price': 1 })

userSchema.index({ email: 1 })
orderSchema.index({ user: 1, createdAt: -1 })

// Use lean() for read-only queries
const products = await Product.find().lean()

// Use projection to limit fields
const products = await Product.find().select('name brand price')

// Implement pagination
const products = await Product.find()
  .skip((page - 1) * limit)
  .limit(limit)
```

### Issue 2: Memory Leaks

**Symptoms:**
- Increasing memory usage over time
- Application crashes with out of memory errors
- Slow performance after running for a while

**Diagnosis:**
```javascript
// Monitor memory usage
const monitorMemory = () => {
  const usage = process.memoryUsage()
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  })
}

setInterval(monitorMemory, 60000) // Every minute
```

**Solutions:**
```javascript
// Close database connections properly
process.on('SIGTERM', async () => {
  await mongoose.connection.close()
  process.exit(0)
})

// Use connection pooling
mongoose.connect(uri, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})

// Avoid memory leaks in event listeners
// Remove listeners when done
emitter.removeListener('event', handler)

// Use streams for large data processing
const cursor = Model.find().cursor()
cursor.on('data', (doc) => {
  // Process document
})
```

## Deployment Issues

### Issue 1: Environment Variables in Production

**Symptoms:**
- Application uses development values in production
- Configuration errors in deployed app
- Features not working as expected

**Solutions:**
```bash
# Verify environment variables are set
printenv | grep NODE_ENV
printenv | grep MONGODB_URI

# For Heroku:
heroku config:get NODE_ENV
heroku config:set NODE_ENV=production

# For Docker:
docker run --env-file .env.production your-app

# For PM2:
pm2 start ecosystem.config.js --env production
```

### Issue 2: Build Failures

**Symptoms:**
- Docker build fails
- Dependencies not installing
- Application won't start

**Solutions:**
```dockerfile
# Use specific Node.js version
FROM node:18-alpine

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

## Testing Issues

### Issue 1: Tests Failing in CI

**Symptoms:**
- Tests pass locally but fail in CI
- Timeout errors in CI
- Database connection issues in tests

**Solutions:**
```javascript
// Increase test timeouts for CI
// jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js']
}

// Use test database
// tests/setup.js
process.env.NODE_ENV = 'test'
process.env.MONGODB_URI = 'mongodb://localhost:27017/shoe-ecommerce-test'

// Clean up after tests
afterEach(async () => {
  await User.deleteMany({})
  await Product.deleteMany({})
  await Order.deleteMany({})
})
```

### Issue 2: Mock Issues

**Symptoms:**
- External API calls in tests
- Tests affecting real data
- Inconsistent test results

**Solutions:**
```javascript
// Mock external services
jest.mock('stripe', () => ({
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_test' })
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({ id: 'pi_test' })
  }
}))

// Mock email service
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}))

// Use test fixtures
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  profile: {
    firstName: 'Test',
    lastName: 'User'
  }
}
```

This troubleshooting guide covers the most common issues developers encounter when working with the Shoe Store API. For additional help, check the logs, enable debug mode, and consult the specific service documentation.
