const request = require("supertest")
const mongoose = require("mongoose")
const app = require("../app")
const User = require("../models/User")
const Product = require("../models/Product")

const MONGODB_URI = process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/shoe-store-test"

describe("Product Endpoints", () => {
  let adminToken
  let customerToken

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI)
  })

  beforeEach(async () => {
    await User.deleteMany({})
    await Product.deleteMany({})

    // Create admin user
    const adminResponse = await request(app).post("/api/auth/register").send({
      email: "admin@example.com",
      password: "password123",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    })

    adminToken = adminResponse.body.data.token

    // Create customer user
    const customerResponse = await request(app).post("/api/auth/register").send({
      email: "customer@example.com",
      password: "password123",
      firstName: "Customer",
      lastName: "User",
    })

    customerToken = customerResponse.body.data.token
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("GET /api/products", () => {
    beforeEach(async () => {
      // Create test products
      await Product.create([
        {
          name: "Test Shoe 1",
          description: "A test shoe",
          brand: "TestBrand",
          category: "Running",
          variants: [{ size: "9", color: "Black", sku: "TEST1-BK-9", price: 100, stock: 10 }],
          isActive: true,
        },
        {
          name: "Test Shoe 2",
          description: "Another test shoe",
          brand: "TestBrand",
          category: "Casual",
          variants: [{ size: "10", color: "White", sku: "TEST2-WH-10", price: 80, stock: 5 }],
          isActive: true,
        },
      ])
    })

    it("should get all products", async () => {
      const response = await request(app).get("/api/products").expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.products).toHaveLength(2)
    })

    it("should filter products by brand", async () => {
      const response = await request(app).get("/api/products?brand=TestBrand").expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.products).toHaveLength(2)
    })

    it("should filter products by category", async () => {
      const response = await request(app).get("/api/products?category=Running").expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.products).toHaveLength(1)
      expect(response.body.data.products[0].category).toBe("Running")
    })
  })

  describe("POST /api/products", () => {
    it("should create product as admin", async () => {
      const productData = {
        name: "New Test Shoe",
        description: "A new test shoe",
        brand: "NewBrand",
        category: "Basketball",
        variants: [{ size: "9", color: "Red", sku: "NEW1-RD-9", price: 120, stock: 15 }],
      }

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(productData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(productData.name)
    })

    it("should not create product as customer", async () => {
      const productData = {
        name: "New Test Shoe",
        description: "A new test shoe",
        brand: "NewBrand",
        category: "Basketball",
        variants: [{ size: "9", color: "Red", sku: "NEW1-RD-9", price: 120, stock: 15 }],
      }

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(productData)
        .expect(403)

      expect(response.body.success).toBe(false)
    })
  })
})
