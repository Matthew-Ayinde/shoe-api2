# 🔴 Socket.IO Integration Guide - Complete Frontend Setup

## 📋 Table of Contents

1. [Overview](#overview)
2. [How Socket.IO Works in This API](#how-socketio-works)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Setup - Step by Step](#frontend-setup)
5. [Available Events](#available-events)
6. [Authentication](#authentication)
7. [Room Management](#room-management)
8. [Real-World Examples](#real-world-examples)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

Socket.IO provides **real-time, bidirectional communication** between your frontend and backend. This API uses Socket.IO to deliver instant notifications, live updates, and real-time features.

### What You Get:

- 🔐 **Login notifications** - Instant alerts when someone logs into your account
- 📦 **Order updates** - Real-time order status changes
- 🛒 **Cart sync** - Live cart updates across devices
- ⚡ **Flash sales** - Instant flash sale alerts
- 💬 **Live chat** - Real-time customer support
- 📊 **Admin dashboard** - Live analytics and updates
- 🔔 **In-app notifications** - Instant notification delivery

---

## How Socket.IO Works in This API

### Connection Flow:

```
┌─────────────┐                           ┌─────────────┐
│   Frontend  │                           │   Backend   │
│   (Client)  │                           │   (Server)  │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │  1. Connect with JWT token              │
       ├────────────────────────────────────────>│
       │                                         │
       │  2. Authenticate user                   │
       │                                         │◄── Verify JWT
       │                                         │    Fetch user data
       │                                         │
       │  3. Connection established              │
       │◄────────────────────────────────────────┤
       │     { userId, role, socket.id }         │
       │                                         │
       │  4. Auto-join rooms                     │
       │                                         │◄── Join user-specific room
       │                                         │    Join role-based rooms
       │                                         │
       │  5. Listen for events                   │
       ├─────────────────────────────────────────┤
       │                                         │
       │  6. Receive real-time updates           │
       │◄────────────────────────────────────────┤
       │     (notifications, cart, orders, etc.) │
       │                                         │
       ▼                                         ▼
```

### Key Concepts:

1. **Connection**: Client connects to server via WebSocket
2. **Authentication**: JWT token validates user identity
3. **Rooms**: Users auto-join rooms based on userId and role
4. **Events**: Server emits events, client listens and responds
5. **Bidirectional**: Both client and server can send/receive

---

## Backend Architecture

### Socket.IO Configuration

Located in `src/services/socketService.js`:

#### Authentication Middleware:
```javascript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    
    socket.userId = user._id
    socket.userRole = user.role
    socket.user = user
  }
  next()
})
```

#### Auto-Join Rooms:
```javascript
socket.on('connection', (socket) => {
  if (socket.userId) {
    // Join personal room
    socket.join(`user_${socket.userId}`)
    
    // Join role-based room
    if (socket.userRole === 'admin' || socket.userRole === 'staff') {
      socket.join('admin')
    }
  }
})
```

### Available Rooms:

| Room Name | Who Joins | Purpose |
|-----------|-----------|---------|
| `user_{userId}` | All authenticated users | Personal notifications |
| `admin` | Admins & Staff | Admin dashboard updates |
| `cart_{userId}` | User with active cart | Cart synchronization |
| `order_{orderId}` | User who placed order | Order status updates |

---

## Frontend Setup

### Step 1: Install Socket.IO Client

```bash
npm install socket.io-client
```

### Step 2: Create Socket Service

Create `src/services/socket.js` (or wherever you keep services):

```javascript
import io from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
  }

  /**
   * Connect to Socket.IO server
   * @param {string} token - JWT authentication token
   * @param {string} url - Backend URL (default: http://localhost:5000)
   */
  connect(token, url = 'http://localhost:5000') {
    if (this.socket?.connected) {
      console.log('Already connected to Socket.IO')
      return this.socket
    }

    console.log('🔌 Connecting to Socket.IO server...')

    this.socket = io(url, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    this.setupEventHandlers()
    return this.socket
  }

  /**
   * Setup core event handlers
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server')
      console.log('Socket ID:', this.socket.id)
      this.connected = true
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO:', reason)
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to Socket.IO after', attemptNumber, 'attempts')
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt', attemptNumber)
    })

    this.socket.on('reconnect_error', (error) => {
      console.error('🔴 Reconnection error:', error.message)
    })

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect to Socket.IO')
    })
  }

  /**
   * Listen for a specific event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   */
  on(event, callback) {
    if (!this.socket) {
      console.error('Socket not connected. Call connect() first.')
      return
    }

    this.socket.on(event, callback)
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
  }

  /**
   * Emit an event to server
   * @param {string} event - Event name
   * @param {*} data - Data to send
   */
  emit(event, data) {
    if (!this.socket?.connected) {
      console.error('Socket not connected. Cannot emit event:', event)
      return
    }

    this.socket.emit(event, data)
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove (optional)
   */
  off(event, callback) {
    if (!this.socket) return

    if (callback) {
      this.socket.off(event, callback)
    } else {
      this.socket.off(event)
      this.listeners.delete(event)
    }
  }

  /**
   * Join a specific room
   * @param {string} room - Room name
   */
  joinRoom(room) {
    this.emit('join_room', { room })
  }

  /**
   * Leave a specific room
   * @param {string} room - Room name
   */
  leaveRoom(room) {
    this.emit('leave_room', { room })
  }

  /**
   * Disconnect from Socket.IO
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO...')
      
      // Remove all listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket.off(event, callback)
        })
      })
      this.listeners.clear()

      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.socket?.connected || false
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket() {
    return this.socket
  }
}

// Export singleton instance
export default new SocketService()
```

### Step 3: Initialize in Your App

#### React Example:

```javascript
// src/App.js or main component
import React, { useEffect } from 'react'
import socketService from './services/socket'
import { useAuth } from './contexts/AuthContext' // Your auth context

function App() {
  const { token, user } = useAuth()

  useEffect(() => {
    if (token) {
      // Connect to Socket.IO when user is authenticated
      socketService.connect(token, process.env.REACT_APP_API_URL)

      // Setup event listeners
      socketService.on('login_notification', (data) => {
        console.log('🔐 Login notification:', data)
        // Show notification in your UI
        showNotification({
          title: data.title,
          message: data.message,
          type: 'warning'
        })
      })

      socketService.on('order_update', (data) => {
        console.log('📦 Order update:', data)
        // Update order in your state
        updateOrder(data.order)
      })

      socketService.on('cart_update', (data) => {
        console.log('🛒 Cart update:', data)
        // Sync cart
        updateCart(data.cart)
      })

      socketService.on('notification', (data) => {
        console.log('🔔 New notification:', data)
        // Add to notifications list
        addNotification(data)
      })

      // Cleanup on unmount or logout
      return () => {
        socketService.disconnect()
      }
    }
  }, [token])

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  )
}
```

#### Vue 3 Example:

```javascript
// src/main.js or App.vue
import { onMounted, onUnmounted } from 'vue'
import socketService from './services/socket'
import { useAuthStore } from './stores/auth'

export default {
  setup() {
    const authStore = useAuthStore()

    onMounted(() => {
      if (authStore.token) {
        socketService.connect(authStore.token, import.meta.env.VITE_API_URL)

        // Setup listeners
        socketService.on('login_notification', (data) => {
          console.log('🔐 Login notification:', data)
          // Handle notification
        })

        socketService.on('order_update', (data) => {
          console.log('📦 Order update:', data)
          // Handle order update
        })
      }
    })

    onUnmounted(() => {
      socketService.disconnect()
    })

    return {}
  }
}
```

#### Vanilla JavaScript Example:

```javascript
// In your main JavaScript file
import socketService from './socket.js'

// After user logs in
async function handleLogin(email, password) {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await response.json()
  const token = data.data.token

  // Store token
  localStorage.setItem('token', token)

  // Connect to Socket.IO
  socketService.connect(token, 'http://localhost:5000')

  // Setup listeners
  socketService.on('login_notification', (data) => {
    alert(`${data.title}: ${data.message}`)
  })

  socketService.on('notification', (data) => {
    showNotification(data)
  })
}

// When user logs out
function handleLogout() {
  socketService.disconnect()
  localStorage.removeItem('token')
}
```

---

## Available Events

### Events You Can **Listen For** (Receive from Server):

#### 1. **login_notification**
Triggered when someone logs into the account.

```javascript
socketService.on('login_notification', (data) => {
  console.log(data)
  /*
  {
    type: 'login_notification',
    title: '🔐 New Login Detected',
    message: 'Login from New York, US',
    loginInfo: {
      ipAddress: '192.168.1.1',
      location: 'New York, US',
      device: 'macOS 13.0',
      browser: 'Chrome 120.0',
      timestamp: '2025-12-25T10:30:00Z'
    },
    timestamp: '2025-12-25T10:30:00Z'
  }
  */
})
```

#### 2. **notification**
General in-app notifications.

```javascript
socketService.on('notification', (data) => {
  console.log(data)
  /*
  {
    _id: '507f1f77bcf86cd799439011',
    type: 'order_shipped',
    title: 'Order Shipped',
    message: 'Your order #12345 has been shipped',
    data: { orderNumber: '12345', trackingNumber: 'TRACK123' },
    createdAt: '2025-12-25T10:30:00Z'
  }
  */
})
```

#### 3. **order_update**
Real-time order status updates.

```javascript
socketService.on('order_update', (data) => {
  console.log(data)
  /*
  {
    orderId: '507f1f77bcf86cd799439011',
    status: 'shipped',
    order: { ...orderDetails },
    message: 'Your order has been shipped'
  }
  */
})
```

#### 4. **cart_update**
Cart synchronization across devices.

```javascript
socketService.on('cart_update', (data) => {
  console.log(data)
  /*
  {
    action: 'add' | 'remove' | 'update',
    cart: { ...cartDetails },
    message: 'Item added to cart'
  }
  */
})
```

#### 5. **flash_sale_start**
Flash sale started.

```javascript
socketService.on('flash_sale_start', (data) => {
  console.log(data)
  /*
  {
    flashSale: {
      _id: '...',
      name: 'Summer Sale',
      discount: 50,
      startTime: '...',
      endTime: '...',
      products: [...]
    }
  }
  */
})
```

#### 6. **flash_sale_end**
Flash sale ended.

```javascript
socketService.on('flash_sale_end', (data) => {
  console.log(data)
  /*
  {
    flashSaleId: '507f1f77bcf86cd799439011',
    message: 'Flash sale has ended'
  }
  */
})
```

#### 7. **inventory_update**
Product stock changes.

```javascript
socketService.on('inventory_update', (data) => {
  console.log(data)
  /*
  {
    productId: '507f1f77bcf86cd799439011',
    variant: { color: 'Black', size: 10 },
    oldStock: 5,
    newStock: 3
  }
  */
})
```

#### 8. **admin_alert** (Admin/Staff only)
Important admin notifications.

```javascript
socketService.on('admin_alert', (data) => {
  console.log(data)
  /*
  {
    type: 'low_stock' | 'new_order' | 'system',
    priority: 'high' | 'urgent',
    message: 'Low stock alert for Product X',
    data: {...}
  }
  */
})
```

### Events You Can **Emit** (Send to Server):

#### 1. **join_room**
Join a specific room.

```javascript
socketService.emit('join_room', {
  room: 'order_507f1f77bcf86cd799439011'
})
```

#### 2. **leave_room**
Leave a specific room.

```javascript
socketService.emit('leave_room', {
  room: 'order_507f1f77bcf86cd799439011'
})
```

#### 3. **mark_notification_read**
Mark notification as read.

```javascript
socketService.emit('mark_notification_read', {
  notificationId: '507f1f77bcf86cd799439011'
})
```

#### 4. **typing** (Chat feature)
Notify that user is typing.

```javascript
socketService.emit('typing', {
  room: 'support_chat_123'
})
```

#### 5. **stop_typing** (Chat feature)
Notify that user stopped typing.

```javascript
socketService.emit('stop_typing', {
  room: 'support_chat_123'
})
```

---

## Authentication

### How Authentication Works:

1. **User logs in** via `/api/auth/login`
2. **Server returns JWT token**
3. **Frontend connects to Socket.IO with token**:
   ```javascript
   socketService.connect(token, apiUrl)
   ```
4. **Server validates token** in Socket.IO middleware
5. **Connection established** with user context

### Token Handling:

```javascript
// Store token after login
localStorage.setItem('token', token)

// Get token for Socket.IO connection
const token = localStorage.getItem('token')
socketService.connect(token, apiUrl)

// On logout, disconnect socket
socketService.disconnect()
localStorage.removeItem('token')
```

### Automatic Reconnection:

If token expires or connection drops:

```javascript
// Listen for reconnection
socketService.on('reconnect', () => {
  console.log('Reconnected!')
  // Optionally rejoin rooms or refresh data
})

// Handle token refresh
async function refreshToken() {
  const newToken = await getRefreshedToken()
  socketService.disconnect()
  socketService.connect(newToken, apiUrl)
}
```

---

## Room Management

### Automatic Rooms:

When you connect, you're automatically added to:
- `user_{yourUserId}` - Your personal room
- `admin` - If you're admin/staff

### Manual Room Joining:

Join specific rooms for real-time updates:

```javascript
// Join order room to get updates
socketService.joinRoom(`order_${orderId}`)

// Listen for order updates
socketService.on('order_update', (data) => {
  if (data.orderId === orderId) {
    updateOrderStatus(data.status)
  }
})

// Leave room when done
socketService.leaveRoom(`order_${orderId}`)
```

### Room Usage Examples:

```javascript
// Track specific order
socketService.joinRoom('order_12345')

// Monitor cart across devices
socketService.joinRoom('cart_' + userId)

// Join chat room
socketService.joinRoom('support_chat_' + chatId)

// Admin dashboard
if (userRole === 'admin') {
  socketService.joinRoom('admin')
}
```

---

## Real-World Examples

### Example 1: Login Notification Alert

```javascript
import socketService from './services/socket'
import { toast } from 'react-toastify' // or your notification library

// Setup login notification listener
socketService.on('login_notification', (data) => {
  toast.warning(
    <div>
      <strong>{data.title}</strong>
      <p>{data.message}</p>
      <small>
        📍 {data.loginInfo.location}<br/>
        💻 {data.loginInfo.device}<br/>
        🌐 {data.loginInfo.browser}
      </small>
      <button onClick={() => navigateTo('/account/security')}>
        View Details
      </button>
    </div>,
    {
      position: 'top-right',
      autoClose: 10000,
      closeOnClick: false
    }
  )
})
```

### Example 2: Real-time Cart Sync

```javascript
import { useCart } from './hooks/useCart'

function CartComponent() {
  const { cart, setCart } = useCart()

  useEffect(() => {
    // Listen for cart updates
    socketService.on('cart_update', (data) => {
      console.log('Cart synced:', data.action)
      setCart(data.cart)
      
      toast.info(`Cart ${data.action}: ${data.message}`)
    })

    return () => {
      socketService.off('cart_update')
    }
  }, [])

  return <div>{/* Cart UI */}</div>
}
```

### Example 3: Order Tracking

```javascript
function OrderTrackingPage({ orderId }) {
  const [orderStatus, setOrderStatus] = useState('processing')

  useEffect(() => {
    // Join order-specific room
    socketService.joinRoom(`order_${orderId}`)

    // Listen for updates
    socketService.on('order_update', (data) => {
      if (data.orderId === orderId) {
        setOrderStatus(data.status)
        
        toast.success(data.message, {
          icon: getStatusIcon(data.status)
        })
      }
    })

    // Cleanup
    return () => {
      socketService.leaveRoom(`order_${orderId}`)
      socketService.off('order_update')
    }
  }, [orderId])

  return (
    <div>
      <h2>Order Status: {orderStatus}</h2>
      {/* Order tracking UI */}
    </div>
  )
}
```

### Example 4: Flash Sale Countdown

```javascript
function FlashSaleBanner() {
  const [activeSale, setActiveSale] = useState(null)

  useEffect(() => {
    socketService.on('flash_sale_start', (data) => {
      setActiveSale(data.flashSale)
      
      toast.success(
        `🔥 Flash Sale Started: ${data.flashSale.name}`,
        { autoClose: false }
      )
    })

    socketService.on('flash_sale_end', (data) => {
      if (activeSale?._id === data.flashSaleId) {
        setActiveSale(null)
        toast.info('Flash sale has ended')
      }
    })

    return () => {
      socketService.off('flash_sale_start')
      socketService.off('flash_sale_end')
    }
  }, [activeSale])

  if (!activeSale) return null

  return (
    <div className="flash-sale-banner">
      <h3>🔥 {activeSale.name}</h3>
      <p>{activeSale.discount}% OFF!</p>
      <Countdown endTime={activeSale.endTime} />
    </div>
  )
}
```

### Example 5: Admin Dashboard Live Updates

```javascript
function AdminDashboard() {
  const [stats, setStats] = useState({})
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => {
    // Admin-specific events
    socketService.on('admin_alert', (data) => {
      if (data.type === 'new_order') {
        setRecentOrders(prev => [data.order, ...prev])
        playNotificationSound()
      }
      
      if (data.type === 'low_stock') {
        showLowStockAlert(data.product)
      }
    })

    socketService.on('stats_update', (data) => {
      setStats(data.stats)
    })

    return () => {
      socketService.off('admin_alert')
      socketService.off('stats_update')
    }
  }, [])

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <Stats data={stats} />
      <RecentOrders orders={recentOrders} />
    </div>
  )
}
```

### Example 6: Connection Status Indicator

```javascript
function ConnectionStatus() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const checkConnection = () => {
      setConnected(socketService.isConnected())
    }

    // Check initially
    checkConnection()

    // Setup listeners
    socketService.on('connect', () => setConnected(true))
    socketService.on('disconnect', () => setConnected(false))

    // Check periodically
    const interval = setInterval(checkConnection, 5000)

    return () => {
      clearInterval(interval)
      socketService.off('connect')
      socketService.off('disconnect')
    }
  }, [])

  return (
    <div className={`status-indicator ${connected ? 'online' : 'offline'}`}>
      <span className="status-dot"></span>
      {connected ? 'Connected' : 'Offline'}
    </div>
  )
}
```

---

## Troubleshooting

### Issue 1: Cannot Connect

**Symptoms:**
- `connect_error` events
- Socket never connects

**Solutions:**
```javascript
// Check token is valid
const token = localStorage.getItem('token')
console.log('Token:', token ? 'Present' : 'Missing')

// Check backend URL
const API_URL = 'http://localhost:5000'
console.log('Connecting to:', API_URL)

// Check CORS settings on backend
// Backend should allow your frontend origin

// Check if backend is running
fetch(API_URL + '/api/health')
  .then(res => console.log('Backend is up'))
  .catch(err => console.error('Backend is down'))
```

### Issue 2: Not Receiving Events

**Symptoms:**
- Connected but no events received

**Solutions:**
```javascript
// Verify you're listening to correct event name
socketService.on('login_notification', (data) => {
  console.log('Received login notification:', data)
})

// Check if you're in the right room
socketService.joinRoom('user_' + userId)

// Enable Socket.IO debug mode
localStorage.setItem('debug', 'socket.io-client:*')
```

### Issue 3: Duplicate Connections

**Symptoms:**
- Multiple connections from same user
- Events firing multiple times

**Solutions:**
```javascript
// Disconnect before reconnecting
if (socketService.isConnected()) {
  socketService.disconnect()
}
socketService.connect(token, apiUrl)

// Remove old listeners before adding new ones
socketService.off('login_notification')
socketService.on('login_notification', handler)

// Use cleanup in React/Vue
useEffect(() => {
  socketService.connect(token, apiUrl)
  
  return () => {
    socketService.disconnect()
  }
}, [token])
```

### Issue 4: Authentication Fails

**Symptoms:**
- Connection succeeds but user-specific events don't work

**Solutions:**
```javascript
// Check token format
const token = localStorage.getItem('token')
console.log('Token format:', token?.substring(0, 20) + '...')

// Verify token in auth header
socketService.connect(token, apiUrl)

// Check backend logs for JWT errors

// Try refreshing token
const newToken = await refreshAuthToken()
socketService.disconnect()
socketService.connect(newToken, apiUrl)
```

### Issue 5: Reconnection Issues

**Symptoms:**
- Doesn't reconnect after disconnect

**Solutions:**
```javascript
// Enable reconnection (already enabled in our service)
const socket = io(url, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
})

// Handle reconnection
socketService.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts')
  // Rejoin rooms if needed
  socketService.joinRoom('user_' + userId)
})
```

---

## Best Practices

### 1. **Always Clean Up**

```javascript
// React
useEffect(() => {
  socketService.on('notification', handler)
  
  return () => {
    socketService.off('notification', handler)
  }
}, [])

// Vue
onUnmounted(() => {
  socketService.off('notification', handler)
})

// Vanilla JS
window.addEventListener('beforeunload', () => {
  socketService.disconnect()
})
```

### 2. **Handle Connection States**

```javascript
function MyComponent() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    socketService.on('connect', () => setConnected(true))
    socketService.on('disconnect', () => setConnected(false))

    return () => {
      socketService.off('connect')
      socketService.off('disconnect')
    }
  }, [])

  if (!connected) {
    return <div>Connecting to real-time updates...</div>
  }

  return <div>Live updates active!</div>
}
```

### 3. **Use Room Management Wisely**

```javascript
// Join room when component mounts
useEffect(() => {
  socketService.joinRoom(`order_${orderId}`)
  
  return () => {
    socketService.leaveRoom(`order_${orderId}`)
  }
}, [orderId])
```

### 4. **Debounce Frequent Events**

```javascript
import { debounce } from 'lodash'

// Debounce cart updates
const handleCartUpdate = debounce((data) => {
  updateCart(data.cart)
}, 300)

socketService.on('cart_update', handleCartUpdate)
```

### 5. **Error Handling**

```javascript
socketService.on('error', (error) => {
  console.error('Socket error:', error)
  toast.error('Connection error. Retrying...')
})

socketService.on('connect_error', (error) => {
  console.error('Connection failed:', error)
  // Show offline indicator
  setOnline(false)
})
```

### 6. **Secure Token Storage**

```javascript
// Use secure storage
import SecureLS from 'secure-ls'
const ls = new SecureLS({ encodingType: 'aes' })

// Store token
ls.set('token', token)

// Retrieve token
const token = ls.get('token')
socketService.connect(token, apiUrl)
```

### 7. **Environment Configuration**

```javascript
// .env file
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000

// Usage
const API_URL = process.env.REACT_APP_API_URL
socketService.connect(token, API_URL)
```

### 8. **Logging for Development**

```javascript
if (process.env.NODE_ENV === 'development') {
  socketService.on('*', (eventName, ...args) => {
    console.log('📨 Socket event:', eventName, args)
  })
}
```

---

## Performance Tips

1. **Lazy Connect**: Only connect when user is authenticated
2. **Disconnect on Idle**: Disconnect after inactivity
3. **Selective Events**: Only listen to events you need
4. **Room Cleanup**: Always leave rooms when done
5. **Debounce Updates**: Avoid UI thrashing with frequent updates
6. **Use WebSocket**: Prefer WebSocket over polling

---

## Production Checklist

- [ ] Environment variables configured
- [ ] HTTPS/WSS in production
- [ ] CORS properly configured
- [ ] Error handling implemented
- [ ] Reconnection logic tested
- [ ] Token refresh mechanism
- [ ] Connection status indicator
- [ ] Cleanup on logout
- [ ] Memory leak prevention
- [ ] Rate limiting considered

---

## Additional Resources

- **Socket.IO Docs**: https://socket.io/docs/
- **Backend Code**: `src/services/socketService.js`
- **Events Reference**: `src/utils/constants.js`
- **Login Notifications**: `docs/LOGIN_NOTIFICATION_SETUP.md`

---

## Summary

Socket.IO in this API provides:

✅ **Authentication** - Secure JWT-based connection  
✅ **Auto-rooms** - Automatic room joining based on user/role  
✅ **Real-time events** - Login, orders, cart, notifications  
✅ **Bidirectional** - Client ↔ Server communication  
✅ **Reconnection** - Automatic reconnection with backoff  
✅ **Room management** - Join/leave specific event rooms  

**Next Steps:**
1. Install `socket.io-client`
2. Create socket service using code above
3. Connect with JWT token
4. Listen for events
5. Test with login notifications

---

**Created:** December 25, 2025  
**Version:** 1.0.0  
**Backend:** Socket.IO v4.7.4
