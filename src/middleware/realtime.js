/**
 * Real-time Middleware
 * 
 * Middleware functions that integrate Socket.IO real-time features
 * with HTTP route handlers. This allows automatic real-time updates
 * when certain actions are performed via the REST API.
 * 
 * Features:
 * - Automatic real-time notifications for CRUD operations
 * - Cart synchronization across devices
 * - Inventory updates
 * - Order status broadcasting
 * - Admin dashboard updates
 * - User activity tracking
 */

const {
  emitCartUpdate,
  emitInventoryUpdate,
  emitOrderStatusUpdate,
  emitNewOrderNotification,
  emitNewReviewNotification,
  emitWishlistUpdate,
  sendToAdmins,
  broadcast
} = require('../services/socketService')

/**
 * Middleware to emit cart updates after cart operations
 */
const emitCartUpdates = (action = 'updated') => {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json

    // Override json method to emit socket event after response
    res.json = function(data) {
      // Call original json method
      originalJson.call(this, data)

      // Emit cart update if operation was successful
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const cartData = data.data?.cart || data.cart
        if (cartData) {
          emitCartUpdate(req.user._id.toString(), cartData, action)
        }
      }
    }

    next()
  }
}

/**
 * Middleware to emit inventory updates after stock changes
 */
const emitInventoryUpdates = () => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      // Emit inventory update if stock was modified
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const productData = data.data?.product || data.product
        if (productData && req.stockChange) {
          emitInventoryUpdate(
            productData._id,
            req.stockChange.variant,
            req.stockChange.amount
          )
        }
      }
    }

    next()
  }
}

/**
 * Middleware to emit order updates after order operations
 */
const emitOrderUpdates = (isNewOrder = false) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const orderData = data.data?.order || data.order
        
        if (orderData) {
          if (isNewOrder) {
            // Emit new order notification to admins
            emitNewOrderNotification(orderData)
          } else {
            // Emit order status update to user
            const userId = orderData.user?._id || orderData.user
            if (userId) {
              emitOrderStatusUpdate(userId.toString(), orderData)
            }
          }
        }
      }
    }

    next()
  }
}

/**
 * Middleware to emit review notifications after review operations
 */
const emitReviewUpdates = () => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const reviewData = data.data?.review || data.review
        
        if (reviewData && req.method === 'POST') {
          // New review created
          emitNewReviewNotification(reviewData)
        }
      }
    }

    next()
  }
}

/**
 * Middleware to emit wishlist updates after wishlist operations
 */
const emitWishlistUpdates = (action) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const wishlistData = data.data?.wishlist || data.wishlist
        
        if (wishlistData) {
          emitWishlistUpdate(req.user._id.toString(), wishlistData, action)
        }
      }
    }

    next()
  }
}

/**
 * Middleware to emit admin notifications for important events
 */
const emitAdminNotifications = (eventType, getMessage) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const message = typeof getMessage === 'function' ? getMessage(data, req) : getMessage
        
        sendToAdmins('admin_notification', {
          type: eventType,
          message,
          data: data.data || data,
          user: req.user ? {
            id: req.user._id,
            email: req.user.email,
            name: `${req.user.profile.firstName} ${req.user.profile.lastName}`
          } : null,
          timestamp: new Date()
        })
      }
    }

    next()
  }
}

/**
 * Middleware to broadcast public announcements
 */
const broadcastAnnouncement = (getAnnouncement) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const announcement = typeof getAnnouncement === 'function' 
          ? getAnnouncement(data, req) 
          : getAnnouncement
        
        if (announcement) {
          broadcast('public_announcement', announcement)
        }
      }
    }

    next()
  }
}

/**
 * Middleware to track user activity for real-time analytics
 */
const trackUserActivity = (activityType) => {
  return (req, res, next) => {
    // Track activity before processing request
    if (req.user) {
      sendToAdmins('user_activity_tracked', {
        userId: req.user._id,
        activityType,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date()
      })
    }

    next()
  }
}

/**
 * Middleware to emit real-time dashboard updates
 */
const emitDashboardUpdates = (metricType, getValue) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const value = typeof getValue === 'function' ? getValue(data, req) : getValue
        
        sendToAdmins('dashboard_metric_update', {
          metric: metricType,
          value,
          timestamp: new Date()
        })
      }
    }

    next()
  }
}

/**
 * Middleware to handle real-time product view tracking
 */
const trackProductViews = () => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300 && req.params.id) {
        const productData = data.data?.product || data.product
        
        if (productData) {
          // Emit to admin dashboard for real-time analytics
          sendToAdmins('product_view_tracked', {
            productId: productData._id,
            productName: productData.name,
            category: productData.category,
            userId: req.user?._id || 'anonymous',
            timestamp: new Date()
          })
        }
      }
    }

    next()
  }
}

/**
 * Middleware to emit flash sale updates
 */
const emitFlashSaleUpdates = (eventType) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const saleData = data.data?.flashSale || data.flashSale
        
        if (saleData) {
          const { emitFlashSaleUpdate } = require('../services/socketService')
          emitFlashSaleUpdate(saleData, eventType)
        }
      }
    }

    next()
  }
}

/**
 * Utility function to create custom real-time middleware
 */
const createRealtimeMiddleware = (emitFunction, options = {}) => {
  return (req, res, next) => {
    const originalJson = res.json

    res.json = function(data) {
      originalJson.call(this, data)

      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          emitFunction(data, req, options)
        } catch (error) {
          console.error('Error in custom realtime middleware:', error)
        }
      }
    }

    next()
  }
}

module.exports = {
  emitCartUpdates,
  emitInventoryUpdates,
  emitOrderUpdates,
  emitReviewUpdates,
  emitWishlistUpdates,
  emitAdminNotifications,
  broadcastAnnouncement,
  trackUserActivity,
  emitDashboardUpdates,
  trackProductViews,
  emitFlashSaleUpdates,
  createRealtimeMiddleware
}
