const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")

// Health check endpoint
router.get("/", async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"

    // Check memory usage
    const memoryUsage = process.memoryUsage()

    // Check uptime
    const uptime = process.uptime()

    const healthCheck = {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      database: dbStatus,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      },
      environment: process.env.NODE_ENV || "development",
    }

    res.status(200).json(healthCheck)
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      timestamp: new Date().toISOString(),
      error: error.message,
    })
  }
})

module.exports = router
