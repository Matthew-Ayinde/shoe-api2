/**
 * Cache Service
 * 
 * Provides high-level caching functionality for the shoe ecommerce API.
 * Handles product caching, user session caching, inventory tracking,
 * and performance optimization through intelligent cache management.
 * 
 * Features:
 * - Product and product list caching
 * - User session and profile caching
 * - Inventory real-time tracking
 * - Flash sale counter management
 * - Analytics and view tracking
 * - Cache invalidation strategies
 */

const { 
  getRedisClient, 
  isRedisConnected, 
  REDIS_KEYS, 
  DEFAULT_TTL,
  setCache,
  getCache,
  deleteCache,
  incrementCounter
} = require('../config/redis')

/**
 * Product Caching Service
 * Manages caching for individual products and product lists
 */
class ProductCacheService {
  /**
   * Cache Single Product
   * Stores product data with optimized TTL based on product activity
   * 
   * @param {Object} product - Product document
   * @param {number} customTTL - Custom TTL override
   * @returns {Promise<boolean>} Success status
   */
  static async cacheProduct(product, customTTL = null) {
    try {
      const key = REDIS_KEYS.PRODUCT_CACHE(product._id)
      const ttl = customTTL || DEFAULT_TTL.PRODUCT_CACHE
      
      // Add cache metadata
      const cacheData = {
        ...product.toObject(),
        _cached_at: new Date().toISOString(),
        _cache_version: '1.0'
      }
      
      return await setCache(key, cacheData, ttl)
    } catch (error) {
      console.error('Product cache error:', error)
      return false
    }
  }

  /**
   * Get Cached Product
   * Retrieves product from cache with freshness validation
   * 
   * @param {string} productId - Product ID
   * @returns {Promise<Object|null>} Cached product or null
   */
  static async getCachedProduct(productId) {
    try {
      const key = REDIS_KEYS.PRODUCT_CACHE(productId)
      const cachedProduct = await getCache(key)
      
      if (cachedProduct) {
        // Track cache hit
        await this.trackProductView(productId)
        return cachedProduct
      }
      
      return null
    } catch (error) {
      console.error('Get cached product error:', error)
      return null
    }
  }

  /**
   * Cache Product List
   * Caches paginated product lists with search/filter parameters
   * 
   * @param {Object} params - Query parameters
   * @param {Array} products - Product list
   * @param {Object} pagination - Pagination metadata
   * @returns {Promise<boolean>} Success status
   */
  static async cacheProductList(params, products, pagination) {
    try {
      const key = REDIS_KEYS.PRODUCTS_LIST_CACHE(params)
      const cacheData = {
        products,
        pagination,
        params,
        _cached_at: new Date().toISOString()
      }
      
      return await setCache(key, cacheData, DEFAULT_TTL.PRODUCTS_LIST)
    } catch (error) {
      console.error('Product list cache error:', error)
      return false
    }
  }

  /**
   * Get Cached Product List
   * Retrieves cached product list matching query parameters
   * 
   * @param {Object} params - Query parameters
   * @returns {Promise<Object|null>} Cached product list or null
   */
  static async getCachedProductList(params) {
    try {
      const key = REDIS_KEYS.PRODUCTS_LIST_CACHE(params)
      return await getCache(key)
    } catch (error) {
      console.error('Get cached product list error:', error)
      return null
    }
  }

  /**
   * Invalidate Product Cache
   * Removes product from cache and related cached lists
   * 
   * @param {string} productId - Product ID
   * @returns {Promise<boolean>} Success status
   */
  static async invalidateProductCache(productId) {
    try {
      const redisClient = getRedisClient()
      if (!redisClient) return false

      // Delete individual product cache
      const productKey = REDIS_KEYS.PRODUCT_CACHE(productId)
      await deleteCache(productKey)

      // Find and delete related product list caches
      const listKeys = await redisClient.keys('cache:products:*')
      if (listKeys.length > 0) {
        await deleteCache(listKeys)
      }

      return true
    } catch (error) {
      console.error('Invalidate product cache error:', error)
      return false
    }
  }

  /**
   * Track Product View
   * Increments product view counter for analytics
   * 
   * @param {string} productId - Product ID
   * @returns {Promise<number|null>} New view count
   */
  static async trackProductView(productId) {
    try {
      const key = REDIS_KEYS.PRODUCT_VIEWS(productId)
      return await incrementCounter(key, 1, DEFAULT_TTL.PRODUCT_VIEWS)
    } catch (error) {
      console.error('Track product view error:', error)
      return null
    }
  }

  /**
   * Get Product View Count
   * Retrieves current view count for a product
   * 
   * @param {string} productId - Product ID
   * @returns {Promise<number>} View count
   */
  static async getProductViewCount(productId) {
    try {
      const redisClient = getRedisClient()
      if (!redisClient) return 0

      const key = REDIS_KEYS.PRODUCT_VIEWS(productId)
      const count = await redisClient.get(key)
      return parseInt(count) || 0
    } catch (error) {
      console.error('Get product view count error:', error)
      return 0
    }
  }
}

/**
 * User Caching Service
 * Manages user session and profile caching
 */
class UserCacheService {
  /**
   * Cache User Profile
   * Stores user profile data with sensitive information filtered
   * 
   * @param {Object} user - User document
   * @returns {Promise<boolean>} Success status
   */
  static async cacheUser(user) {
    try {
      const key = REDIS_KEYS.USER_CACHE(user._id)
      
      // Filter sensitive data
      const cacheData = {
        _id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        addresses: user.addresses,
        preferences: user.preferences,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        _cached_at: new Date().toISOString()
      }
      
      return await setCache(key, cacheData, DEFAULT_TTL.USER_CACHE)
    } catch (error) {
      console.error('User cache error:', error)
      return false
    }
  }

