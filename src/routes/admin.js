const express = require("express")
const router = express.Router()
const User = require("../models/User")
const Product = require("../models/Product")
const Order = require("../models/Order")
const Coupon = require("../models/Coupon")
const FlashSale = require("../models/FlashSale")
const { auth, requireRole } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")
const socketService = require("../services/socketService")

// Apply auth and admin role to all routes
router.use(auth)
router.use(requireRole(["admin"]))

// Dashboard Analytics
router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const startOfWeek = new Date(today.setDate(today.getDate() - 7))
    const startOfMonth = new Date(today.setMonth(today.getMonth() - 1))

    // Get basic counts
    const totalUsers = await User.countDocuments({ role: "customer" })
    const totalProducts = await Product.countDocuments({ isActive: true })
    const totalOrders = await Order.countDocuments()

    // Today's stats
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfDay },
    })

    const todayRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ])

    // Weekly stats
    const weeklyOrders = await Order.countDocuments({
      createdAt: { $gte: startOfWeek },
    })

    const weeklyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfWeek }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ])

    // Monthly stats
    const monthlyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ])

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ])

    // Recent orders
    const recentOrders = await Order.find()
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(10)

    // Low stock products
    const lowStockProducts = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lt: 10 } } },
      {
        $project: {
          name: 1,
          brand: 1,
          variant: "$variants",
          totalStock: { $sum: "$variants.stock" },
        },
      },
      { $sort: { "variant.stock": 1 } },
      { $limit: 20 },
    ])

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProducts,
          totalOrders,
          todayOrders,
          weeklyOrders,
          todayRevenue: todayRevenue[0]?.total || 0,
          weeklyRevenue: weeklyRevenue[0]?.total || 0,
          monthlyRevenue: monthlyRevenue[0]?.total || 0,
        },
        topProducts,
        recentOrders,
        lowStockProducts,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    })
  }
})

// User Management
router.get("/users", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const search = req.query.search || ""
    const role = req.query.role || ""

    const query = {}
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }
    if (role) {
      query.role = role
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    })
  }
})

router.patch(
  "/users/:id/role",
  [body("role").isIn(["customer", "staff", "admin"]).withMessage("Invalid role")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        })
      }

      const { role } = req.body
      const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password")

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      res.json({
        success: true,
        data: user,
        message: "User role updated successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating user role",
        error: error.message,
      })
    }
  },
)

router.patch(
  "/users/:id/status",
  [body("isActive").isBoolean().withMessage("Status must be boolean")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        })
      }

      const { isActive } = req.body
      const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true }).select("-password")

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }

      res.json({
        success: true,
        data: user,
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating user status",
        error: error.message,
      })
    }
  },
)

// Order Management
router.get("/orders", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const status = req.query.status || ""
    const search = req.query.search || ""

    const query = {}
    if (status) {
      query.status = status
    }
    if (search) {
      // Search by order ID or user email
      const users = await User.find({
        email: { $regex: search, $options: "i" },
      }).select("_id")

      query.$or = [{ _id: { $regex: search, $options: "i" } }, { user: { $in: users.map((u) => u._id) } }]
    }

    const orders = await Order.find(query)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Order.countDocuments(query)

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    })
  }
})

router.patch(
  "/orders/:id/status",
  [
    body("status")
      .isIn(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"])
      .withMessage("Invalid status"),
    body("trackingNumber").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        })
      }

      const { status, trackingNumber } = req.body
      const updateData = { status }

      if (trackingNumber) {
        updateData["shipping.trackingNumber"] = trackingNumber
      }

      const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate(
        "user",
        "firstName lastName email",
      )

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        })
      }

      // Send real-time update
      socketService.emitToUser(order.user._id, "orderStatusUpdate", {
        orderId: order._id,
        status: order.status,
        trackingNumber: order.shipping?.trackingNumber,
      })

      res.json({
        success: true,
        data: order,
        message: "Order status updated successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating order status",
        error: error.message,
      })
    }
  },
)

// Analytics Routes
router.get("/analytics/sales", async (req, res) => {
  try {
    const { period = "30d", startDate, endDate } = req.query

    let dateFilter = {}
    const now = new Date()

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else {
      switch (period) {
        case "7d":
          dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) }
          break
        case "30d":
          dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 30)) }
          break
        case "90d":
          dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 90)) }
          break
        case "1y":
          dateFilter.createdAt = { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) }
          break
      }
    }

    const salesData = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
          items: { $sum: { $size: "$items" } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ])

    res.json({
      success: true,
      data: salesData,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sales analytics",
      error: error.message,
    })
  }
})

router.get("/analytics/products", async (req, res) => {
  try {
    const { period = "30d" } = req.query

    const dateFilter = {}
    const now = new Date()

    switch (period) {
      case "7d":
        dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)) }
        break
      case "30d":
        dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 30)) }
        break
      case "90d":
        dateFilter.createdAt = { $gte: new Date(now.setDate(now.getDate() - 90)) }
        break
    }

    const productAnalytics = await Order.aggregate([
      { $match: { ...dateFilter, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ])

    res.json({
      success: true,
      data: productAnalytics,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product analytics",
      error: error.message,
    })
  }
})

// Inventory Management
router.get("/inventory/low-stock", async (req, res) => {
  try {
    const threshold = Number.parseInt(req.query.threshold) || 10

    const lowStockProducts = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lte: threshold } } },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          variant: "$variants",
          images: 1,
        },
      },
      { $sort: { "variant.stock": 1 } },
    ])

    res.json({
      success: true,
      data: lowStockProducts,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching low stock products",
      error: error.message,
    })
  }
})

router.patch(
  "/inventory/:productId/variant/:variantId/stock",
  [body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        })
      }

      const { productId, variantId } = req.params
      const { stock } = req.body

      const product = await Product.findOneAndUpdate(
        { _id: productId, "variants._id": variantId },
        { $set: { "variants.$.stock": stock } },
        { new: true },
      )

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product or variant not found",
        })
      }

      // Emit real-time inventory update
      socketService.emitToAll("inventoryUpdate", {
        productId,
        variantId,
        stock,
      })

      res.json({
        success: true,
        data: product,
        message: "Stock updated successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating stock",
        error: error.message,
      })
    }
  },
)

// System Settings
router.get("/settings", async (req, res) => {
  try {
    // This would typically come from a settings collection
    const settings = {
      siteName: "Shoe Store",
      currency: "USD",
      taxRate: 0.08,
      shippingRates: [
        { name: "Standard", price: 5.99, days: "5-7" },
        { name: "Express", price: 12.99, days: "2-3" },
        { name: "Overnight", price: 24.99, days: "1" },
      ],
      emailSettings: {
        fromName: "Shoe Store",
        fromEmail: process.env.EMAIL_FROM,
      },
      notifications: {
        lowStockThreshold: 10,
        enablePushNotifications: true,
        enableEmailNotifications: true,
      },
    }

    res.json({
      success: true,
      data: settings,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching settings",
      error: error.message,
    })
  }
})

module.exports = router
