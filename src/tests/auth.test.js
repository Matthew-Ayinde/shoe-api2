const request = require("supertest")
const mongoose = require("mongoose")
const app = require("../app")
const User = require("../models/User")

// Test database
const MONGODB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/shoe-store-test"

describe("Authentication Endpoints", () => {
  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI)
  })

  beforeEach(async () => {
    await User.deleteMany({})
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      }

      const response = await request(app).post("/api/auth/register").send(userData).expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.user.password).toBeUndefined()
    })

    it("should not register user with invalid email", async () => {
      const userData = {
        email: "invalid-email",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      }

      const response = await request(app).post("/api/auth/register").send(userData).expect(400)

      expect(response.body.success).toBe(false)
    })

    it("should not register user with existing email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      }

      // Create user first
      await request(app).post("/api/auth/register").send(userData)

      // Try to create again
      const response = await request(app).post("/api/auth/register").send(userData).expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain("already exists")
    })
  })

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        firstName: "Test",
        lastName: "User",
      })
    })

    it("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.user.email).toBe("test@example.com")
    })

    it("should not login with invalid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    it("should not login with non-existent user", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })
})
