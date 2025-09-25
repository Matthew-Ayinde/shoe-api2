let io = null

const initializeSocketIO = (socketIO) => {
  io = socketIO

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`)

    // Join admin room for admin users
    socket.on("join_admin", (data) => {
      if (data.role === "admin" || data.role === "staff") {
        socket.join("admin")
        console.log(`Admin user ${socket.id} joined admin room`)
      }
    })

    // Join user-specific room
    socket.on("join_user", (data) => {
      if (data.userId) {
        socket.join(`user_${data.userId}`)
        console.log(`User ${socket.id} joined room user_${data.userId}`)
      }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`)
    })
  })

  return io
}

const getSocketIO = () => {
  return io
}

// Emit inventory update to all connected clients
const emitInventoryUpdate = (productId, variant) => {
  if (io) {
    io.emit("inventory_update", {
      productId,
      variant,
      timestamp: new Date(),
    })
  }
}

// Emit low stock alert to admin users
const emitLowStockAlert = (productData) => {
  if (io) {
    io.to("admin").emit("low_stock_alert", {
      ...productData,
      timestamp: new Date(),
    })
  }
}

// Emit order status update to specific user
const emitOrderStatusUpdate = (userId, orderData) => {
  if (io) {
    io.to(`user_${userId}`).emit("order_status_update", {
      ...orderData,
      timestamp: new Date(),
    })
  }
}

// Emit flash sale start/end notifications
const emitFlashSaleUpdate = (saleData, event) => {
  if (io) {
    io.emit(`flash_sale_${event}`, {
      ...saleData,
      timestamp: new Date(),
    })
  }
}

// Emit new order notification to admin
const emitNewOrderNotification = (orderData) => {
  if (io) {
    io.to("admin").emit("new_order", {
      ...orderData,
      timestamp: new Date(),
    })
  }
}

module.exports = {
  initializeSocketIO,
  getSocketIO,
  emitInventoryUpdate,
  emitLowStockAlert,
  emitOrderStatusUpdate,
  emitFlashSaleUpdate,
  emitNewOrderNotification,
}
