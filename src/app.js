/**
 * Main Application Configuration
 *
 * This file sets up the Express application with all necessary middleware,
 * routes, and configurations. It handles:
 * - Security middleware (helmet, CORS, rate limiting)
 * - Body parsing and compression
 * - Authentication setup
 * - Route mounting
 * - Error handling
 * - Socket.IO initialization
 * - Database connection
 * - Background job scheduling
 */

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const morgan = require("morgan")
const compression = require("compression")
const mongoSanitize = require("express-mongo-sanitize")
const rateLimit = require("express-rate-limit")
const { createServer } = require("http")
const { Server } = require("socket.io")
require("dotenv").config()

// Import routes
const authRoutes = require("./routes/auth")
const productRoutes = require("./routes/products")
const cartRoutes = require("./routes/cart")
const orderRoutes = require("./routes/orders")
const adminRoutes = require("./routes/admin")
const notificationRoutes = require("./routes/notifications")
const paymentRoutes = require("./routes/payments")
const healthRoutes = require("./routes/health")
const couponRoutes = require("./routes/coupons")
const flashSaleRoutes = require("./routes/flash-sales")
const staffRoutes = require("./routes/staff")

// Import middleware
const errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")
const logger = require("./middleware/logger")

// Import services
const { initializeSocketIO } = require("./services/socketService")
const { startCronJobs } = require("./services/cronService")

// Create Express application
const app = express()

// Create HTTP server and Socket.IO instance
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
})

// Initialize Socket.IO with our custom service
initializeSocketIO(io)

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

/**
 * Security Middleware
 * - helmet: Sets various HTTP headers to secure the app
 * - mongoSanitize: Prevents NoSQL injection attacks
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))
app.use(mongoSanitize())

/**
 * Rate Limiting
 * Prevents abuse by limiting requests per IP address
 * - 100 requests per 15 minutes per IP
 * - Applied to all /api/ routes
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use("/api/", limiter)

/**
 * CORS Configuration
 * Enables cross-origin requests from the frontend application
 */
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)

      const allowedOrigins = [
        process.env.CLIENT_URL || "http://localhost:3000",
        "http://localhost:3001", // For admin dashboard
        "http://localhost:3002", // For staff dashboard
      ]

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

/**
 * Body Parsing and Compression Middleware
 * - compression: Gzip compression for responses
 * - express.json: Parse JSON request bodies (limit: 10MB)
 * - express.urlencoded: Parse URL-encoded request bodies
 */
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

/**
 * Logging Middleware
 * - Development: Morgan for detailed request logging
 * - Production: Custom Winston logger
 */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
} else {
  app.use(logger)
}

/**
 * Passport Configuration
 * Initialize authentication strategies (Local, JWT, Google OAuth)
 */
require("./config/passport")

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

/**
 * MongoDB Connection
 * Connects to MongoDB using Mongoose with proper error handling
 * Starts background jobs after successful connection
 */
const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/shoe-ecommerce",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    )

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    console.log(`📊 Database: ${conn.connection.name}`)

    // Start cron jobs after successful database connection
    startCronJobs()

    return conn
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

// Initialize database connection
connectDatabase()

// ============================================================================
// ROUTES SETUP
// ============================================================================

/**
 * API Routes
 * All routes are prefixed with /api for consistency
 */

// Authentication routes - handles login, register, OAuth
app.use("/api/auth", authRoutes)

// Product routes - handles product CRUD, search, filtering
app.use("/api/products", productRoutes)

// Shopping cart routes - handles cart operations
app.use("/api/cart", cartRoutes)

// Order routes - handles order creation, tracking, management
app.use("/api/orders", orderRoutes)

// Payment routes - handles Stripe integration, webhooks
app.use("/api/payments", paymentRoutes)

// Coupon routes - handles discount codes and promotions
app.use("/api/coupons", couponRoutes)

// Flash sale routes - handles time-limited sales
app.use("/api/flash-sales", flashSaleRoutes)

// Notification routes - handles user notifications
app.use("/api/notifications", notificationRoutes)

// Admin routes - handles admin dashboard and management
app.use("/api/admin", adminRoutes)

// Staff routes - handles staff-specific operations
app.use("/api/staff", staffRoutes)

// Health check routes - system monitoring
app.use("/api/health", healthRoutes)

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 Handler
 * Catches all undefined routes and returns a consistent error response
 */
app.use(notFound)

/**
 * Global Error Handler
 * Catches all errors and returns appropriate responses
 * Logs errors in production for monitoring
 */
app.use(errorHandler)

// ============================================================================
// SERVER STARTUP AND GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Server Configuration
 * Only start the server if this file is run directly (not imported)
 */
if (require.main === module) {
  const PORT = process.env.PORT || 5000

  server.listen(PORT, () => {
    console.log("🚀 ============================================")
    console.log(`🌟 Server running in ${process.env.NODE_ENV || 'development'} mode`)
    console.log(`🔗 Server URL: http://localhost:${PORT}`)
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`)
    console.log(`🔌 Socket.IO enabled for real-time features`)
    console.log("🚀 ============================================")
  })

  /**
   * Graceful Shutdown Handlers
   * Ensures proper cleanup when the application is terminated
   */
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)

    server.close(async () => {
      console.log("🔌 HTTP server closed")

      try {
        // Close database connection
        await mongoose.connection.close()
        console.log("🗄️  Database connection closed")

        // Stop cron jobs
        const { stopCronJobs } = require("./services/cronService")
        stopCronJobs()
        console.log("⏰ Cron jobs stopped")

        console.log("✅ Graceful shutdown completed")
        process.exit(0)
      } catch (error) {
        console.error("❌ Error during shutdown:", error)
        process.exit(1)
      }
    })

    // Force close after 10 seconds
    setTimeout(() => {
      console.error("⚠️  Forced shutdown after timeout")
      process.exit(1)
    }, 10000)
  }

  // Handle different termination signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
  process.on("SIGINT", () => gracefulShutdown("SIGINT"))

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error)
    gracefulShutdown("UNCAUGHT_EXCEPTION")
  })

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled Rejection at:", promise, "reason:", reason)
    gracefulShutdown("UNHANDLED_REJECTION")
  })
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Export the app and server for testing and external use
 */
module.exports = { app, server, io }
