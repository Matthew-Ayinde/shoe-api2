/**
 * Redis Configuration and Connection Management
 * 
 * This module handles Redis connection setup for caching, session storage,
 * and real-time data management. Redis is used for:
 * - API response caching
 * - Session storage
 * - Rate limiting data
 * - Real-time inventory tracking
 * - Flash sale counters
 * - User activity tracking
 */

const redis = require('redis')

/**
 * Redis Client Instance
 * Singleton pattern to ensure single connection across the application
 */
let redisClient = null

/**
 * Initialize Redis Connection
 * Creates and configures Redis client with error handling and reconnection logic
 * 
 * @returns {Promise<Object>} Redis client instance
 */
const initializeRedis = async () => {
  try {
    // Create Redis client with configuration
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        // Reconnection strategy
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis connection refused')
          return new Error('Redis connection refused')
        }
        
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error('Redis retry time exhausted')
          return new Error('Retry time exhausted')
        }
        
        if (options.attempt > 10) {
          console.error('Redis max retry attempts reached')
          return undefined
        }
        
        // Exponential backoff: 2^attempt * 100ms
        return Math.min(options.attempt * 100, 3000)
      },
      socket: {
        connectTimeout: 60000,
        lazyConnect: true,
      }
    })

    // Event handlers for connection monitoring
    redisClient.on('connect', () => {
      console.log('🔗 Redis client connected')
    })

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready')
    })

    redisClient.on('error', (err) => {
      console.error('❌ Redis client error:', err)
    })

    redisClient.on('end', () => {
      console.log('🔌 Redis client disconnected')
    })

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...')
    })

    // Connect to Redis
    await redisClient.connect()
    
    // Test connection
    await redisClient.ping()
    console.log('🏓 Redis connection test successful')

    return redisClient
  } catch (error) {
    console.error('❌ Redis initialization failed:', error)
    
    // In development, continue without Redis
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Continuing without Redis in development mode')
      return null
    }
    
    throw error
  }
}

/**
 * Get Redis Client Instance
 * Returns the existing Redis client or null if not connected
 * 
 * @returns {Object|null} Redis client instance
 */
const getRedisClient = () => {
  return redisClient
}

/**
 * Check Redis Connection Status
 * Verifies if Redis is connected and responsive
 * 
 * @returns {Promise<boolean>} Connection status
 */
const isRedisConnected = async () => {
  try {
    if (!redisClient) return false
    
    await redisClient.ping()
    return true
  } catch (error) {
    console.error('Redis connection check failed:', error)
    return false
  }
}

/**
 * Close Redis Connection
 * Gracefully closes the Redis connection
 * 
 * @returns {Promise<void>}
 */
const closeRedisConnection = async () => {
  try {
    if (redisClient) {
      await redisClient.quit()
      redisClient = null
      console.log('✅ Redis connection closed gracefully')
    }
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error)
  }
}

/**
 * Redis Key Patterns
 * Standardized key naming conventions for different data types
 */
const REDIS_KEYS = {
  // Cache keys
  PRODUCT_CACHE: (id) => `cache:product:${id}`,
  PRODUCTS_LIST_CACHE: (params) => `cache:products:${Buffer.from(JSON.stringify(params)).toString('base64')}`,
  USER_CACHE: (id) => `cache:user:${id}`,
  
  // Session keys
  USER_SESSION: (sessionId) => `session:${sessionId}`,
  
  // Rate limiting keys
  RATE_LIMIT: (ip) => `rate_limit:${ip}`,
  
  // Real-time data keys
  INVENTORY: (productId, variantId) => `inventory:${productId}:${variantId}`,
  FLASH_SALE_COUNTER: (saleId) => `flash_sale:${saleId}:counter`,
  
  // User activity keys
  USER_ACTIVITY: (userId) => `activity:${userId}`,
  CART_SESSION: (sessionId) => `cart:${sessionId}`,
  
  // Analytics keys
  DAILY_STATS: (date) => `stats:daily:${date}`,
  PRODUCT_VIEWS: (productId) => `views:product:${productId}`,
}

/**
 * Default TTL Values (in seconds)
 * Time-to-live values for different types of cached data
 */
const DEFAULT_TTL = {
  PRODUCT_CACHE: 3600,        // 1 hour
  PRODUCTS_LIST: 1800,        // 30 minutes
  USER_CACHE: 1800,           // 30 minutes
  SESSION: 86400,             // 24 hours
  RATE_LIMIT: 900,            // 15 minutes
  INVENTORY: 300,             // 5 minutes
  FLASH_SALE: 60,             // 1 minute
  USER_ACTIVITY: 3600,        // 1 hour
  CART_SESSION: 86400,        // 24 hours
  DAILY_STATS: 86400,         // 24 hours
  PRODUCT_VIEWS: 3600,        // 1 hour
}

/**
 * Cache Helper Functions
 * Utility functions for common caching operations
 */

/**
 * Set Cache with TTL
 * Stores data in Redis with automatic expiration
 * 
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>} Success status
 */
const setCache = async (key, data, ttl = DEFAULT_TTL.PRODUCT_CACHE) => {
  try {
    if (!redisClient) return false
    
    const serializedData = JSON.stringify(data)
    await redisClient.setEx(key, ttl, serializedData)
    return true
  } catch (error) {
    console.error('Redis setCache error:', error)
    return false
  }
}

/**
 * Get Cache
 * Retrieves and deserializes data from Redis
 * 
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null
 */
const getCache = async (key) => {
  try {
    if (!redisClient) return null
    
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Redis getCache error:', error)
    return null
  }
}

/**
 * Delete Cache
 * Removes data from Redis cache
 * 
 * @param {string|string[]} keys - Cache key(s) to delete
 * @returns {Promise<boolean>} Success status
 */
const deleteCache = async (keys) => {
  try {
    if (!redisClient) return false
    
    const keyArray = Array.isArray(keys) ? keys : [keys]
    await redisClient.del(keyArray)
    return true
  } catch (error) {
    console.error('Redis deleteCache error:', error)
    return false
  }
}

/**
 * Increment Counter
 * Atomically increments a counter in Redis
 * 
 * @param {string} key - Counter key
 * @param {number} increment - Increment value (default: 1)
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<number|null>} New counter value
 */
const incrementCounter = async (key, increment = 1, ttl = null) => {
  try {
    if (!redisClient) return null
    
    const newValue = await redisClient.incrBy(key, increment)
    
    if (ttl && newValue === increment) {
      // Set TTL only on first increment
      await redisClient.expire(key, ttl)
    }
    
    return newValue
  } catch (error) {
    console.error('Redis incrementCounter error:', error)
    return null
  }
}

module.exports = {
  initializeRedis,
  getRedisClient,
  isRedisConnected,
  closeRedisConnection,
  REDIS_KEYS,
  DEFAULT_TTL,
  setCache,
  getCache,
  deleteCache,
  incrementCounter,
}
