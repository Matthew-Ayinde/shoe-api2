/**
 * Enhanced Socket.IO Service for Real-time Features
 *
 * Provides comprehensive real-time functionality including:
 * - User authentication and room management
 * - Real-time cart updates
 * - Live inventory tracking
 * - Order status notifications
 * - Admin dashboard updates
 * - Flash sale notifications
 * - Chat support system
 * - Product view tracking
 * - Wishlist updates
 * - Review notifications
 */

const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { SOCKET_EVENTS } = require('../utils/constants')

let io = null
const connectedUsers = new Map() // Track connected users
const adminSockets = new Set() // Track admin connections
const userSockets = new Map() // Map userId to socket IDs

/**
 * Initialize Socket.IO with comprehensive event handling
 */
const initializeSocketIO = (socketIO) => {
  io = socketIO

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select('-password')

        if (user) {
          socket.userId = user._id.toString()
          socket.userRole = user.role
          socket.user = user
        }
      }

      next()
    } catch (error) {
      // Allow anonymous connections but without user data
      next()
    }
  })

  io.on("connection", (socket) => {
    console.log(`🔌 User connected: ${socket.id}${socket.userId ? ` (User: ${socket.userId})` : ' (Anonymous)'}`)

    // Track connected user
    if (socket.userId) {
      connectedUsers.set(socket.id, {
        userId: socket.userId,
        role: socket.userRole,
        connectedAt: new Date(),
        lastActivity: new Date()
      })

      // Map user to socket for direct messaging
      if (!userSockets.has(socket.userId)) {
        userSockets.set(socket.userId, new Set())
      }
      userSockets.get(socket.userId).add(socket.id)
    }

    // Auto-join rooms based on user role and preferences
    if (socket.userId) {
      socket.join(`user_${socket.userId}`)

      if (socket.userRole === 'admin' || socket.userRole === 'staff') {
        socket.join('admin')
        adminSockets.add(socket.id)

        // Send admin dashboard data on connection
        emitAdminDashboardUpdate(socket.id)
      }
    }

    // ========================================================================
    // ROOM MANAGEMENT EVENTS
    // ========================================================================

    // Join specific rooms
    socket.on('join_room', (data) => {
      const { room, userId } = data

      // Validate room access
      if (validateRoomAccess(socket, room, userId)) {
        socket.join(room)
        socket.emit('room_joined', { room, success: true })
        console.log(`👥 Socket ${socket.id} joined room: ${room}`)
      } else {
        socket.emit('room_join_error', { room, error: 'Access denied' })
      }
    })

    // Leave specific rooms
    socket.on('leave_room', (data) => {
      const { room } = data
      socket.leave(room)
      socket.emit('room_left', { room, success: true })
      console.log(`👋 Socket ${socket.id} left room: ${room}`)
    })

    // ========================================================================
    // CART REAL-TIME EVENTS
    // ========================================================================

    // Join cart room for real-time cart updates
    socket.on('join_cart', () => {
      if (socket.userId) {
        socket.join(`cart_${socket.userId}`)
        console.log(`🛒 User ${socket.userId} joined cart room`)
      }
    })

    // Handle cart item addition
    socket.on('cart_add_item', (data) => {
      if (socket.userId) {
        // Emit to all user's connected devices
        io.to(`user_${socket.userId}`).emit('cart_updated', {
          action: 'item_added',
          item: data,
          timestamp: new Date()
        })
      }
    })

    // Handle cart item removal
    socket.on('cart_remove_item', (data) => {
      if (socket.userId) {
        io.to(`user_${socket.userId}`).emit('cart_updated', {
          action: 'item_removed',
          item: data,
          timestamp: new Date()
        })
      }
    })

    // ========================================================================
    // PRODUCT INTERACTION EVENTS
    // ========================================================================

    // Track product views for analytics
    socket.on('product_view', (data) => {
      const { productId, category, duration } = data

      // Emit to analytics room for real-time dashboard updates
      io.to('admin').emit('product_view_tracked', {
        productId,
        category,
        duration,
        userId: socket.userId || 'anonymous',
        timestamp: new Date()
      })
    })

    // Handle wishlist updates
    socket.on('wishlist_updated', (data) => {
      if (socket.userId) {
        io.to(`user_${socket.userId}`).emit('wishlist_sync', {
          action: data.action,
          productId: data.productId,
          wishlistId: data.wishlistId,
          timestamp: new Date()
        })
      }
    })

    // ========================================================================
    // CHAT AND SUPPORT EVENTS
    // ========================================================================

    // Join support chat
    socket.on('join_support_chat', (data) => {
      if (socket.userId) {
        const chatRoom = `support_${socket.userId}`
        socket.join(chatRoom)

        // Notify admins of new support request
        io.to('admin').emit('new_support_request', {
          userId: socket.userId,
          user: socket.user,
          chatRoom,
          timestamp: new Date()
        })

        socket.emit('support_chat_joined', { chatRoom })
      }
    })

    // Handle support messages
    socket.on('support_message', (data) => {
      if (socket.userId) {
        const chatRoom = `support_${socket.userId}`
        const message = {
          id: Date.now(),
          userId: socket.userId,
          user: socket.user,
          message: data.message,
          timestamp: new Date(),
          isAdmin: false
        }

        // Send to user and admins
        io.to(chatRoom).emit('support_message_received', message)
        io.to('admin').emit('support_message_received', message)
      }
    })

    // Admin response to support
    socket.on('admin_support_response', (data) => {
      if (socket.userRole === 'admin' || socket.userRole === 'staff') {
        const { userId, message, chatRoom } = data
        const response = {
          id: Date.now(),
          userId: socket.userId,
          user: socket.user,
          message,
          timestamp: new Date(),
          isAdmin: true
        }

        io.to(chatRoom || `support_${userId}`).emit('support_message_received', response)
      }
    })

    // ========================================================================
    // ACTIVITY TRACKING
    // ========================================================================

    // Update user activity
    socket.on('user_activity', () => {
      if (connectedUsers.has(socket.id)) {
        connectedUsers.get(socket.id).lastActivity = new Date()
      }
    })

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(data.room).emit('user_typing', {
        userId: socket.userId,
        user: socket.user,
        isTyping: true
      })
    })

    socket.on('typing_stop', (data) => {
      socket.to(data.room).emit('user_typing', {
        userId: socket.userId,
        user: socket.user,
        isTyping: false
      })
    })

    // ========================================================================
    // DISCONNECT HANDLING
    // ========================================================================

    socket.on("disconnect", (reason) => {
      console.log(`🔌 User disconnected: ${socket.id} (Reason: ${reason})`)

      // Clean up tracking
      if (socket.userId) {
        const userSocketSet = userSockets.get(socket.userId)
        if (userSocketSet) {
          userSocketSet.delete(socket.id)
          if (userSocketSet.size === 0) {
            userSockets.delete(socket.userId)
          }
        }
      }

      connectedUsers.delete(socket.id)
      adminSockets.delete(socket.id)

      // Notify others of user going offline
      if (socket.userId) {
        socket.broadcast.emit('user_offline', {
          userId: socket.userId,
          timestamp: new Date()
        })
      }
    })
  })

  // Set up periodic cleanup and health checks
  setInterval(() => {
    cleanupInactiveConnections()
    emitConnectionStats()
  }, 60000) // Every minute

  return io
}

