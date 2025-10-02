# Real-time Socket.IO Events Documentation

## Overview

The Shoe Store API provides comprehensive real-time functionality through Socket.IO. This document details all available events, their payloads, and how to integrate them into your frontend applications.

## Connection Setup

### Client-Side Connection

```javascript
import io from 'socket.io-client'

// Connect with authentication
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('authToken') // JWT token
  },
  transports: ['websocket', 'polling']
})

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason)
})
```

### Authentication

The Socket.IO server supports JWT authentication through the `auth.token` parameter or `Authorization` header. Authenticated users get access to user-specific events and rooms.

## Room Management

### Joining Rooms

```javascript
// Join user-specific room (automatic for authenticated users)
socket.emit('join_room', { 
  room: 'user_12345',
  userId: '12345'
})

// Join cart room for real-time cart updates
socket.emit('join_cart')

// Join product room for stock updates
socket.emit('join_room', { 
  room: 'product_64a1b2c3d4e5f6789012345'
})

// Admin users can join admin room
socket.emit('join_room', { 
  room: 'admin'
})
```

### Room Events

```javascript
// Room joined successfully
socket.on('room_joined', (data) => {
  console.log('Joined room:', data.room)
})

// Room join failed
socket.on('room_join_error', (data) => {
  console.error('Failed to join room:', data.error)
})
```

## E-commerce Events

### Cart Events

#### Client to Server

```javascript
// Notify server of cart item addition
socket.emit('cart_add_item', {
  productId: '64a1b2c3d4e5f6789012345',
  variant: { size: '9', color: 'black' },
  quantity: 1
})

// Notify server of cart item removal
socket.emit('cart_remove_item', {
  productId: '64a1b2c3d4e5f6789012345',
  variant: { size: '9', color: 'black' }
})
```

#### Server to Client

```javascript
// Real-time cart updates
socket.on('cart_updated', (data) => {
  console.log('Cart updated:', data)
  // data = {
  //   action: 'item_added' | 'item_removed' | 'updated',
  //   cart: { /* cart object */ },
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  // Update cart UI
  updateCartUI(data.cart)
})

// Cart synchronization across devices
socket.on('cart_sync', (data) => {
  console.log('Cart synced:', data)
  syncCartAcrossDevices(data.cart)
})
```

### Inventory Events

```javascript
// Real-time inventory updates
socket.on('inventory_update', (data) => {
  console.log('Inventory updated:', data)
  // data = {
  //   productId: '64a1b2c3d4e5f6789012345',
  //   variant: { size: '9', color: 'black' },
  //   stockChange: -1, // negative for decrease, positive for increase
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  // Update product stock in UI
  updateProductStock(data.productId, data.variant, data.stockChange)
})

// Product-specific stock updates
socket.on('product_stock_update', (data) => {
  console.log('Product stock updated:', data)
  updateProductPage(data)
})

// Low stock alerts (Admin only)
socket.on('low_stock_alert', (data) => {
  console.log('Low stock alert:', data)
  // data = {
  //   productId: '64a1b2c3d4e5f6789012345',
  //   productName: 'Nike Air Max 270',
  //   variant: { size: '9', color: 'black' },
  //   currentStock: 2,
  //   lowStockThreshold: 5,
  //   severity: 'warning' | 'critical',
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  showLowStockAlert(data)
})
```

### Order Events

```javascript
// Order status updates
socket.on('order_status_update', (data) => {
  console.log('Order status updated:', data)
  // data = {
  //   orderId: '64a1b2c3d4e5f6789012348',
  //   orderNumber: 'ORD-2023-001234',
  //   status: 'shipped',
  //   statusHistory: [/* status history array */],
  //   estimatedDelivery: '2023-07-05T10:00:00.000Z',
  //   tracking: {
  //     carrier: 'UPS',
  //     trackingNumber: '1Z999AA1234567890'
  //   },
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  updateOrderStatus(data)
  showOrderNotification(data)
})

// New order notifications (Admin only)
socket.on('new_order', (data) => {
  console.log('New order received:', data)
  // data = {
  //   orderId: '64a1b2c3d4e5f6789012348',
  //   orderNumber: 'ORD-2023-001234',
  //   customer: { /* customer info */ },
  //   totalAmount: 238.78,
  //   itemCount: 2,
  //   status: 'pending',
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  showNewOrderNotification(data)
  updateOrdersDashboard(data)
})
```

