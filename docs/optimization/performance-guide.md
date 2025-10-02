# Performance Optimization Guide

## Overview

This guide covers comprehensive performance optimizations implemented in the Shoe Store API, including database optimizations, caching strategies, code optimizations, and monitoring techniques.

## Database Optimizations

### MongoDB Indexes

#### Product Collection Indexes
```javascript
// Text search index for product discovery
productSchema.index({ 
  name: "text", 
  description: "text", 
  brand: "text" 
}, {
  weights: {
    name: 10,        // Product name is most important for search
    brand: 5,        // Brand is moderately important
    description: 1   // Description has lowest weight
  }
})

// Compound indexes for common filter combinations
productSchema.index({ brand: 1, category: 1 })
productSchema.index({ "variants.price": 1 })
productSchema.index({ isActive: 1, isFeatured: 1 })
productSchema.index({ gender: 1, category: 1 })
```

#### User Collection Indexes
```javascript
// Authentication and lookup indexes
userSchema.index({ email: 1 })     // Unique index for fast email lookups
userSchema.index({ googleId: 1 })  // Sparse index for Google OAuth users
userSchema.index({ role: 1 })      // Index for role-based access control queries
```

#### Order Collection Indexes
```javascript
// User order history (most frequent query)
orderSchema.index({ user: 1, createdAt: -1 })
// Order number lookups
orderSchema.index({ orderNumber: 1 })
// Status-based filtering
orderSchema.index({ status: 1 })
// Payment status queries
orderSchema.index({ "payment.status": 1 })
```

### Query Optimization Techniques

#### 1. Projection (Select Only Needed Fields)
```javascript
// Bad: Fetches all fields
const products = await Product.find({ category: 'running' })

// Good: Only fetch needed fields
const products = await Product.find({ category: 'running' })
  .select('name brand variants.price images.url')
```

#### 2. Population Optimization
```javascript
// Bad: Populates all user fields
const orders = await Order.find().populate('user')

// Good: Only populate needed user fields
const orders = await Order.find().populate('user', 'profile.firstName profile.lastName email')
```

#### 3. Aggregation Pipeline Optimization
```javascript
// Optimized product search with aggregation
const searchProducts = async (query, filters) => {
  const pipeline = [
    // Match stage first (uses indexes)
    { $match: { 
      isActive: true,
      ...(filters.category && { category: filters.category }),
      ...(filters.brand && { brand: filters.brand })
    }},
    
    // Text search if query provided
    ...(query ? [{ $match: { $text: { $search: query } } }] : []),
    
    // Add computed fields
    { $addFields: {
      minPrice: { $min: "$variants.price" },
      maxPrice: { $max: "$variants.price" },
      totalStock: { $sum: "$variants.stock" }
    }},
    
    // Filter by price range
    ...(filters.minPrice || filters.maxPrice ? [{
      $match: {
        ...(filters.minPrice && { minPrice: { $gte: filters.minPrice } }),
        ...(filters.maxPrice && { maxPrice: { $lte: filters.maxPrice } })
      }
    }] : []),
    
    // Sort by relevance or specified field
    { $sort: query ? { score: { $meta: "textScore" } } : { createdAt: -1 } },
    
    // Pagination
    { $skip: (filters.page - 1) * filters.limit },
    { $limit: filters.limit },
    
    // Project only needed fields
    { $project: {
      name: 1,
      slug: 1,
      brand: 1,
      category: 1,
      "images.url": 1,
      "images.alt": 1,
      minPrice: 1,
      maxPrice: 1,
      totalStock: 1,
      "ratings.average": 1,
      "ratings.count": 1
    }}
  ]
  
  return await Product.aggregate(pipeline)
}
```

## Caching Strategies

### Redis Caching Implementation

#### 1. Product Catalog Caching
```javascript
const cacheService = require('../services/cacheService')

// Cache product listings
const getProducts = async (filters) => {
  const cacheKey = `products:${JSON.stringify(filters)}`
  
  // Try to get from cache first
  let products = await cacheService.get(cacheKey)
  
  if (!products) {
    // Fetch from database
    products = await Product.find(filters)
      .select('name brand variants.price images.url')
      .limit(20)
    
    // Cache for 5 minutes
    await cacheService.set(cacheKey, products, 300)
  }
  
  return products
}
```

#### 2. User Session Caching
```javascript
// Cache user data to reduce database lookups
const getUserFromCache = async (userId) => {
  const cacheKey = `user:${userId}`
  let user = await cacheService.get(cacheKey)
  
  if (!user) {
    user = await User.findById(userId).select('-password')
    if (user) {
      await cacheService.set(cacheKey, user, 3600) // 1 hour
    }
  }
  
  return user
}
```

#### 3. Cart Caching
```javascript
// Cache shopping carts for faster access
const getCartFromCache = async (userId) => {
  const cacheKey = `cart:${userId}`
  return await cacheService.get(cacheKey)
}

const updateCartCache = async (userId, cart) => {
  const cacheKey = `cart:${userId}`
  await cacheService.set(cacheKey, cart, 1800) // 30 minutes
}
```

### Cache Invalidation Strategies

#### 1. Product Cache Invalidation
```javascript
// Invalidate product caches when product is updated
productSchema.post('save', async function() {
  // Invalidate all product listing caches
  await cacheService.deletePattern('products:*')
  
  // Invalidate specific product cache
  await cacheService.delete(`product:${this._id}`)
})
```