/**
 * Utility Functions
 */

/**
 * Validate room access based on user role and permissions
 */
const validateRoomAccess = (socket, room, userId) => {
  // Admin and staff can access any room
  if (socket.userRole === 'admin' || socket.userRole === 'staff') {
    return true
  }

  // Users can only access their own rooms
  if (room.startsWith(`user_${socket.userId}`) || room.startsWith(`cart_${socket.userId}`)) {
    return true
  }

  // Public rooms
  const publicRooms = ['general', 'flash_sales', 'announcements']
  if (publicRooms.includes(room)) {
    return true
  }

  return false
}

/**
 * Clean up inactive connections
 */
const cleanupInactiveConnections = () => {
  const now = new Date()
  const inactiveThreshold = 30 * 60 * 1000 // 30 minutes

  for (const [socketId, userData] of connectedUsers.entries()) {
    if (now - userData.lastActivity > inactiveThreshold) {
      const socket = io.sockets.sockets.get(socketId)
      if (socket) {
        socket.disconnect(true)
      }
      connectedUsers.delete(socketId)
    }
  }
}

/**
 * Emit connection statistics to admins
 */
const emitConnectionStats = () => {
  if (adminSockets.size > 0) {
    const stats = {
      totalConnections: io.engine.clientsCount,
      authenticatedUsers: connectedUsers.size,
      adminConnections: adminSockets.size,
      timestamp: new Date()
    }

    io.to('admin').emit('connection_stats', stats)
  }
}

