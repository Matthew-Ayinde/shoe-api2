/**
 * Server Entry Point
 *
 * This file serves as an alternative entry point to the application.
 * It imports the configured app from app.js and starts the server.
 *
 * This separation allows for:
 * - Better testing (can import app without starting server)
 * - Flexibility in deployment configurations
 * - Cleaner code organization
 */

require("dotenv").config()

// Import the configured application
const { app, server } = require("./app")

// The server startup logic is handled in app.js
// This file exists for compatibility and alternative entry points

console.log("🔄 Starting server via server.js entry point...")

// If app.js didn't start the server (when imported), start it here
if (!server.listening) {
  const PORT = process.env.PORT || 5000

  server.listen(PORT, () => {
    console.log("🚀 ============================================")
    console.log(`🌟 Server running in ${process.env.NODE_ENV || 'development'} mode`)
    console.log(`🔗 Server URL: http://localhost:${PORT}`)
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`)
    console.log(`🔌 Socket.IO enabled for real-time features`)
    console.log("🚀 ============================================")
  })
}
