const express = require("express")
const Order = require("../models/Order")
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const User = require("../models/User")
const { authenticate } = require("../middleware/auth")
const { isStaffOrAdmin } = require("../middleware/roles")
const { validateOrder, validatePagination, validateObjectId } = require("../middleware/validation")
const { reserveStock, releaseStock } = require("../services/inventoryService")
const { sendOrderConfirmationEmail } = require("../services/emailService")
const { calculateShippingCost, calculateTax, getPaginationInfo } = require("../utils/helpers")
const { emitOrderStatusUpdate, emitNewOrderNotification } = require("../services/socketService")

const router = express.Router()

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post("/", authenticate, validateOrder, async (req, res) => {
  try {
    const { items, shippingAddress, shippingMethod = "standard", customerNotes, isGift, giftMessage } = req.body

    // Validate user has items in cart or items are provided
    let orderItems = items
    if (!orderItems || orderItems.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id }).populate("items.product")
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No items to order",
        })
      }
      orderItems = cart.items
    }

    // Validate and prepare order items
    const processedItems = []
    let subtotal = 0

    for (const item of orderItems) {
      const product = await Product.findById(item.product._id || item.product)

      if (!product || !product.isActive) {
        return res.status(400).json({
          status: "error",
          message: `Product ${item.product.name || item.product} is not available`,
        })
      }

      const variant = product.getVariant(item.variant.size, item.variant.color)

      if (!variant || !variant.isActive) {
        return res.status(400).json({
          status: "error",
          message: `Variant ${item.variant.size} ${item.variant.color} is not available`,
        })
      }

      if (variant.stock < item.quantity) {
        return res.status(400).json({
          status: "error",
          message: `Only ${variant.stock} items available for ${product.name} - ${item.variant.color} (Size ${item.variant.size})`,
        })
      }

      const itemTotal = variant.price * item.quantity

      processedItems.push({
        product: product._id,
        productSnapshot: {
          name: product.name,
          brand: product.brand,
          image: product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url,
        },
        variant: {
          size: item.variant.size,
          color: item.variant.color,
          sku: variant.sku,
        },
        quantity: item.quantity,
        price: variant.price,
        totalPrice: itemTotal,
      })

      subtotal += itemTotal
    }

    // Calculate costs
    const shippingCost = calculateShippingCost(processedItems, shippingMethod)
    const tax = calculateTax(subtotal)
    const totalAmount = subtotal + shippingCost + tax

    // Reserve stock
    const stockReservation = await reserveStock(processedItems)
    if (!stockReservation.success) {
      return res.status(400).json({
        status: "error",
        message: stockReservation.error,
      })
    }

    try {
      // Create order
      const order = new Order({
        user: req.user._id,
        items: processedItems,
        subtotal,
        tax,
        shippingCost,
        totalAmount,
        shippingAddress,
        shippingMethod,
        customerNotes,
        isGift,
        giftMessage,
        payment: {
          method: "dummy", // Will be updated by payment processing
          status: "pending",
        },
      })

      await order.save()

      // Clear user's cart if items came from cart
      if (!items) {
        await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] })
      }

      // Send order confirmation email
      try {
        await sendOrderConfirmationEmail(order, req.user)
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError)
      }

      // Emit new order notification to admin
      emitNewOrderNotification({
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: `${req.user.profile.firstName} ${req.user.profile.lastName}`,
        totalAmount: order.totalAmount,
        itemCount: order.items.length,
      })

      // Populate order for response
      await order.populate("user", "profile email")

      res.status(201).json({
        status: "success",
        message: "Order created successfully",
        data: {
          order,
        },
      })
    } catch (orderError) {
      // Release reserved stock if order creation fails
      await releaseStock(stockReservation.reservations)
      throw orderError
    }
  } catch (error) {
    console.error("Create order error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to create order",
    })
  }
})

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
router.get("/", authenticate, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query

    const filter = { user: req.user._id }
    if (status) filter.status = status

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("items.product", "name brand images slug")
      .select("-__v")

    const total = await Order.countDocuments(filter)
    const pagination = getPaginationInfo(Number.parseInt(page), Number.parseInt(limit), total)

    res.json({
      status: "success",
      data: {
        orders,
        pagination,
      },
    })
  } catch (error) {
    console.error("Get orders error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch orders",
    })
  }
})

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
router.get("/:id", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const order = await Order.findById(id)
      .populate("user", "profile email")
      .populate("items.product", "name brand images slug")

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      })
    }

    // Check if user owns the order or is staff/admin
    if (order.user._id.toString() !== req.user._id.toString() && !["staff", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      })
    }

    res.json({
      status: "success",
      data: {
        order,
      },
    })
  } catch (error) {
    console.error("Get order error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch order",
    })
  }
})

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put("/:id/cancel", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      })
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      })
    }

    // Check if order can be cancelled
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        status: "error",
        message: "Order cannot be cancelled at this stage",
      })
    }

    // Release stock back to inventory
    const stockItems = order.items.map((item) => ({
      product: item.product,
      variant: {
        size: item.variant.size,
        color: item.variant.color,
      },
      quantity: item.quantity,
    }))

    await releaseStock(stockItems)

    // Update order status
    order.updateStatus("cancelled")
    order.adminNotes = `Cancelled by customer. Reason: ${reason || "No reason provided"}`
    await order.save()

    // Emit order status update
    emitOrderStatusUpdate(req.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: "Your order has been cancelled",
    })

    res.json({
      status: "success",
      message: "Order cancelled successfully",
      data: {
        order,
      },
    })
  } catch (error) {
    console.error("Cancel order error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to cancel order",
    })
  }
})

