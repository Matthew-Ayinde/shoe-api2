const express = require("express")
const router = express.Router()
const Order = require("../models/Order")
const Product = require("../models/Product")
const User = require("../models/User")
const { auth, requireRole } = require("../middleware/auth")
const { body, validationResult } = require("express-validator")
const socketService = require("../services/socketService")

// Apply auth and staff role to all routes
router.use(auth)
router.use(requireRole(["staff", "admin"]))

// Staff Dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))

    // Today's orders that need attention
    const pendingOrders = await Order.countDocuments({
      status: "pending",
    })

    const processingOrders = await Order.countDocuments({
      status: "processing",
    })

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: startOfDay },
    })

    // Recent orders for staff to process
    const recentOrders = await Order.find({
      status: { $in: ["pending", "confirmed", "processing"] },
    })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(20)

    // Low stock alerts
    const lowStockProducts = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lt: 10 } } },
      {
        $project: {
          name: 1,
          brand: 1,
          variant: "$variants",
        },
      },
      { $sort: { "variant.stock": 1 } },
      { $limit: 10 },
    ])

    res.json({
      success: true,
      data: {
        overview: {
          pendingOrders,
          processingOrders,
          todayOrders,
        },
        recentOrders,
        lowStockProducts,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching staff dashboard",
      error: error.message,
    })
  }
})

// Order Management for Staff
router.get("/orders", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const status = req.query.status || ""

    const query = {}
    if (status) {
      query.status = status
    }

    const orders = await Order.find(query)
      .populate("user", "firstName lastName email phone")
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

router.get("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "firstName lastName email phone addresses")
      .populate("items.productId", "name brand images")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.json({
      success: true,
      data: order,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order details",
      error: error.message,
    })
  }
})

router.patch(
  "/orders/:id/status",
  [
    body("status").isIn(["confirmed", "processing", "shipped", "delivered"]).withMessage("Invalid status for staff"),
    body("trackingNumber").optional().isString(),
    body("notes").optional().isString(),
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

      const { status, trackingNumber, notes } = req.body
      const updateData = {
        status,
        updatedBy: req.user.id,
        updatedAt: new Date(),
      }

      if (trackingNumber) {
        updateData["shipping.trackingNumber"] = trackingNumber
      }

      if (notes) {
        updateData.staffNotes = notes
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
        message: "Order updated successfully",
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating order",
        error: error.message,
      })
    }
  },
)

// Customer Support
router.get("/customers", async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 20
    const search = req.query.search || ""

    const query = { role: "customer" }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ]
    }

    const customers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        customers,
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
      message: "Error fetching customers",
      error: error.message,
    })
  }
})

router.get("/customers/:id/orders", async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(50)

    res.json({
      success: true,
      data: orders,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching customer orders",
      error: error.message,
    })
  }
})

// Inventory Management (Limited for Staff)
router.get("/inventory/alerts", async (req, res) => {
  try {
    const lowStockProducts = await Product.aggregate([
      { $unwind: "$variants" },
      { $match: { "variants.stock": { $lt: 10 } } },
      {
        $project: {
          name: 1,
          brand: 1,
          category: 1,
          variant: "$variants",
          images: { $slice: ["$images", 1] },
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
      message: "Error fetching inventory alerts",
      error: error.message,
    })
  }
})

module.exports = router
