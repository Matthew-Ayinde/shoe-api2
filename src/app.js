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

// Import middleware
const  errorHandler = require("./middleware/errorHandler")
const notFound = require("./middleware/notFound")

// Import services
const { initializeSocketIO } = require("./services/socketService")
const { startCronJobs } = require("./services/cronService")

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Initialize Socket.IO
initializeSocketIO(io)

// Security middleware
app.use(helmet())
app.use(mongoSanitize())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
})
app.use("/api/", limiter)

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
)

// Body parsing middleware
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

// Passport configuration
require("./config/passport")

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/shoe-ecommerce")
  .then(() => {
    console.log("Connected to MongoDB")
    // Start cron jobs after database connection
    startCronJobs()
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  })

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/payments", paymentRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  })
})


// Error handling middleware
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...")
  server.close(() => {
    mongoose.connection.close()
    process.exit(0)
  })
})

module.exports = app