### Flash Sale Events

```javascript
// Flash sale start
socket.on('flash_sale_start', (data) => {
  console.log('Flash sale started:', data)
  // data = {
  //   saleId: '64a1b2c3d4e5f6789012349',
  //   name: 'Summer Sale',
  //   description: '50% off all running shoes',
  //   discountPercentage: 50,
  //   startTime: '2023-07-01T10:00:00.000Z',
  //   endTime: '2023-07-01T22:00:00.000Z',
  //   products: [/* product IDs */],
  //   event: 'start',
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  showFlashSaleBanner(data)
  startCountdownTimer(data.endTime)
})

// Flash sale end
socket.on('flash_sale_end', (data) => {
  console.log('Flash sale ended:', data)
  hideFlashSaleBanner()
  stopCountdownTimer()
})

// Flash sale updates
socket.on('flash_sale_update', (data) => {
  console.log('Flash sale updated:', data)
  updateFlashSaleInfo(data)
})
```

### Review Events

```javascript
// New review notifications (Admin only)
socket.on('new_review_notification', (data) => {
  console.log('New review for moderation:', data)
  // data = {
  //   reviewId: '64a1b2c3d4e5f678901234a',
  //   productId: '64a1b2c3d4e5f6789012345',
  //   productName: 'Nike Air Max 270',
  //   rating: 5,
  //   title: 'Amazing shoes!',
  //   user: { /* user info */ },
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  showReviewModerationAlert(data)
})

// Product review added (for users viewing product)
socket.on('product_review_added', (data) => {
  console.log('New review added to product:', data)
  addReviewToProductPage(data)
})
```

### Wishlist Events

```javascript
// Wishlist updates
socket.on('wishlist_updated', (data) => {
  console.log('Wishlist updated:', data)
  // data = {
  //   action: 'item_added' | 'item_removed' | 'wishlist_created',
  //   wishlist: { /* wishlist object */ },
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  updateWishlistUI(data)
})

// Price drop alerts
socket.on('price_drop_alert', (data) => {
  console.log('Price drop alert:', data)
  // data = {
  //   productId: '64a1b2c3d4e5f6789012345',
  //   productName: 'Nike Air Max 270',
  //   oldPrice: 149.99,
  //   newPrice: 119.99,
  //   discountPercentage: 20,
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  showPriceDropNotification(data)
})

// Back in stock alerts
socket.on('back_in_stock_alert', (data) => {
  console.log('Product back in stock:', data)
  // data = {
  //   productId: '64a1b2c3d4e5f6789012345',
  //   productName: 'Nike Air Max 270',
  //   variant: { size: '9', color: 'black' },
  //   stock: 15,
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  showBackInStockNotification(data)
})
```

## User Interaction Events

### Product Tracking

```javascript
// Track product views for analytics
socket.emit('product_view', {
  productId: '64a1b2c3d4e5f6789012345',
  category: 'running',
  duration: 30000 // time spent viewing in milliseconds
})

// Wishlist updates
socket.emit('wishlist_updated', {
  action: 'item_added',
  productId: '64a1b2c3d4e5f6789012345',
  wishlistId: '64a1b2c3d4e5f678901234b'
})
```

### User Activity

```javascript
// Update user activity (heartbeat)
setInterval(() => {
  socket.emit('user_activity')
}, 30000) // Every 30 seconds

// User online/offline status
socket.on('user_offline', (data) => {
  console.log('User went offline:', data.userId)
  updateUserStatus(data.userId, 'offline')
})
```

## Support and Chat Events

### Customer Support

