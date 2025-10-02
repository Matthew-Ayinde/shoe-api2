# Real-time Client Integration Guide

## Overview

This guide provides complete examples for integrating Socket.IO real-time features into your frontend applications. Examples are provided for React, Vue.js, and vanilla JavaScript.

## React Integration

### Setup and Connection

```jsx
// hooks/useSocket.js
import { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

export const useSocket = (token) => {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    if (token) {
      socketRef.current = io(process.env.REACT_APP_API_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      })

      const socket = socketRef.current

      socket.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        setConnectionError(null)
      })

      socket.on('disconnect', (reason) => {
        console.log('Disconnected:', reason)
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
        setConnectionError(error.message)
      })

      return () => {
        socket.disconnect()
      }
    }
  }, [token])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError
  }
}
```

### Real-time Cart Component

```jsx
// components/Cart/RealtimeCart.jsx
import React, { useEffect, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { useAuth } from '../../hooks/useAuth'

const RealtimeCart = () => {
  const { token } = useAuth()
  const { socket, isConnected } = useSocket(token)
  const [cart, setCart] = useState(null)
  const [cartUpdating, setCartUpdating] = useState(false)

  useEffect(() => {
    if (socket && isConnected) {
      // Join cart room for real-time updates
      socket.emit('join_cart')

      // Listen for cart updates
      socket.on('cart_updated', (data) => {
        console.log('Cart updated:', data)
        setCart(data.cart)
        setCartUpdating(false)
        
        // Show notification based on action
        showCartNotification(data.action, data.cart)
      })

      // Listen for cart sync across devices
      socket.on('cart_sync', (data) => {
        console.log('Cart synced across devices')
        setCart(data.cart)
      })

      return () => {
        socket.off('cart_updated')
        socket.off('cart_sync')
      }
    }
  }, [socket, isConnected])

  const addToCart = async (productId, variant, quantity) => {
    setCartUpdating(true)
    
    try {
      // Make API call
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          size: variant.size,
          color: variant.color,
          quantity
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add item to cart')
      }

      // Notify other connected devices
      if (socket) {
        socket.emit('cart_add_item', {
          productId,
          variant,
          quantity
        })
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      setCartUpdating(false)
    }
  }

  const showCartNotification = (action, cart) => {
    const messages = {
      item_added: 'Item added to cart',
      item_removed: 'Item removed from cart',
      item_updated: 'Cart updated',
      cart_cleared: 'Cart cleared'
    }

    // Show toast notification
    toast.success(messages[action] || 'Cart updated')
  }

  return (
    <div className="realtime-cart">
      <div className="cart-header">
        <h3>Shopping Cart</h3>
        {cartUpdating && <span className="updating">Updating...</span>}
        {isConnected && <span className="connected">🟢 Live</span>}
      </div>
      
      {cart && (
        <div className="cart-items">
          {cart.items.map(item => (
            <CartItem 
              key={`${item.product._id}-${item.variant.size}-${item.variant.color}`}
              item={item}
              onUpdate={(quantity) => updateCartItem(item._id, quantity)}
              onRemove={() => removeCartItem(item._id)}
            />
          ))}
          <div className="cart-total">
            Total: ${cart.totalAmount.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}

export default RealtimeCart
```

### Real-time Product Component

