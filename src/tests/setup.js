// Global test setup
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-jwt-secret"
process.env.MONGODB_URI = "mongodb://localhost:27017/shoe-store-test"

const jest = require("jest")

// Suppress console logs during testing
if (process.env.NODE_ENV === "test") {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
}
