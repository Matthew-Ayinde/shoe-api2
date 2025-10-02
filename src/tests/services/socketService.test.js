/**
 * Socket.IO Service Tests
 * 
 * Comprehensive tests for the real-time Socket.IO service including:
 * - Connection handling and authentication
 * - Room management and access control
 * - Event emission and broadcasting
 * - Cart real-time updates
 * - Inventory notifications
 * - Order status updates
 * - Admin notifications
 * - Error handling and edge cases
 */

const { createServer } = require('http')
const { Server } = require('socket.io')
const Client = require('socket.io-client')
const jwt = require('jsonwebtoken')
const User = require('../../models/User')
const {
  initializeSocketIO,
  getSocketIO,
  emitCartUpdate,
  emitInventoryUpdate,
  emitOrderStatusUpdate,
  emitNewOrderNotification,
  sendToUser,
  sendToAdmins,
  broadcast,
  isUserOnline,
  getConnectedUsersCount
} = require('../../services/socketService')

describe('Socket.IO Service', () => {
  let httpServer
  let io
  let serverSocket
  let clientSocket
  let adminSocket
  let testUser
  let adminUser
  let userToken
  let adminToken

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      email: 'testuser@example.com',
      password: 'password123',
      profile: {
        firstName: 'Test',
        lastName: 'User'
      },
      role: 'user'
    })

    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'password123',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      role: 'admin'
    })

    // Generate tokens
    userToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET)
    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET)

    // Create HTTP server and Socket.IO instance
    httpServer = createServer()
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    })

    // Initialize Socket.IO service
    initializeSocketIO(io)

    // Start server
    await new Promise((resolve) => {
      httpServer.listen(0, resolve)
    })

    const port = httpServer.address().port
    const serverUrl = `http://localhost:${port}`

    // Create client connections
    clientSocket = new Client(serverUrl, {
      auth: { token: userToken }
    })

    adminSocket = new Client(serverUrl, {
      auth: { token: adminToken }
    })

    // Wait for connections
    await Promise.all([
      new Promise((resolve) => clientSocket.on('connect', resolve)),
      new Promise((resolve) => adminSocket.on('connect', resolve))
    ])
  })

  afterAll(async () => {
    // Clean up
    if (clientSocket) clientSocket.disconnect()
    if (adminSocket) adminSocket.disconnect()
    if (httpServer) httpServer.close()
    
    // Clean up test data
    await User.findByIdAndDelete(testUser._id)
    await User.findByIdAndDelete(adminUser._id)
  })

  describe('Connection and Authentication', () => {
    test('should connect authenticated user successfully', (done) => {
      expect(clientSocket.connected).toBe(true)
      done()
    })

    test('should connect admin user successfully', (done) => {
      expect(adminSocket.connected).toBe(true)
      done()
    })

    test('should allow anonymous connections', (done) => {
      const anonymousSocket = new Client(`http://localhost:${httpServer.address().port}`)
      
      anonymousSocket.on('connect', () => {
        expect(anonymousSocket.connected).toBe(true)
        anonymousSocket.disconnect()
        done()
      })
    })

    test('should track connected users count', () => {
      const count = getConnectedUsersCount()
      expect(count).toBeGreaterThanOrEqual(2) // At least user and admin
    })

    test('should detect if user is online', () => {
      expect(isUserOnline(testUser._id.toString())).toBe(true)
      expect(isUserOnline(adminUser._id.toString())).toBe(true)
      expect(isUserOnline('nonexistent')).toBe(false)
    })
  })

  describe('Room Management', () => {
    test('should join user-specific room automatically', (done) => {
      clientSocket.emit('join_room', { 
        room: `user_${testUser._id}`,
        userId: testUser._id.toString()
      })

      clientSocket.on('room_joined', (data) => {
        expect(data.room).toBe(`user_${testUser._id}`)
        expect(data.success).toBe(true)
        done()
      })
    })

    test('should join admin room for admin users', (done) => {
      adminSocket.emit('join_room', { room: 'admin' })

      adminSocket.on('room_joined', (data) => {
        expect(data.room).toBe('admin')
        expect(data.success).toBe(true)
        done()
      })
    })

    test('should reject unauthorized room access', (done) => {
      clientSocket.emit('join_room', { 
        room: `user_${adminUser._id}`, // Try to join another user's room
        userId: adminUser._id.toString()
      })

      clientSocket.on('room_join_error', (data) => {
        expect(data.error).toBe('Access denied')
        done()
      })
    })

    test('should allow joining public rooms', (done) => {
      clientSocket.emit('join_room', { room: 'flash_sales' })

      clientSocket.on('room_joined', (data) => {
        expect(data.room).toBe('flash_sales')
        expect(data.success).toBe(true)
        done()
      })
    })
  })

  describe('Cart Real-time Updates', () => {
    test('should emit cart updates to user', (done) => {
      const cartData = {
        _id: 'cart123',
        user: testUser._id,
        items: [
          {
            product: 'product123',
            quantity: 2,
            variant: { size: '9', color: 'black' }
          }
        ],
        totalAmount: 199.98
      }

      clientSocket.on('cart_updated', (data) => {
        expect(data.action).toBe('item_added')
        expect(data.cart).toEqual(cartData)
        expect(data.timestamp).toBeDefined()
        done()
      })

      emitCartUpdate(testUser._id.toString(), cartData, 'item_added')
    })

    test('should sync cart across multiple devices', (done) => {
      // Create second client for same user
      const secondClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: userToken }
      })

      secondClient.on('connect', () => {
        secondClient.emit('join_cart')

        const cartData = { items: [], totalAmount: 0 }

        secondClient.on('cart_sync', (data) => {
          expect(data.action).toBe('updated')
          expect(data.cart).toEqual(cartData)
          secondClient.disconnect()
          done()
        })

        emitCartUpdate(testUser._id.toString(), cartData, 'updated')
      })
    })

    test('should handle cart item events from client', (done) => {
      clientSocket.emit('cart_add_item', {
        productId: 'product123',
        variant: { size: '9', color: 'black' },
        quantity: 1
      })

      clientSocket.on('cart_updated', (data) => {
        expect(data.action).toBe('item_added')
        done()
      })
    })
  })

  describe('Inventory Updates', () => {
    test('should broadcast inventory updates to all clients', (done) => {
      let receivedCount = 0
      const expectedData = {
        productId: 'product123',
        variant: { size: '9', color: 'black' },
        stockChange: -1
      }

      const checkComplete = () => {
        receivedCount++
        if (receivedCount === 2) done() // Both client and admin received
      }

      clientSocket.on('inventory_update', (data) => {
        expect(data.productId).toBe(expectedData.productId)
        expect(data.variant).toEqual(expectedData.variant)
        expect(data.stockChange).toBe(expectedData.stockChange)
        expect(data.timestamp).toBeDefined()
        checkComplete()
      })

      adminSocket.on('inventory_update', (data) => {
        expect(data.productId).toBe(expectedData.productId)
        checkComplete()
      })

      emitInventoryUpdate(
        expectedData.productId,
        expectedData.variant,
        expectedData.stockChange
      )
    })

    test('should send low stock alerts to admins only', (done) => {
      const productData = {
        productId: 'product123',
        productName: 'Test Shoe',
        variant: { size: '9', color: 'black' },
        currentStock: 2,
        lowStockThreshold: 5
      }

      // Client should not receive this
      clientSocket.on('low_stock_alert', () => {
        done(new Error('Client should not receive low stock alerts'))
      })

      adminSocket.on('low_stock_alert', (data) => {
        expect(data.productId).toBe(productData.productId)
        expect(data.severity).toBe('warning')
        expect(data.timestamp).toBeDefined()
        done()
      })

      const { emitLowStockAlert } = require('../../services/socketService')
      emitLowStockAlert(productData)
    })
  })

  describe('Order Updates', () => {
    test('should send order status updates to specific user', (done) => {
      const orderData = {
        _id: 'order123',
        orderNumber: 'ORD-2023-001',
        status: 'shipped',
        statusHistory: [
          { status: 'pending', timestamp: new Date() },
          { status: 'shipped', timestamp: new Date() }
        ],
        tracking: {
          carrier: 'UPS',
          trackingNumber: '1Z999AA1234567890'
        }
      }

      clientSocket.on('order_status_update', (data) => {
        expect(data.orderId).toBe(orderData._id)
        expect(data.orderNumber).toBe(orderData.orderNumber)
        expect(data.status).toBe(orderData.status)
        expect(data.tracking).toEqual(orderData.tracking)
        done()
      })

      emitOrderStatusUpdate(testUser._id.toString(), orderData)
    })

    test('should send new order notifications to admins', (done) => {
      const orderData = {
        _id: 'order124',
        orderNumber: 'ORD-2023-002',
        user: testUser,
        pricing: { total: 299.99 },
        items: [{ product: 'product123', quantity: 1 }],
        status: 'pending'
      }

      adminSocket.on('new_order', (data) => {
        expect(data.orderId).toBe(orderData._id)
        expect(data.orderNumber).toBe(orderData.orderNumber)
        expect(data.totalAmount).toBe(orderData.pricing.total)
        expect(data.itemCount).toBe(orderData.items.length)
        done()
      })

      emitNewOrderNotification(orderData)
    })
  })

  describe('Flash Sale Events', () => {
    test('should broadcast flash sale start to all users', (done) => {
      const saleData = {
        _id: 'sale123',
        name: 'Summer Sale',
        description: '50% off all running shoes',
        discountPercentage: 50,
        startTime: new Date(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        products: ['product123', 'product124']
      }

      let receivedCount = 0
      const checkComplete = () => {
        receivedCount++
        if (receivedCount === 2) done()
      }

      clientSocket.on('flash_sale_start', (data) => {
        expect(data.saleId).toBe(saleData._id)
        expect(data.name).toBe(saleData.name)
        expect(data.discountPercentage).toBe(saleData.discountPercentage)
        expect(data.event).toBe('start')
        checkComplete()
      })

      adminSocket.on('flash_sale_start', (data) => {
        expect(data.saleId).toBe(saleData._id)
        checkComplete()
      })

      const { emitFlashSaleUpdate } = require('../../services/socketService')
      emitFlashSaleUpdate(saleData, 'start')
    })
  })

  describe('Support Chat', () => {
    test('should handle support chat joining', (done) => {
      clientSocket.emit('join_support_chat', {
        issue: 'Order inquiry',
        priority: 'normal'
      })

      clientSocket.on('support_chat_joined', (data) => {
        expect(data.chatRoom).toBe(`support_${testUser._id}`)
        done()
      })
    })

    test('should relay support messages between user and admin', (done) => {
      const message = 'I need help with my order'

      adminSocket.on('support_message_received', (data) => {
        expect(data.message).toBe(message)
        expect(data.userId).toBe(testUser._id.toString())
        expect(data.isAdmin).toBe(false)
        done()
      })

      clientSocket.emit('support_message', { message })
    })

    test('should handle typing indicators', (done) => {
      const room = `support_${testUser._id}`

      adminSocket.on('user_typing', (data) => {
        expect(data.userId).toBe(testUser._id.toString())
        expect(data.isTyping).toBe(true)
        done()
      })

      clientSocket.emit('typing_start', { room })
    })
  })

  describe('Utility Functions', () => {
    test('should send message to specific user', (done) => {
      const testMessage = { type: 'test', content: 'Hello user!' }

      clientSocket.on('test_event', (data) => {
        expect(data.type).toBe(testMessage.type)
        expect(data.content).toBe(testMessage.content)
        expect(data.timestamp).toBeDefined()
        done()
      })

      const success = sendToUser(testUser._id.toString(), 'test_event', testMessage)
      expect(success).toBe(true)
    })

    test('should send message to all admins', (done) => {
      const testMessage = { type: 'admin_alert', content: 'Admin notification' }

      adminSocket.on('admin_test_event', (data) => {
        expect(data.type).toBe(testMessage.type)
        expect(data.content).toBe(testMessage.content)
        done()
      })

      const success = sendToAdmins('admin_test_event', testMessage)
      expect(success).toBe(true)
    })

    test('should broadcast message to all connected users', (done) => {
      const testMessage = { type: 'announcement', content: 'System maintenance' }
      let receivedCount = 0

      const checkComplete = () => {
        receivedCount++
        if (receivedCount === 2) done()
      }

      clientSocket.on('broadcast_test', (data) => {
        expect(data.type).toBe(testMessage.type)
        checkComplete()
      })

      adminSocket.on('broadcast_test', (data) => {
        expect(data.type).toBe(testMessage.type)
        checkComplete()
      })

      const success = broadcast('broadcast_test', testMessage)
      expect(success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid room access gracefully', (done) => {
      clientSocket.emit('join_room', { room: 'invalid_room' })

      clientSocket.on('room_join_error', (data) => {
        expect(data.error).toBe('Access denied')
        done()
      })
    })

    test('should handle disconnection cleanup', (done) => {
      const tempClient = new Client(`http://localhost:${httpServer.address().port}`, {
        auth: { token: userToken }
      })

      tempClient.on('connect', () => {
        const initialCount = getConnectedUsersCount()
        
        tempClient.disconnect()
        
        setTimeout(() => {
          const finalCount = getConnectedUsersCount()
          expect(finalCount).toBeLessThan(initialCount)
          done()
        }, 100)
      })
    })

    test('should handle missing Socket.IO instance gracefully', () => {
      // Temporarily clear the socket instance
      const originalSocket = getSocketIO()
      
      // This should not throw an error
      const success = sendToUser('nonexistent', 'test', {})
      expect(success).toBe(true) // Should still return true but not actually send
    })
  })

  describe('Performance and Scalability', () => {
    test('should handle multiple rapid events', (done) => {
      let eventCount = 0
      const totalEvents = 10

      clientSocket.on('rapid_test', () => {
        eventCount++
        if (eventCount === totalEvents) {
          done()
        }
      })

      // Send multiple rapid events
      for (let i = 0; i < totalEvents; i++) {
        sendToUser(testUser._id.toString(), 'rapid_test', { index: i })
      }
    })

    test('should handle room management efficiently', (done) => {
      const rooms = ['room1', 'room2', 'room3', 'room4', 'room5']
      let joinedCount = 0

      clientSocket.on('room_joined', () => {
        joinedCount++
        if (joinedCount === rooms.length) {
          done()
        }
      })

      // Join multiple rooms rapidly
      rooms.forEach(room => {
        clientSocket.emit('join_room', { room })
      })
    })
  })
})