```jsx
// components/Product/RealtimeProduct.jsx
import React, { useEffect, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'

const RealtimeProduct = ({ productId, initialProduct }) => {
  const { socket, isConnected } = useSocket()
  const [product, setProduct] = useState(initialProduct)
  const [stockAlerts, setStockAlerts] = useState([])

  useEffect(() => {
    if (socket && isConnected) {
      // Join product room for stock updates
      socket.emit('join_room', { room: `product_${productId}` })

      // Listen for inventory updates
      socket.on('inventory_update', (data) => {
        if (data.productId === productId) {
          updateProductStock(data)
        }
      })

      // Listen for product-specific stock updates
      socket.on('product_stock_update', (data) => {
        updateProductStock(data)
      })

      // Listen for new reviews
      socket.on('product_review_added', (data) => {
        if (data.productId === productId) {
          addNewReview(data)
        }
      })

      // Track product view
      const viewStartTime = Date.now()
      
      return () => {
        // Track view duration on unmount
        const viewDuration = Date.now() - viewStartTime
        socket.emit('product_view', {
          productId,
          category: product.category,
          duration: viewDuration
        })

        socket.off('inventory_update')
        socket.off('product_stock_update')
        socket.off('product_review_added')
      }
    }
  }, [socket, isConnected, productId])

  const updateProductStock = (data) => {
    setProduct(prev => {
      const updated = { ...prev }
      const variantIndex = updated.variants.findIndex(v => 
        v.size === data.variant.size && v.color === data.variant.color
      )
      
      if (variantIndex !== -1) {
        updated.variants[variantIndex].stock += data.stockChange
        
        // Show stock alert if low
        if (updated.variants[variantIndex].stock <= 5) {
          setStockAlerts(prev => [...prev, {
            id: Date.now(),
            message: `Only ${updated.variants[variantIndex].stock} left in ${data.variant.size} ${data.variant.color}!`,
            variant: data.variant
          }])
        }
      }
      
      return updated
    })
  }

  const addNewReview = (reviewData) => {
    // Update product rating and review count
    setProduct(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        count: prev.ratings.count + 1,
        // Recalculate average (simplified)
        average: ((prev.ratings.average * prev.ratings.count) + reviewData.rating) / (prev.ratings.count + 1)
      }
    }))

    // Show notification
    toast.info(`New review added: ${reviewData.title}`)
  }

  return (
    <div className="realtime-product">
      {stockAlerts.map(alert => (
        <div key={alert.id} className="stock-alert">
          {alert.message}
          <button onClick={() => setStockAlerts(prev => prev.filter(a => a.id !== alert.id))}>
            ×
          </button>
        </div>
      ))}
      
      <div className="product-info">
        <h1>{product.name}</h1>
        <div className="rating">
          ⭐ {product.ratings.average.toFixed(1)} ({product.ratings.count} reviews)
        </div>
        
        <div className="variants">
          {product.variants.map(variant => (
            <div key={`${variant.size}-${variant.color}`} className="variant">
              <span>{variant.size} - {variant.color}</span>
              <span className={`stock ${variant.stock <= 5 ? 'low' : ''}`}>
                {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {isConnected && (
        <div className="live-indicator">
          🟢 Live updates enabled
        </div>
      )}
    </div>
  )
}

export default RealtimeProduct
```

### Real-time Notifications Component

```jsx
// components/Notifications/RealtimeNotifications.jsx
import React, { useEffect, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { toast } from 'react-toastify'

const RealtimeNotifications = () => {
  const { socket, isConnected } = useSocket()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (socket && isConnected) {
      // Listen for various notification types
      socket.on('notification', (data) => {
        addNotification(data)
        showToastNotification(data)
      })

      socket.on('order_status_update', (data) => {
        const notification = {
          id: Date.now(),
          type: 'order_update',
          title: `Order ${data.orderNumber} ${data.status}`,
          message: `Your order status has been updated to ${data.status}`,
          data,
          timestamp: new Date()
        }
        addNotification(notification)
        toast.info(notification.title)
      })

      socket.on('flash_sale_start', (data) => {
        const notification = {
          id: Date.now(),
          type: 'flash_sale',
          title: 'Flash Sale Started!',
          message: `${data.name} - ${data.discountPercentage}% off!`,
          data,
          timestamp: new Date()
        }
        addNotification(notification)
        toast.success(notification.title)
      })

      socket.on('price_drop_alert', (data) => {
        const notification = {
          id: Date.now(),
          type: 'price_drop',
          title: 'Price Drop Alert!',
          message: `${data.productName} is now ${data.discountPercentage}% off!`,
          data,
          timestamp: new Date()
        }
        addNotification(notification)
        toast.info(notification.title)
      })

      socket.on('back_in_stock_alert', (data) => {
        const notification = {
          id: Date.now(),
          type: 'back_in_stock',
          title: 'Back in Stock!',
          message: `${data.productName} is now available`,
          data,
          timestamp: new Date()
        }
        addNotification(notification)
        toast.success(notification.title)
      })

      return () => {
        socket.off('notification')
        socket.off('order_status_update')
        socket.off('flash_sale_start')
        socket.off('price_drop_alert')
        socket.off('back_in_stock_alert')
      }
    }
  }, [socket, isConnected])

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50
  }

  const showToastNotification = (data) => {
    const toastOptions = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true
    }

    switch (data.type) {
      case 'order_update':
        toast.info(data.title, toastOptions)
        break
      case 'flash_sale':
        toast.success(data.title, toastOptions)
        break
      case 'price_drop':
        toast.info(data.title, toastOptions)
        break
      default:
        toast(data.title, toastOptions)
    }
  }

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="realtime-notifications">
      <div className="notifications-header">
        <h3>Notifications</h3>
        {isConnected && <span className="live-indicator">🟢 Live</span>}
        <button onClick={clearAll}>Clear All</button>
      </div>
      
      <div className="notifications-list">
        {notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification ${notification.read ? 'read' : 'unread'}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RealtimeNotifications
```

## Vue.js Integration

### Vue Composition API