// @desc    Get all orders (Admin/Staff)
// @route   GET /api/orders/admin/all
// @access  Private (Staff/Admin)
router.get("/admin/all", authenticate, isStaffOrAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query

    const filter = {}
    if (status) filter.status = status

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    // Search filter
    if (search) {
      filter.$or = [
        { orderNumber: new RegExp(search, "i") },
        { "shippingAddress.firstName": new RegExp(search, "i") },
        { "shippingAddress.lastName": new RegExp(search, "i") },
      ]
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("user", "profile email")
      .populate("items.product", "name brand")
      .select("-__v")

    const total = await Order.countDocuments(filter)
    const pagination = getPaginationInfo(Number.parseInt(page), Number.parseInt(limit), total)

    res.json({
      status: "success",
      data: {
        orders,
        pagination,
      },
    })
  } catch (error) {
    console.error("Get all orders error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch orders",
    })
  }
})

// @desc    Update order status (Admin/Staff)
// @route   PUT /api/orders/:id/status
// @access  Private (Staff/Admin)
router.put("/:id/status", authenticate, isStaffOrAdmin, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { status, adminNotes, tracking } = req.body

    const order = await Order.findById(id).populate("user", "profile email")

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      })
    }

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status",
      })
    }

    // Update order
    order.updateStatus(status)
    if (adminNotes) order.adminNotes = adminNotes
    if (tracking) {
      order.tracking = {
        ...order.tracking,
        ...tracking,
      }
    }

    await order.save()

    // Emit order status update to customer
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: `Your order is now ${status}`,
      tracking: order.tracking,
    })

    res.json({
      status: "success",
      message: "Order status updated successfully",
      data: {
        order,
      },
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update order status",
    })
  }
})

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/admin/stats
// @access  Private (Admin)
router.get("/admin/stats", authenticate, isStaffOrAdmin, async (req, res) => {
  try {
    const { period = "30d" } = req.query

    const startDate = new Date()
    switch (period) {
      case "7d":
        startDate.setDate(startDate.getDate() - 7)
        break
      case "30d":
        startDate.setDate(startDate.getDate() - 30)
        break
      case "90d":
        startDate.setDate(startDate.getDate() - 90)
        break
      case "1y":
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(startDate.getDate() - 30)
    }

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ])

    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    res.json({
      status: "success",
      data: {
        summary: stats[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          confirmedOrders: 0,
          shippedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
        },
        dailyStats,
        period,
      },
    })
  } catch (error) {
    console.error("Get order stats error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch order statistics",
    })
  }
})

module.exports = router
