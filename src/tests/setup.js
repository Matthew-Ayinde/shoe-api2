/**
 * Global Test Setup
 *
 * This file configures the testing environment for the entire test suite.
 * It sets up:
 * - Environment variables for testing
 * - Database configuration
 * - Console log suppression
 * - Global test utilities
 * - Mock configurations
 *
 * Best Practices Implemented:
 * - Isolated test database
 * - Environment-specific configurations
 * - Proper cleanup procedures
 * - Mock external services
 */

// Set test environment variables
process.env.NODE_ENV = "test"
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only"
process.env.JWT_EXPIRE = "1h"
process.env.MONGODB_URI = "mongodb://localhost:27017/shoe-store-test"

// Email service test configuration
process.env.EMAIL_USER = "test@example.com"
process.env.EMAIL_PASS = "test-password"

// Cloudinary test configuration (use test credentials or mocks)
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud"
process.env.CLOUDINARY_API_KEY = "test-api-key"
process.env.CLOUDINARY_API_SECRET = "test-api-secret"

// Stripe test configuration
process.env.STRIPE_SECRET_KEY = "sk_test_test-key"
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test-webhook-secret"

// Redis test configuration (optional - tests should work without Redis)
process.env.REDIS_URL = "redis://localhost:6379/1" // Use database 1 for tests

// Push notification test configuration
process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key"
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key"
process.env.VAPID_EMAIL = "mailto:test@example.com"

const jest = require("jest")

// Suppress console logs during testing for cleaner output
// This helps focus on test results rather than application logs
if (process.env.NODE_ENV === "test") {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
  console.info = jest.fn()
}

/**
 * Global Test Utilities
 *
 * These utilities are available in all test files to reduce code duplication
 * and provide consistent testing patterns across the test suite.
 */

// Mock user data for testing
global.mockUsers = {
  customer: {
    email: "customer@test.com",
    password: "password123",
    profile: {
      firstName: "Test",
      lastName: "Customer",
      phone: "+1234567890",
    },
    role: "customer",
  },
  staff: {
    email: "staff@test.com",
    password: "password123",
    profile: {
      firstName: "Test",
      lastName: "Staff",
      phone: "+1234567891",
    },
    role: "staff",
  },
  admin: {
    email: "admin@test.com",
    password: "password123",
    profile: {
      firstName: "Test",
      lastName: "Admin",
      phone: "+1234567892",
    },
    role: "admin",
  },
}

// Mock product data for testing
global.mockProduct = {
  name: "Test Running Shoe",
  brand: "TestBrand",
  description: "A great test shoe for running",
  category: "running",
  gender: "unisex",
  variants: [
    {
      size: "9",
      color: "black",
      sku: "TEST-RUN-BLK-9",
      price: 99.99,
      stock: 10,
      lowStockThreshold: 2,
      isActive: true,
    },
    {
      size: "10",
      color: "white",
      sku: "TEST-RUN-WHT-10",
      price: 99.99,
      stock: 5,
      lowStockThreshold: 2,
      isActive: true,
    },
  ],
  materials: ["synthetic", "rubber"],
  tags: ["running", "comfortable", "durable"],
  isActive: true,
  isFeatured: false,
}

// Mock order data for testing
global.mockOrder = {
  items: [
    {
      product: null, // Will be set to actual product ID in tests
      variant: {
        size: "9",
        color: "black",
        sku: "TEST-RUN-BLK-9",
      },
      quantity: 2,
      price: 99.99,
    },
  ],
  shippingAddress: {
    street: "123 Test Street",
    city: "Test City",
    state: "Test State",
    zipCode: "12345",
    country: "US",
  },
  shippingMethod: "standard",
}

/**
 * Test Database Cleanup Utility
 *
 * Provides a consistent way to clean up test data between tests.
 * This ensures test isolation and prevents test interference.
 */
global.cleanupDatabase = async () => {
  const mongoose = require("mongoose")

  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections()

    for (const collection of collections) {
      await collection.deleteMany({})
    }
  }
}

/**
 * Authentication Helper
 *
 * Provides utilities for creating authenticated requests in tests.
 * This reduces boilerplate code in individual test files.
 */
global.createAuthenticatedUser = async (userData = global.mockUsers.customer) => {
  const User = require("../models/User")
  const jwt = require("jsonwebtoken")

  const user = new User(userData)
  await user.save()

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  })

  return { user, token }
}

/**
 * Mock External Services
 *
 * Mock external service calls to prevent actual API calls during testing.
 * This makes tests faster, more reliable, and doesn't require external dependencies.
 */

// Mock Cloudinary uploads
jest.mock("../config/cloudinary", () => ({
  uploadImage: jest.fn().mockResolvedValue({
    public_id: "test-image-id",
    url: "https://test-cloudinary.com/test-image.jpg",
  }),
  deleteImage: jest.fn().mockResolvedValue({ result: "ok" }),
}))

// Mock email service
jest.mock("../services/emailService", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendShippingNotificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
}))

// Mock push notification service
jest.mock("../services/pushService", () => ({
  sendPushNotification: jest.fn().mockResolvedValue({ success: true }),
  sendBulkPushNotification: jest.fn().mockResolvedValue({ success: true, totalSent: 1 }),
}))

// Mock Stripe service
jest.mock("../services/paymentService", () => ({
  createStripePaymentIntent: jest.fn().mockResolvedValue({
    success: true,
    paymentIntent: { id: "pi_test_123", client_secret: "pi_test_123_secret" },
  }),
  verifyStripeWebhook: jest.fn().mockReturnValue({ type: "payment_intent.succeeded" }),
  createStripeRefund: jest.fn().mockResolvedValue({ success: true, refund: { id: "re_test_123" } }),
}))

console.log("🧪 Test environment configured successfully")
