const cron = require("node-cron")
const FlashSale = require("../models/FlashSale")
const { emitFlashSaleUpdate } = require("./socketService")

let cronJobs = []

const startCronJobs = () => {
  console.log("Starting cron jobs...")

  // Check for flash sale start/end every minute
  const flashSaleJob = cron.schedule("* * * * *", async () => {
    await checkFlashSaleStatus()
  })

  // Clean up expired coupons daily at midnight
  const couponCleanupJob = cron.schedule("0 0 * * *", async () => {
    await cleanupExpiredCoupons()
  })

  // Generate daily reports at 1 AM
  const dailyReportJob = cron.schedule("0 1 * * *", async () => {
    await generateDailyReports()
  })

  cronJobs.push(flashSaleJob, couponCleanupJob, dailyReportJob)
  console.log("Cron jobs started successfully")
}

const stopCronJobs = () => {
  cronJobs.forEach((job) => {
    if (job && typeof job.stop === 'function') {
      job.stop()
    }
  })
  cronJobs = []
  console.log("Cron jobs stopped")
}

// Check flash sale status and emit updates
const checkFlashSaleStatus = async () => {
  try {
    const now = new Date()

    // Find flash sales that just started
    const justStarted = await FlashSale.find({
      isActive: true,
      startTime: {
        $gte: new Date(now.getTime() - 60000), // Within last minute
        $lte: now,
      },
    }).populate("products.product", "name brand images")

    // Find flash sales that just ended
    const justEnded = await FlashSale.find({
      isActive: true,
      endTime: {
        $gte: new Date(now.getTime() - 60000), // Within last minute
        $lte: now,
      },
    }).populate("products.product", "name brand images")

    // Emit flash sale start notifications
    for (const sale of justStarted) {
      console.log(`Flash sale started: ${sale.name}`)
      emitFlashSaleUpdate(
        {
          id: sale._id,
          name: sale.name,
          description: sale.description,
          products: sale.products.map((p) => ({
            id: p.product._id,
            name: p.product.name,
            brand: p.product.brand,
            originalPrice: p.originalPrice,
            salePrice: p.salePrice,
            discountPercentage: p.discountPercentage,
          })),
          endTime: sale.endTime,
        },
        "start",
      )
    }

    // Emit flash sale end notifications
    for (const sale of justEnded) {
      console.log(`Flash sale ended: ${sale.name}`)
      emitFlashSaleUpdate(
        {
          id: sale._id,
          name: sale.name,
        },
        "end",
      )
    }
  } catch (error) {
    console.error("Check flash sale status error:", error)
  }
}

// Clean up expired coupons
const cleanupExpiredCoupons = async () => {
  try {
    const now = new Date()

    // Deactivate expired coupons
    const result = await require("../models/Coupon").updateMany(
      {
        isActive: true,
        validTo: { $lt: now },
      },
      {
        isActive: false,
      },
    )

    if (result.modifiedCount > 0) {
      console.log(`Deactivated ${result.modifiedCount} expired coupons`)
    }
  } catch (error) {
    console.error("Cleanup expired coupons error:", error)
  }
}

// Generate daily reports
const generateDailyReports = async () => {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const Order = require("../models/Order")

    // Get yesterday's order statistics
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: yesterday,
            $lt: today,
          },
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          totalDiscount: { $sum: "$discountAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ])

    const stats = orderStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalDiscount: 0,
      averageOrderValue: 0,
    }

    console.log(`Daily Report for ${yesterday.toDateString()}:`, {
      orders: stats.totalOrders,
      revenue: `$${stats.totalRevenue.toFixed(2)}`,
      discounts: `$${stats.totalDiscount.toFixed(2)}`,
      avgOrderValue: `$${stats.averageOrderValue.toFixed(2)}`,
    })

    // Here you could save to database, send email reports, etc.
  } catch (error) {
    console.error("Generate daily reports error:", error)
  }
}

module.exports = {
  startCronJobs,
  stopCronJobs,
  checkFlashSaleStatus,
  cleanupExpiredCoupons,
  generateDailyReports,
}