  /**
   * Get Cached User
   * Retrieves user profile from cache
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Cached user or null
   */
  static async getCachedUser(userId) {
    try {
      const key = REDIS_KEYS.USER_CACHE(userId)
      return await getCache(key)
    } catch (error) {
      console.error('Get cached user error:', error)
      return null
    }
  }

  /**
   * Invalidate User Cache
   * Removes user from cache when profile is updated
   * 
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async invalidateUserCache(userId) {
    try {
      const key = REDIS_KEYS.USER_CACHE(userId)
      return await deleteCache(key)
    } catch (error) {
      console.error('Invalidate user cache error:', error)
      return false
    }
  }

  /**
   * Track User Activity
   * Records user activity for session management
   * 
   * @param {string} userId - User ID
   * @param {string} activity - Activity type
   * @returns {Promise<boolean>} Success status
   */
  static async trackUserActivity(userId, activity) {
    try {
      const key = REDIS_KEYS.USER_ACTIVITY(userId)
      const activityData = {
        activity,
        timestamp: new Date().toISOString(),
        ip: null // Can be added from request
      }
      
      return await setCache(key, activityData, DEFAULT_TTL.USER_ACTIVITY)
    } catch (error) {
      console.error('Track user activity error:', error)
      return false
    }
  }
}

/**
 * Inventory Caching Service
 * Manages real-time inventory tracking and updates
 */
class InventoryCacheService {
  /**
   * Update Inventory Cache
   * Updates cached inventory levels for product variants
   * 
   * @param {string} productId - Product ID
   * @param {string} variantId - Variant ID
   * @param {number} stock - Current stock level
   * @returns {Promise<boolean>} Success status
   */
  static async updateInventory(productId, variantId, stock) {
    try {
      const key = REDIS_KEYS.INVENTORY(productId, variantId)
      const inventoryData = {
        productId,
        variantId,
        stock,
        lastUpdated: new Date().toISOString()
      }
      
      return await setCache(key, inventoryData, DEFAULT_TTL.INVENTORY)
    } catch (error) {
      console.error('Update inventory cache error:', error)
      return false
    }
  }

  /**
   * Get Cached Inventory
   * Retrieves current inventory level from cache
   * 
   * @param {string} productId - Product ID
   * @param {string} variantId - Variant ID
   * @returns {Promise<Object|null>} Inventory data or null
   */
  static async getCachedInventory(productId, variantId) {
    try {
      const key = REDIS_KEYS.INVENTORY(productId, variantId)
      return await getCache(key)
    } catch (error) {
      console.error('Get cached inventory error:', error)
      return null
    }
  }

  /**
   * Reserve Inventory
   * Temporarily reserves inventory for order processing
   * 
   * @param {string} productId - Product ID
   * @param {string} variantId - Variant ID
   * @param {number} quantity - Quantity to reserve
   * @returns {Promise<boolean>} Success status
   */
  static async reserveInventory(productId, variantId, quantity) {
    try {
      const redisClient = getRedisClient()
      if (!redisClient) return false

      const key = REDIS_KEYS.INVENTORY(productId, variantId)
      const reservationKey = `${key}:reserved`
      
      // Use Redis transaction for atomic operation
      const multi = redisClient.multi()
      multi.incrBy(reservationKey, quantity)
      multi.expire(reservationKey, 600) // 10 minute reservation
      
      await multi.exec()
      return true
    } catch (error) {
      console.error('Reserve inventory error:', error)
      return false
    }
  }
}

/**
 * Flash Sale Caching Service
 * Manages flash sale counters and real-time updates
 */
class FlashSaleCacheService {
  /**
   * Initialize Flash Sale Counter
   * Sets up counter for flash sale tracking
   * 
   * @param {string} saleId - Flash sale ID
   * @param {number} initialCount - Initial counter value
   * @returns {Promise<boolean>} Success status
   */
  static async initializeCounter(saleId, initialCount = 0) {
    try {
      const key = REDIS_KEYS.FLASH_SALE_COUNTER(saleId)
      return await setCache(key, initialCount, DEFAULT_TTL.FLASH_SALE)
    } catch (error) {
      console.error('Initialize flash sale counter error:', error)
      return false
    }
  }

  /**
   * Increment Flash Sale Counter
   * Atomically increments flash sale purchase counter
   * 
   * @param {string} saleId - Flash sale ID
   * @param {number} increment - Increment value
   * @returns {Promise<number|null>} New counter value
   */
  static async incrementCounter(saleId, increment = 1) {
    try {
      const key = REDIS_KEYS.FLASH_SALE_COUNTER(saleId)
      return await incrementCounter(key, increment, DEFAULT_TTL.FLASH_SALE)
    } catch (error) {
      console.error('Increment flash sale counter error:', error)
      return null
    }
  }

  /**
   * Get Flash Sale Counter
   * Retrieves current flash sale counter value
   * 
   * @param {string} saleId - Flash sale ID
   * @returns {Promise<number>} Counter value
   */
  static async getCounter(saleId) {
    try {
      const redisClient = getRedisClient()
      if (!redisClient) return 0

      const key = REDIS_KEYS.FLASH_SALE_COUNTER(saleId)
      const count = await redisClient.get(key)
      return parseInt(count) || 0
    } catch (error) {
      console.error('Get flash sale counter error:', error)
      return 0
    }
  }
}

module.exports = {
  ProductCacheService,
  UserCacheService,
  InventoryCacheService,
  FlashSaleCacheService,
}