#### 2. User Cache Invalidation
```javascript
// Invalidate user cache when user is updated
userSchema.post('save', async function() {
  await cacheService.delete(`user:${this._id}`)
})
```

## Code Optimizations

### 1. Async/Await Best Practices

#### Parallel Execution
```javascript
// Bad: Sequential execution
const user = await User.findById(userId)
const orders = await Order.find({ user: userId })
const cart = await Cart.findOne({ user: userId })

// Good: Parallel execution
const [user, orders, cart] = await Promise.all([
  User.findById(userId),
  Order.find({ user: userId }),
  Cart.findOne({ user: userId })
])
```

#### Error Handling
```javascript
// Comprehensive error handling with specific error types
const processOrder = async (orderData) => {
  try {
    // Validate inventory
    const inventoryCheck = await Promise.all(
      orderData.items.map(item => 
        Product.findById(item.productId).select('variants')
      )
    )
    
    // Process payment
    const paymentResult = await paymentService.processPayment(orderData.payment)
    
    // Create order
    const order = await Order.create(orderData)
    
    return { success: true, order }
    
  } catch (error) {
    // Log error with context
    logger.error('Order processing failed', {
      error: error.message,
      orderData: orderData,
      stack: error.stack
    })
    
    // Return specific error types
    if (error.name === 'ValidationError') {
      throw new Error('Invalid order data')
    } else if (error.code === 'INSUFFICIENT_INVENTORY') {
      throw new Error('Some items are out of stock')
    } else if (error.code === 'PAYMENT_FAILED') {
      throw new Error('Payment processing failed')
    } else {
      throw new Error('Order processing failed')
    }
  }
}
```

### 2. Memory Optimization

#### Streaming Large Datasets
```javascript
// Stream large datasets instead of loading into memory
const exportOrders = async (res) => {
  const cursor = Order.find().cursor()
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="orders.json"'
  })
  
  res.write('[')
  let first = true
  
  for (let order = await cursor.next(); order != null; order = await cursor.next()) {
    if (!first) res.write(',')
    res.write(JSON.stringify(order))
    first = false
  }
  
  res.write(']')
  res.end()
}
```

#### Pagination for Large Collections
```javascript
// Efficient pagination with cursor-based approach
const getPaginatedProducts = async (lastId, limit = 20) => {
  const query = lastId ? { _id: { $gt: lastId } } : {}
  
  const products = await Product.find(query)
    .sort({ _id: 1 })
    .limit(limit)
    .select('name brand variants.price images.url')
  
  return {
    products,
    hasMore: products.length === limit,
    lastId: products.length > 0 ? products[products.length - 1]._id : null
  }
}
```

### 3. Response Optimization

#### Compression
```javascript
// Enable gzip compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))
```

#### Response Caching Headers
```javascript
// Set appropriate cache headers
const setCacheHeaders = (req, res, next) => {
  if (req.method === 'GET') {
    // Cache static content for 1 hour
    if (req.path.includes('/api/products')) {
      res.set('Cache-Control', 'public, max-age=3600')
    }
    // Cache user-specific content for 5 minutes
    else if (req.path.includes('/api/user')) {
      res.set('Cache-Control', 'private, max-age=300')
    }
  }
  next()
}
```

## Performance Monitoring

### 1. Response Time Monitoring
```javascript
// Middleware to track response times
const responseTimeMiddleware = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent')
      })
    }
    
    // Track metrics
    metrics.recordResponseTime(req.route?.path || req.url, duration)
  })
  
  next()
}
```

### 2. Database Query Monitoring
```javascript
// Monitor MongoDB queries
mongoose.set('debug', (collectionName, method, query, doc) => {
  const start = Date.now()
  
  // Log slow queries
  process.nextTick(() => {
    const duration = Date.now() - start
    if (duration > 100) {
      logger.warn('Slow database query', {
        collection: collectionName,
        method,
        query,
        duration: `${duration}ms`
      })
    }
  })
})
```

### 3. Memory Usage Monitoring
```javascript
// Monitor memory usage
const monitorMemory = () => {
  const usage = process.memoryUsage()
  
  logger.info('Memory usage', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  })
  
  // Alert if memory usage is high
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage detected')
  }
}

// Check memory every 5 minutes
setInterval(monitorMemory, 5 * 60 * 1000)
```

## Load Testing and Benchmarking

### 1. API Endpoint Benchmarking
```bash
# Use Apache Bench for simple load testing
ab -n 1000 -c 10 http://localhost:5000/api/products

# Use Artillery for more comprehensive testing
artillery quick --count 10 --num 100 http://localhost:5000/api/products
```

### 2. Database Performance Testing
```javascript
// Benchmark database queries
const benchmarkQuery = async (queryFn, iterations = 100) => {
  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    await queryFn()
    times.push(Date.now() - start)
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  
  console.log(`Query benchmark: avg=${avg}ms, min=${min}ms, max=${max}ms`)
}

// Example usage
await benchmarkQuery(() => Product.find({ category: 'running' }).limit(20))
```

This performance guide provides comprehensive optimization strategies for the shoe store API, covering database, caching, code, and monitoring optimizations.