/**
 * Send admin dashboard update to specific socket
 */
const emitAdminDashboardUpdate = async (socketId) => {
  try {
    // This would typically fetch real dashboard data
    const dashboardData = {
      activeUsers: connectedUsers.size,
      totalConnections: io.engine.clientsCount,
      timestamp: new Date()
    }

    io.to(socketId).emit('admin_dashboard_update', dashboardData)
  } catch (error) {
    console.error('Error sending admin dashboard update:', error)
  }
}

/**
 * Public API Functions
 */

const getSocketIO = () => {
  return io
}

/**
 * Get connected users count
 */
const getConnectedUsersCount = () => {
  return connectedUsers.size
}

/**
 * Get user's active socket IDs
 */
const getUserSockets = (userId) => {
  return userSockets.get(userId) || new Set()
}

/**
 * Check if user is online
 */
const isUserOnline = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0
}

/**
 * Send message to specific user across all their devices
 */
const sendToUser = (userId, event, data) => {
  if (io && userSockets.has(userId)) {
    io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    })
    return true
  }
  return false
}

/**
 * Send message to all admin users
 */
const sendToAdmins = (event, data) => {
  if (io) {
    io.to('admin').emit(event, {
      ...data,
      timestamp: new Date()
    })
    return true
  }
  return false
}

/**
 * Broadcast message to all connected users
 */
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, {
      ...data,
      timestamp: new Date()
    })
    return true
  }
  return false
}

// ============================================================================
// ENHANCED BUSINESS EVENT EMITTERS
// ============================================================================

/**
 * Emit real-time cart updates
 */
const emitCartUpdate = (userId, cartData, action = 'updated') => {
  if (io) {
    io.to(`user_${userId}`).emit('cart_updated', {
      action,
      cart: cartData,
      timestamp: new Date()
    })

    // Also emit to cart-specific room
    io.to(`cart_${userId}`).emit('cart_sync', {
      action,
      cart: cartData,
      timestamp: new Date()
    })
  }
}

/**
 * Emit inventory update to all connected clients
 */
const emitInventoryUpdate = (productId, variant, stockChange) => {
  if (io) {
    const updateData = {
      productId,
      variant,
      stockChange,
      timestamp: new Date()
    }

    // Emit to all users
    io.emit(SOCKET_EVENTS.INVENTORY_UPDATE, updateData)

    // Emit specific event to users watching this product
    io.to(`product_${productId}`).emit('product_stock_update', updateData)
  }
}

/**
 * Emit low stock alert to admin users
 */
const emitLowStockAlert = (productData) => {
  if (io) {
    io.to("admin").emit("low_stock_alert", {
      ...productData,
      severity: productData.stock === 0 ? 'critical' : 'warning',
      timestamp: new Date(),
    })
  }
}

/**
 * Emit order status update to specific user
 */
