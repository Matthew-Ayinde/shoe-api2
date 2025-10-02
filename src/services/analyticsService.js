/**
 * Analytics Service
 * 
 * Provides comprehensive analytics and reporting for the shoe ecommerce platform.
 * Features include:
 * - Sales analytics and revenue tracking
 * - Product performance metrics
 * - User behavior analytics
 * - Inventory analytics
 * - Marketing campaign performance
 * - Real-time dashboard data
 * - Custom report generation
 */

const mongoose = require("mongoose")
const Order = require("../models/Order")
const Product = require("../models/Product")
const User = require("../models/User")
const { getRedisClient, REDIS_KEYS, setCache, getCache } = require("../config/redis")

/**
 * Analytics Service Class
 */
class AnalyticsService {
  /**
   * Get sales analytics for a date range
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} groupBy - Group by period (day, week, month)
   * @returns {Promise<Object>} Sales analytics data
   */
  static async getSalesAnalytics(startDate, endDate, groupBy = "day") {
    try {
      const cacheKey = `analytics:sales:${startDate.toISOString()}:${endDate.toISOString()}:${groupBy}`
      const cached = await getCache(cacheKey)
      
      if (cached) {
        return { success: true, data: cached, fromCache: true }
      }

      // Define grouping format based on period
      const groupFormats = {
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        week: { $dateToString: { format: "%Y-W%U", date: "$createdAt" } },
        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
      }

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["cancelled"] },
            "payment.status": "completed",
          },
        },
        {
          $group: {
            _id: groupFormats[groupBy],
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
            totalDiscount: { $sum: "$discountAmount" },
            averageOrderValue: { $avg: "$totalAmount" },
            totalItems: { $sum: { $size: "$items" } },
            uniqueCustomers: { $addToSet: "$user" },
          },
        },
        {
          $addFields: {
            uniqueCustomerCount: { $size: "$uniqueCustomers" },
          },
        },
        {
          $project: {
            uniqueCustomers: 0, // Remove the array to reduce response size
          },
        },
        { $sort: { _id: 1 } },
      ]

      const results = await Order.aggregate(pipeline)

      // Calculate totals and growth
      const totals = results.reduce(
        (acc, item) => ({
          orders: acc.orders + item.totalOrders,
          revenue: acc.revenue + item.totalRevenue,
          discount: acc.discount + item.totalDiscount,
          items: acc.items + item.totalItems,
          customers: acc.customers + item.uniqueCustomerCount,
        }),
        { orders: 0, revenue: 0, discount: 0, items: 0, customers: 0 }
      )

      const analytics = {
        period: { startDate, endDate, groupBy },
        totals: {
          ...totals,
          averageOrderValue: totals.orders > 0 ? totals.revenue / totals.orders : 0,
        },
        timeline: results,
        generatedAt: new Date(),
      }

      // Cache for 1 hour
      await setCache(cacheKey, analytics, 3600)

      return { success: true, data: analytics }
    } catch (error) {
      console.error("Get sales analytics error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get product performance analytics
   * 
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Product analytics data
   */
  static async getProductAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        limit = 20,
        sortBy = "revenue",
      } = options

      const cacheKey = `analytics:products:${startDate.toISOString()}:${endDate.toISOString()}:${sortBy}:${limit}`
      const cached = await getCache(cacheKey)
      
      if (cached) {
        return { success: true, data: cached, fromCache: true }
      }

      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["cancelled"] },
            "payment.status": "completed",
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.totalPrice" },
            totalOrders: { $sum: 1 },
            averagePrice: { $avg: "$items.price" },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $project: {
            productId: "$_id",
            name: "$product.name",
            brand: "$product.brand",
            category: "$product.category",
            totalSold: 1,
            totalRevenue: 1,
            totalOrders: 1,
            averagePrice: 1,
            currentStock: "$product.totalStock",
            rating: "$product.ratings.average",
          },
        },
        { $sort: { [sortBy === "revenue" ? "totalRevenue" : "totalSold"]: -1 } },
        { $limit: limit },
      ]

      const results = await Order.aggregate(pipeline)

      const analytics = {
        period: { startDate, endDate },
        products: results,
        generatedAt: new Date(),
      }

      // Cache for 30 minutes
      await setCache(cacheKey, analytics, 1800)

      return { success: true, data: analytics }
    } catch (error) {
      console.error("Get product analytics error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get user behavior analytics
   * 
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} User analytics data
   */
  static async getUserAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
      } = options

      const cacheKey = `analytics:users:${startDate.toISOString()}:${endDate.toISOString()}`
      const cached = await getCache(cacheKey)
      
      if (cached) {
        return { success: true, data: cached, fromCache: true }
      }

      // New user registrations
      const newUsers = await User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        role: "customer",
      })

      // Active users (users who placed orders)
      const activeUsers = await Order.distinct("user", {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ["cancelled"] },
      })

      // Customer lifetime value
      const clvPipeline = [
        {
          $match: {
            status: { $nin: ["cancelled"] },
            "payment.status": "completed",
          },
        },
        {
          $group: {
            _id: "$user",
            totalSpent: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            firstOrder: { $min: "$createdAt" },
            lastOrder: { $max: "$createdAt" },
          },
        },
        {
          $group: {
            _id: null,
            averageLifetimeValue: { $avg: "$totalSpent" },
            averageOrderCount: { $avg: "$orderCount" },
            totalCustomers: { $sum: 1 },
          },
        },
      ]

      const clvResults = await Order.aggregate(clvPipeline)
      const clvData = clvResults[0] || {
        averageLifetimeValue: 0,
        averageOrderCount: 0,
        totalCustomers: 0,
      }

      // User acquisition by source (if tracking is implemented)
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ])

      const analytics = {
        period: { startDate, endDate },
        newUsers,
        activeUsers: activeUsers.length,
        customerLifetimeValue: clvData.averageLifetimeValue,
        averageOrdersPerCustomer: clvData.averageOrderCount,
        totalCustomers: clvData.totalCustomers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, {}),
        generatedAt: new Date(),
      }

      // Cache for 1 hour
      await setCache(cacheKey, analytics, 3600)

      return { success: true, data: analytics }
    } catch (error) {
      console.error("Get user analytics error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get inventory analytics
   * 
   * @returns {Promise<Object>} Inventory analytics data
   */
  static async getInventoryAnalytics() {
    try {
      const cacheKey = "analytics:inventory"
      const cached = await getCache(cacheKey)
      
      if (cached) {
        return { success: true, data: cached, fromCache: true }
      }

      const pipeline = [
        { $match: { isActive: true } },
        { $unwind: "$variants" },
        {
          $group: {
            _id: null,
            totalProducts: { $addToSet: "$_id" },
            totalVariants: { $sum: 1 },
            totalStock: { $sum: "$variants.stock" },
            lowStockVariants: {
              $sum: {
                $cond: [
                  { $lte: ["$variants.stock", "$variants.lowStockThreshold"] },
                  1,
                  0,
                ],
              },
            },
            outOfStockVariants: {
              $sum: { $cond: [{ $eq: ["$variants.stock", 0] }, 1, 0] },
            },
            averageStock: { $avg: "$variants.stock" },
          },
        },
        {
          $addFields: {
            totalProducts: { $size: "$totalProducts" },
          },
        },
      ]

      const results = await Product.aggregate(pipeline)
      const inventoryData = results[0] || {
        totalProducts: 0,
        totalVariants: 0,
        totalStock: 0,
        lowStockVariants: 0,
        outOfStockVariants: 0,
        averageStock: 0,
      }

      // Get top categories by stock
      const categoryStock = await Product.aggregate([
        { $match: { isActive: true } },
        { $unwind: "$variants" },
        {
          $group: {
            _id: "$category",
            totalStock: { $sum: "$variants.stock" },
            productCount: { $addToSet: "$_id" },
          },
        },
        {
          $addFields: {
            productCount: { $size: "$productCount" },
          },
        },
        { $sort: { totalStock: -1 } },
      ])

      const analytics = {
        ...inventoryData,
        categoryBreakdown: categoryStock,
        stockHealthScore: this.calculateStockHealthScore(inventoryData),
        generatedAt: new Date(),
      }

      // Cache for 15 minutes
      await setCache(cacheKey, analytics, 900)

      return { success: true, data: analytics }
    } catch (error) {
      console.error("Get inventory analytics error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get real-time dashboard data
   * 
   * @returns {Promise<Object>} Dashboard data
   */
  static async getDashboardData() {
    try {
      const cacheKey = "analytics:dashboard"
      const cached = await getCache(cacheKey)
      
      if (cached) {
        return { success: true, data: cached, fromCache: true }
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Today's metrics
      const todayMetrics = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: today },
            status: { $nin: ["cancelled"] },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
          },
        },
      ])

      // Yesterday's metrics for comparison
      const yesterdayMetrics = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterday, $lt: today },
            status: { $nin: ["cancelled"] },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ])

      const todayData = todayMetrics[0] || { orders: 0, revenue: 0, pendingOrders: 0 }
      const yesterdayData = yesterdayMetrics[0] || { orders: 0, revenue: 0 }

      // Calculate growth percentages
      const orderGrowth = yesterdayData.orders > 0 
        ? ((todayData.orders - yesterdayData.orders) / yesterdayData.orders) * 100 
        : 0

      const revenueGrowth = yesterdayData.revenue > 0 
        ? ((todayData.revenue - yesterdayData.revenue) / yesterdayData.revenue) * 100 
        : 0

      // Recent orders
      const recentOrders = await Order.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .populate("user", "profile.firstName profile.lastName email")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()

      const dashboard = {
        today: {
          orders: todayData.orders,
          revenue: todayData.revenue,
          pendingOrders: todayData.pendingOrders,
          orderGrowth,
          revenueGrowth,
        },
        recentOrders,
        generatedAt: new Date(),
      }

      // Cache for 5 minutes
      await setCache(cacheKey, dashboard, 300)

      return { success: true, data: dashboard }
    } catch (error) {
      console.error("Get dashboard data error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Calculate stock health score
   * 
   * @param {Object} inventoryData - Inventory data
   * @returns {number} Health score (0-100)
   */
  static calculateStockHealthScore(inventoryData) {
    if (inventoryData.totalVariants === 0) return 0

    const outOfStockRatio = inventoryData.outOfStockVariants / inventoryData.totalVariants
    const lowStockRatio = inventoryData.lowStockVariants / inventoryData.totalVariants

    // Score calculation: penalize out of stock more than low stock
    const score = 100 - (outOfStockRatio * 60) - (lowStockRatio * 30)
    
    return Math.max(0, Math.round(score))
  }

  /**
   * Clear analytics cache
   * 
   * @param {string} pattern - Cache pattern to clear
   * @returns {Promise<boolean>} Success status
   */
  static async clearCache(pattern = "analytics:*") {
    try {
      const redisClient = getRedisClient()
      if (!redisClient) return false

      const keys = await redisClient.keys(pattern)
      if (keys.length > 0) {
        await redisClient.del(keys)
      }

      return true
    } catch (error) {
      console.error("Clear analytics cache error:", error)
      return false
    }
  }
}

module.exports = {
  AnalyticsService,
}
