/**
 * Analytics Routes
 * 
 * Provides comprehensive analytics and reporting endpoints for:
 * - Sales analytics and revenue tracking
 * - Product performance metrics
 * - User behavior analytics
 * - Inventory analytics
 * - Real-time dashboard data
 * - Custom report generation
 * 
 * Access Control:
 * - Most endpoints require admin/staff access
 * - Some basic metrics available to authenticated users
 * - Real-time dashboard data for admin users
 */

const express = require("express")
const { authenticate } = require("../middleware/auth")
const { requireRole } = require("../middleware/auth")
const { validatePagination } = require("../middleware/validation")
const { AnalyticsService } = require("../services/analyticsService")

const router = express.Router()

/**
 * @desc    Get sales analytics
 * @route   GET /api/analytics/sales
 * @access  Private (Admin/Staff)
 */
router.get("/sales", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      groupBy = "day",
    } = req.query

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    // Validate date range
    if (start >= end) {
      return res.status(400).json({
        status: "error",
        message: "Start date must be before end date",
      })
    }

    // Validate groupBy parameter
    if (!["day", "week", "month"].includes(groupBy)) {
      return res.status(400).json({
        status: "error",
        message: "groupBy must be one of: day, week, month",
      })
    }

    const result = await AnalyticsService.getSalesAnalytics(start, end, groupBy)

    if (!result.success) {
      return res.status(500).json({
        status: "error",
        message: result.error,
      })
    }

    res.json({
      status: "success",
      data: result.data,
      fromCache: result.fromCache || false,
    })
  } catch (error) {
    console.error("Get sales analytics error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get sales analytics",
    })
  }
})

/**
 * @desc    Get product performance analytics
 * @route   GET /api/analytics/products
 * @access  Private (Admin/Staff)
 */
router.get("/products", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      limit = 20,
      sortBy = "revenue",
    } = req.query

    // Validate sortBy parameter
    if (!["revenue", "totalSold"].includes(sortBy)) {
      return res.status(400).json({
        status: "error",
        message: "sortBy must be one of: revenue, totalSold",
      })
    }

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit),
      sortBy,
    }

    const result = await AnalyticsService.getProductAnalytics(options)

    if (!result.success) {
      return res.status(500).json({
        status: "error",
        message: result.error,
      })
    }

    res.json({
      status: "success",
      data: result.data,
      fromCache: result.fromCache || false,
    })
  } catch (error) {
    console.error("Get product analytics error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get product analytics",
    })
  }
})

/**
 * @desc    Get user behavior analytics
 * @route   GET /api/analytics/users
 * @access  Private (Admin/Staff)
 */
router.get("/users", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
    } = req.query

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    }

    const result = await AnalyticsService.getUserAnalytics(options)

    if (!result.success) {
      return res.status(500).json({
        status: "error",
        message: result.error,
      })
    }

    res.json({
      status: "success",
      data: result.data,
      fromCache: result.fromCache || false,
    })
  } catch (error) {
    console.error("Get user analytics error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get user analytics",
    })
  }
})

/**
 * @desc    Get inventory analytics
 * @route   GET /api/analytics/inventory
 * @access  Private (Admin/Staff)
 */
router.get("/inventory", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const result = await AnalyticsService.getInventoryAnalytics()

    if (!result.success) {
      return res.status(500).json({
        status: "error",
        message: result.error,
      })
    }

    res.json({
      status: "success",
      data: result.data,
      fromCache: result.fromCache || false,
    })
  } catch (error) {
    console.error("Get inventory analytics error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get inventory analytics",
    })
  }
})

/**
 * @desc    Get real-time dashboard data
 * @route   GET /api/analytics/dashboard
 * @access  Private (Admin/Staff)
 */
router.get("/dashboard", authenticate, requireRole(["admin", "staff"]), async (req, res) => {
  try {
    const result = await AnalyticsService.getDashboardData()

    if (!result.success) {
      return res.status(500).json({
        status: "error",
        message: result.error,
      })
    }

    res.json({
      status: "success",
      data: result.data,
      fromCache: result.fromCache || false,
    })
  } catch (error) {
    console.error("Get dashboard data error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get dashboard data",
    })
  }
})

/**
 * @desc    Clear analytics cache
 * @route   DELETE /api/analytics/cache
 * @access  Private (Admin only)
 */
router.delete("/cache", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const { pattern = "analytics:*" } = req.query

    const success = await AnalyticsService.clearCache(pattern)

    if (!success) {
      return res.status(500).json({
        status: "error",
        message: "Failed to clear cache",
      })
    }

    res.json({
      status: "success",
      message: "Analytics cache cleared successfully",
    })
  } catch (error) {
    console.error("Clear analytics cache error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to clear analytics cache",
    })
  }
})

/**
 * @desc    Get basic user statistics (for authenticated users)
 * @route   GET /api/analytics/my-stats
 * @access  Private
 */
router.get("/my-stats", authenticate, async (req, res) => {
  try {
    const Order = require("../models/Order")
    const Review = require("../models/Review")

    // Get user's order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
          user: req.user._id,
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ])

    // Get user's review statistics
    const reviewStats = await Review.aggregate([
      {
        $match: {
          user: req.user._id,
          moderationStatus: "approved",
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ])

    const userStats = {
      orders: orderStats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 },
      reviews: reviewStats[0] || { totalReviews: 0, averageRating: 0 },
      memberSince: req.user.createdAt,
    }

    res.json({
      status: "success",
      data: userStats,
    })
  } catch (error) {
    console.error("Get user stats error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get user statistics",
    })
  }
})

module.exports = router