```vue
<!-- composables/useSocket.js -->
<script>
import { ref, onMounted, onUnmounted } from 'vue'
import io from 'socket.io-client'

export function useSocket(token) {
  const socket = ref(null)
  const isConnected = ref(false)
  const connectionError = ref(null)

  onMounted(() => {
    if (token.value) {
      socket.value = io(process.env.VUE_APP_API_URL, {
        auth: { token: token.value },
        transports: ['websocket', 'polling']
      })

      socket.value.on('connect', () => {
        console.log('Connected to server')
        isConnected.value = true
        connectionError.value = null
      })

      socket.value.on('disconnect', (reason) => {
        console.log('Disconnected:', reason)
        isConnected.value = false
      })

      socket.value.on('connect_error', (error) => {
        console.error('Connection error:', error)
        connectionError.value = error.message
      })
    }
  })

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect()
    }
  })

  return {
    socket,
    isConnected,
    connectionError
  }
}
</script>
```

### Vue Cart Component

```vue
<!-- components/RealtimeCart.vue -->
<template>
  <div class="realtime-cart">
    <div class="cart-header">
      <h3>Shopping Cart</h3>
      <span v-if="cartUpdating" class="updating">Updating...</span>
      <span v-if="isConnected" class="connected">🟢 Live</span>
    </div>
    
    <div v-if="cart" class="cart-items">
      <div v-for="item in cart.items" :key="item._id" class="cart-item">
        <!-- Cart item template -->
      </div>
      <div class="cart-total">
        Total: ${{ cart.totalAmount.toFixed(2) }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSocket } from '../composables/useSocket'
import { useAuth } from '../composables/useAuth'

export default {
  name: 'RealtimeCart',
  setup() {
    const { token } = useAuth()
    const { socket, isConnected } = useSocket(token)
    const cart = ref(null)
    const cartUpdating = ref(false)

    onMounted(() => {
      if (socket.value && isConnected.value) {
        socket.value.emit('join_cart')

        socket.value.on('cart_updated', (data) => {
          console.log('Cart updated:', data)
          cart.value = data.cart
          cartUpdating.value = false
        })

        socket.value.on('cart_sync', (data) => {
          console.log('Cart synced across devices')
          cart.value = data.cart
        })
      }
    })

    onUnmounted(() => {
      if (socket.value) {
        socket.value.off('cart_updated')
        socket.value.off('cart_sync')
      }
    })

    return {
      cart,
      cartUpdating,
      isConnected
    }
  }
}
</script>
```

## Vanilla JavaScript Integration

### Basic Setup

```javascript
// js/socket-client.js
class SocketClient {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl
    this.token = token
    this.socket = null
    this.isConnected = false
    this.eventHandlers = new Map()
  }

  connect() {
    this.socket = io(this.apiUrl, {
      auth: { token: this.token },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('Connected to server')
      this.isConnected = true
      this.emit('connection', { connected: true })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason)
      this.isConnected = false
      this.emit('connection', { connected: false, reason })
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.emit('connection', { connected: false, error: error.message })
    })

    // Set up event listeners
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Cart events
    this.socket.on('cart_updated', (data) => {
      this.emit('cart_updated', data)
    })

    // Inventory events
    this.socket.on('inventory_update', (data) => {
      this.emit('inventory_update', data)
    })

    // Order events
    this.socket.on('order_status_update', (data) => {
      this.emit('order_status_update', data)
    })

    // Flash sale events
    this.socket.on('flash_sale_start', (data) => {
      this.emit('flash_sale_start', data)
    })

    // Notification events
    this.socket.on('notification', (data) => {
      this.emit('notification', data)
    })
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event).push(handler)
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event)
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error('Error in event handler:', error)
        }
      })
    }
  }

  joinRoom(room, data = {}) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', { room, ...data })
    }
  }

  leaveRoom(room) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_room', { room })
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

// Usage
const socketClient = new SocketClient('http://localhost:5000', localStorage.getItem('authToken'))

// Connect
socketClient.connect()

// Listen for events
socketClient.on('cart_updated', (data) => {
  console.log('Cart updated:', data)
  updateCartUI(data.cart)
})

socketClient.on('inventory_update', (data) => {
  console.log('Inventory updated:', data)
  updateProductStock(data.productId, data.variant, data.stockChange)
})

// Join rooms
socketClient.on('connection', (data) => {
  if (data.connected) {
    socketClient.joinRoom('user_12345')
    socketClient.joinRoom('flash_sales')
  }
})
```

This comprehensive real-time integration provides a seamless, interactive experience across all major frontend frameworks, enabling developers to easily implement live updates, notifications, and collaborative features in their e-commerce applications.
