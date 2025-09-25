const app = require("./app")
const http = require("http")
const socketIo = require("socket.io")
const socketService = require("./services/socketService")
const cronService = require("./services/cronService")

const PORT = process.env.PORT || 5000

// Create HTTP server
const server = http.createServer(app)

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Initialize socket service
socketService.init(io)

// Start cron jobs
cronService.startJobs()

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  server.close(() => {
    console.log("Process terminated")
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully")
  server.close(() => {
    console.log("Process terminated")
  })
})