```javascript
// Join support chat
socket.emit('join_support_chat', {
  issue: 'Order inquiry',
  priority: 'normal'
})

// Support chat joined
socket.on('support_chat_joined', (data) => {
  console.log('Support chat joined:', data.chatRoom)
  initializeSupportChat(data.chatRoom)
})

// Send support message
socket.emit('support_message', {
  message: 'I need help with my order'
})

// Receive support messages
socket.on('support_message_received', (data) => {
  console.log('Support message:', data)
  // data = {
  //   id: 1625097600000,
  //   userId: '64a1b2c3d4e5f6789012346',
  //   user: { /* user info */ },
  //   message: 'Hello, how can I help you?',
  //   timestamp: '2023-07-01T10:00:00.000Z',
  //   isAdmin: true
  // }
  
  addMessageToChat(data)
})

// New support request (Admin only)
socket.on('new_support_request', (data) => {
  console.log('New support request:', data)
  showSupportRequestAlert(data)
})
```

### Typing Indicators

```javascript
// Start typing
socket.emit('typing_start', { room: 'support_12345' })

// Stop typing
socket.emit('typing_stop', { room: 'support_12345' })

// User typing indicator
socket.on('user_typing', (data) => {
  console.log('User typing:', data)
  // data = {
  //   userId: '64a1b2c3d4e5f6789012346',
  //   user: { /* user info */ },
  //   isTyping: true
  // }
  
  showTypingIndicator(data)
})
```

## Admin Events

### Dashboard Updates

```javascript
// Connection statistics (Admin only)
socket.on('connection_stats', (data) => {
  console.log('Connection stats:', data)
  // data = {
  //   totalConnections: 150,
  //   authenticatedUsers: 89,
  //   adminConnections: 3,
  //   timestamp: '2023-07-01T10:00:00.000Z'
  // }
  
  updateConnectionStats(data)
})

// Dashboard metric updates
socket.on('dashboard_metric_update', (data) => {
  console.log('Dashboard metric update:', data)
  updateDashboardMetric(data.metric, data.value)
})

// Admin notifications
socket.on('admin_notification', (data) => {
  console.log('Admin notification:', data)
  showAdminNotification(data)
})
```

### Analytics Events

```javascript
// Product view tracking (Admin only)
socket.on('product_view_tracked', (data) => {
  console.log('Product view tracked:', data)
  updateProductAnalytics(data)
})

// User activity tracking (Admin only)
socket.on('user_activity_tracked', (data) => {
  console.log('User activity tracked:', data)
  updateUserActivityDashboard(data)
})
```

## Error Handling

```javascript
// Connection errors
socket.on('connect_error', (error) => {
  console.error('Connection error:', error)
  showConnectionError()
})

// Room access errors
socket.on('room_join_error', (data) => {
  console.error('Room join error:', data.error)
  showRoomAccessError(data)
})

// General error handling
socket.on('error', (error) => {
  console.error('Socket error:', error)
  handleSocketError(error)
})
```

## Best Practices

### Connection Management

```javascript
// Reconnection handling
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts')
  // Re-join necessary rooms
  rejoinRooms()
})

// Graceful disconnection
window.addEventListener('beforeunload', () => {
  socket.disconnect()
})
```

### Performance Optimization

```javascript
// Throttle frequent events
const throttledProductView = throttle((data) => {
  socket.emit('product_view', data)
}, 1000)

// Batch updates
const batchedCartUpdates = []
const flushCartUpdates = debounce(() => {
  if (batchedCartUpdates.length > 0) {
    socket.emit('cart_batch_update', batchedCartUpdates)
    batchedCartUpdates.length = 0
  }
}, 500)
```

### Security Considerations

```javascript
// Validate incoming data
socket.on('cart_updated', (data) => {
  if (validateCartData(data)) {
    updateCartUI(data.cart)
  } else {
    console.warn('Invalid cart data received')
  }
})

// Rate limiting on client side
const rateLimiter = new Map()
const isRateLimited = (event) => {
  const now = Date.now()
  const lastCall = rateLimiter.get(event) || 0
  if (now - lastCall < 1000) { // 1 second limit
    return true
  }
  rateLimiter.set(event, now)
  return false
}
```

This comprehensive real-time system provides a seamless, interactive experience for users while giving administrators powerful tools for monitoring and managing the e-commerce platform in real-time.