const emitOrderStatusUpdate = (userId, orderData) => {
  if (io) {
    const updateData = {
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      status: orderData.status,
      statusHistory: orderData.statusHistory,
      estimatedDelivery: orderData.estimatedDelivery,
      tracking: orderData.tracking,
      timestamp: new Date()
    }

    io.to(`user_${userId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATE, updateData)

    // Also send push notification data for mobile apps
    io.to(`user_${userId}`).emit('push_notification_data', {
      title: `Order ${orderData.orderNumber} ${orderData.status}`,
      body: `Your order status has been updated to ${orderData.status}`,
      data: updateData
    })
  }
}

/**
 * Emit flash sale start/end notifications
 */
const emitFlashSaleUpdate = (saleData, event) => {
  if (io) {
    const eventData = {
      saleId: saleData._id,
      name: saleData.name,
      description: saleData.description,
      discountPercentage: saleData.discountPercentage,
      startTime: saleData.startTime,
      endTime: saleData.endTime,
      products: saleData.products,
      event, // 'start', 'end', 'update'
      timestamp: new Date()
    }

    // Emit to all users
    io.emit(`flash_sale_${event}`, eventData)

    // Emit to flash sale specific room
    io.to('flash_sales').emit('flash_sale_update', eventData)
  }
}

/**
 * Emit new order notification to admin
 */
const emitNewOrderNotification = (orderData) => {
  if (io) {
    const notificationData = {
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      customer: orderData.user,
      totalAmount: orderData.pricing.total,
      itemCount: orderData.items.length,
      status: orderData.status,
      timestamp: new Date()
    }

    io.to("admin").emit(SOCKET_EVENTS.NEW_ORDER, notificationData)

    // Update admin dashboard counters
    io.to("admin").emit('dashboard_counter_update', {
      type: 'new_order',
      increment: 1,
      data: notificationData
    })
  }
}

/**
 * Emit product review notifications
 */
const emitNewReviewNotification = (reviewData) => {
  if (io) {
    const notificationData = {
      reviewId: reviewData._id,
      productId: reviewData.product,
      productName: reviewData.productName,
      rating: reviewData.rating,
      title: reviewData.title,
      user: reviewData.user,
      timestamp: new Date()
    }

    // Notify admins for moderation
    io.to('admin').emit('new_review_notification', notificationData)

    // Notify users viewing the product
    io.to(`product_${reviewData.product}`).emit('product_review_added', notificationData)
  }
}

/**
 * Emit wishlist updates
 */
const emitWishlistUpdate = (userId, wishlistData, action) => {
  if (io) {
    io.to(`user_${userId}`).emit('wishlist_updated', {
      action, // 'item_added', 'item_removed', 'wishlist_created', etc.
      wishlist: wishlistData,
      timestamp: new Date()
    })
  }
}

/**
 * Emit price drop notifications
 */
const emitPriceDropNotification = (userIds, productData) => {
  if (io && Array.isArray(userIds)) {
    const notificationData = {
      productId: productData._id,
      productName: productData.name,
      oldPrice: productData.oldPrice,
      newPrice: productData.newPrice,
      discountPercentage: productData.discountPercentage,
      timestamp: new Date()
    }

    userIds.forEach(userId => {
      io.to(`user_${userId}`).emit('price_drop_alert', notificationData)
    })
  }
}

/**
 * Emit back in stock notifications
 */
const emitBackInStockNotification = (userIds, productData) => {
  if (io && Array.isArray(userIds)) {
    const notificationData = {
      productId: productData._id,
      productName: productData.name,
      variant: productData.variant,
      stock: productData.stock,
      timestamp: new Date()
    }

    userIds.forEach(userId => {
      io.to(`user_${userId}`).emit('back_in_stock_alert', notificationData)
    })
  }
}

module.exports = {
  initializeSocketIO,
  getSocketIO,
  getConnectedUsersCount,
  getUserSockets,
  isUserOnline,
  sendToUser,
  sendToAdmins,
  broadcast,
  emitCartUpdate,
  emitInventoryUpdate,
  emitLowStockAlert,
  emitOrderStatusUpdate,
  emitFlashSaleUpdate,
  emitNewOrderNotification,
  emitNewReviewNotification,
  emitWishlistUpdate,
  emitPriceDropNotification,
  emitBackInStockNotification,
}
