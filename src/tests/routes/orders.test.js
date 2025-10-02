const request = require("supertest")
const mongoose = require("mongoose")
const app = require("../../app")
const Order = require("../../models/Order")
const Product = require("../../models/Product")
const Cart = require("../../models/Cart")
const { reserveStock, releaseStock } = require("../../services/inventoryService")

describe("Orders Routes", () => {
  let customerToken, staffToken, adminToken
  let customer, staff, admin
  let testProduct, testProduct2

  beforeAll(async () => {
    // Create test users
    const customerAuth = await global.createAuthenticatedUser(global.mockUsers.customer)
    customer = customerAuth.user
    customerToken = customerAuth.token

    const staffAuth = await global.createAuthenticatedUser(global.mockUsers.staff)
    staff = staffAuth.user
    staffToken = staffAuth.token

    const adminAuth = await global.createAuthenticatedUser(global.mockUsers.admin)
    admin = adminAuth.user
    adminToken = adminAuth.token

    // Create test products
    testProduct = new Product(global.mockProduct)
    await testProduct.save()

    testProduct2 = new Product({
      ...global.mockProduct,
      name: "Test Walking Shoe",
      variants: [
        {
          size: "8",
          color: "blue",
          sku: "TEST-WLK-BLU-8",
          price: 79.99,
          stock: 3,
          lowStockThreshold: 1,
          isActive: true,
        },
      ],
    })
    await testProduct2.save()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  beforeEach(async () => {
    await global.cleanupDatabase()
    // Recreate users and products after cleanup
    customer = await (new (require("../../models/User"))(global.mockUsers.customer)).save()
    staff = await (new (require("../../models/User"))(global.mockUsers.staff)).save()
    admin = await (new (require("../../models/User"))(global.mockUsers.admin)).save()
    testProduct = await (new Product(global.mockProduct)).save()
    testProduct2 = await (new Product({
      ...global.mockProduct,
      name: "Test Walking Shoe",
      variants: [
        {
          size: "8",
          color: "blue",
          sku: "TEST-WLK-BLU-8",
          price: 79.99,
          stock: 3,
          lowStockThreshold: 1,
          isActive: true,
        },
      ],
    })).save()
  })

  describe("POST /api/orders", () => {
    it("should create order successfully with cart items", async () => {
      // Add items to cart
      const cart = new Cart({
        user: customer._id,
        items: [
          {
            product: testProduct._id,
            variant: { size: "9", color: "black" },
            quantity: 1,
          },
        ],
      })
      await cart.save()

      const orderData = {
        shippingAddress: global.mockOrder.shippingAddress,
        shippingMethod: "standard",
      }

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body.status).toBe("success")
      expect(response.body.data.order).toBeDefined()
      expect(response.body.data.order.orderNumber).toMatch(/^ORD-\d+-\d{3}$/)
      expect(response.body.data.order.totalAmount).toBeGreaterThan(0)

      // Check stock was reserved
      const updatedProduct = await Product.findById(testProduct._id)
      const variant = updatedProduct.getVariant("9", "black")
      expect(variant.stock).toBe(9) // 10 - 1

      // Check cart was cleared
      const updatedCart = await Cart.findOne({ user: customer._id })
      expect(updatedCart.items).toHaveLength(0)
    })

    it("should create order successfully with provided items", async () => {
      const orderData = {
        items: [
          {
            product: testProduct._id,
            variant: { size: "9", color: "black" },
            quantity: 1,
          },
        ],
        shippingAddress: global.mockOrder.shippingAddress,
        shippingMethod: "standard",
      }

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body.status).toBe("success")
      expect(response.body.data.order.orderNumber).toBeDefined()
    })

    it("should fail with insufficient stock", async () => {
      const orderData = {
        items: [
          {
            product: testProduct._id,
            variant: { size: "9", color: "black" },
            quantity: 15, // More than available
          },
        ],
        shippingAddress: global.mockOrder.shippingAddress,
      }

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(orderData)

      expect(response.status).toBe(400)
      expect(response.body.status).toBe("error")
      expect(response.body.message).toContain("Only 10 items available")
    })

    it("should fail with invalid product", async () => {
      const orderData = {
        items: [
          {
            product: new mongoose.Types.ObjectId(), // Invalid ID
            variant: { size: "9", color: "black" },
            quantity: 1,
          },
        ],
        shippingAddress: global.mockOrder.shippingAddress,
      }

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(orderData)

      expect(response.status).toBe(400)
      expect(response.body.status).toBe("error")
      expect(response.body.message).toContain("is not available")
    })

    it("should fail with empty cart and no items", async () => {
      const orderData = {
        shippingAddress: global.mockOrder.shippingAddress,
      }

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(orderData)

      expect(response.status).toBe(400)
      expect(response.body.status).toBe("error")
      expect(response.body.message).toBe("No items to order")
    })

    it("should release stock on order creation failure", async () => {
      // Mock order save to fail
      const originalSave = Order.prototype.save
      Order.prototype.save = jest.fn().mockRejectedValue(new Error("Save failed"))

      const orderData = {
        items: [
          {
            product: testProduct._id,
            variant: { size: "9", color: "black" },
            quantity: 1,
          },
        ],
        shippingAddress: global.mockOrder.shippingAddress,
      }

      const response = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(orderData)

      expect(response.status).toBe(500)

      // Check stock was released back
      const updatedProduct = await Product.findById(testProduct._id)
      const variant = updatedProduct.getVariant("9", "black")
      expect(variant.stock).toBe(10) // Should be back to original

      Order.prototype.save = originalSave
    })
  })

  describe("GET /api/orders", () => {
    beforeEach(async () => {
      // Create test orders
      const order1 = new Order({
        orderNumber: "ORD-123456789-001",
        user: customer._id,
        items: [{
          product: testProduct._id,
          productSnapshot: { name: testProduct.name, brand: testProduct.brand },
          variant: { size: "9", color: "black", sku: "TEST-RUN-BLK-9" },
          quantity: 1,
          price: 99.99,
          totalPrice: 99.99,
        }],
        subtotal: 99.99,
        tax: 8.0,
        shippingCost: 5.99,
        totalAmount: 113.98,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "pending",
      })
      await order1.save()

      const order2 = new Order({
        orderNumber: "ORD-123456790-002",
        user: customer._id,
        items: [{
          product: testProduct2._id,
          productSnapshot: { name: testProduct2.name, brand: testProduct2.brand },
          variant: { size: "8", color: "blue", sku: "TEST-WLK-BLU-8" },
          quantity: 1,
          price: 79.99,
          totalPrice: 79.99,
        }],
        subtotal: 79.99,
        tax: 6.4,
        shippingCost: 5.99,
        totalAmount: 92.38,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "delivered",
      })
      await order2.save()
    })

    it("should get user's orders", async () => {
      const response = await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe("success")
      expect(response.body.data.orders).toHaveLength(2)
      expect(response.body.data.pagination).toBeDefined()
    })

    it("should filter orders by status", async () => {
      const response = await request(app)
        .get("/api/orders?status=delivered")
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orders).toHaveLength(1)
      expect(response.body.data.orders[0].status).toBe("delivered")
    })

    it("should paginate orders", async () => {
      const response = await request(app)
        .get("/api/orders?page=1&limit=1")
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orders).toHaveLength(1)
      expect(response.body.data.pagination.totalPages).toBe(2)
    })
  })

  describe("GET /api/orders/:id", () => {
    let testOrder

    beforeEach(async () => {
      testOrder = new Order({
        orderNumber: "ORD-123456789-001",
        user: customer._id,
        items: [{
          product: testProduct._id,
          productSnapshot: { name: testProduct.name, brand: testProduct.brand },
          variant: { size: "9", color: "black", sku: "TEST-RUN-BLK-9" },
          quantity: 1,
          price: 99.99,
          totalPrice: 99.99,
        }],
        subtotal: 99.99,
        tax: 8.0,
        shippingCost: 5.99,
        totalAmount: 113.98,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "pending",
      })
      await testOrder.save()
    })

    it("should get single order for owner", async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe("success")
      expect(response.body.data.order.orderNumber).toBe("ORD-123456789-001")
    })

    it("should allow staff to view any order", async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set("Authorization", `Bearer ${staffToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.order.orderNumber).toBe("ORD-123456789-001")
    })

    it("should deny access to other users", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "other@test.com",
      })

      const response = await request(app)
        .get(`/api/orders/${testOrder._id}`)
        .set("Authorization", `Bearer ${otherUser.token}`)

      expect(response.status).toBe(403)
      expect(response.body.message).toBe("Access denied")
    })

    it("should return 404 for non-existent order", async () => {
      const response = await request(app)
        .get(`/api/orders/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(404)
      expect(response.body.message).toBe("Order not found")
    })
  })

  describe("PUT /api/orders/:id/cancel", () => {
    let testOrder

    beforeEach(async () => {
      testOrder = new Order({
        orderNumber: "ORD-123456789-001",
        user: customer._id,
        items: [{
          product: testProduct._id,
          productSnapshot: { name: testProduct.name, brand: testProduct.brand },
          variant: { size: "9", color: "black", sku: "TEST-RUN-BLK-9" },
          quantity: 2,
          price: 99.99,
          totalPrice: 199.98,
        }],
        subtotal: 199.98,
        tax: 16.0,
        shippingCost: 5.99,
        totalAmount: 221.97,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "pending",
      })
      await testOrder.save()

      // Simulate stock reduction
      const product = await Product.findById(testProduct._id)
      const variant = product.getVariant("9", "black")
      variant.stock -= 2
      await product.save()
    })

    it("should cancel order and release stock", async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ reason: "Changed mind" })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe("success")
      expect(response.body.data.order.status).toBe("cancelled")

      // Check stock was released
      const updatedProduct = await Product.findById(testProduct._id)
      const variant = updatedProduct.getVariant("9", "black")
      expect(variant.stock).toBe(10) // Back to original
    })

    it("should not cancel delivered order", async () => {
      testOrder.status = "delivered"
      await testOrder.save()

      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ reason: "Too late" })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe("Order cannot be cancelled at this stage")
    })

    it("should deny cancellation by non-owner", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "other@test.com",
      })

      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/cancel`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ reason: "Not mine" })

      expect(response.status).toBe(403)
      expect(response.body.message).toBe("Access denied")
    })
  })

  describe("GET /api/orders/admin/all", () => {
    beforeEach(async () => {
      const order1 = new Order({
        orderNumber: "ORD-123456789-001",
        user: customer._id,
        items: [],
        subtotal: 99.99,
        totalAmount: 99.99,
        shippingAddress: { ...global.mockOrder.shippingAddress, firstName: "John", lastName: "Doe" },
        status: "pending",
      })
      await order1.save()

      const order2 = new Order({
        orderNumber: "ORD-123456790-002",
        user: customer._id,
        items: [],
        subtotal: 79.99,
        totalAmount: 79.99,
        shippingAddress: { ...global.mockOrder.shippingAddress, firstName: "Jane", lastName: "Smith" },
        status: "delivered",
      })
      await order2.save()
    })

    it("should get all orders for admin", async () => {
      const response = await request(app)
        .get("/api/orders/admin/all")
        .set("Authorization", `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orders).toHaveLength(2)
    })

    it("should filter by status", async () => {
      const response = await request(app)
        .get("/api/orders/admin/all?status=delivered")
        .set("Authorization", `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orders).toHaveLength(1)
      expect(response.body.data.orders[0].status).toBe("delivered")
    })

    it("should search by order number", async () => {
      const response = await request(app)
        .get("/api/orders/admin/all?search=ORD-123456789-001")
        .set("Authorization", `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orders).toHaveLength(1)
      expect(response.body.data.orders[0].orderNumber).toBe("ORD-123456789-001")
    })

    it("should search by customer name", async () => {
      const response = await request(app)
        .get("/api/orders/admin/all?search=John")
        .set("Authorization", `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.orders).toHaveLength(1)
    })

    it("should deny access to customers", async () => {
      const response = await request(app)
        .get("/api/orders/admin/all")
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe("PUT /api/orders/:id/status", () => {
    let testOrder

    beforeEach(async () => {
      testOrder = new Order({
        orderNumber: "ORD-123456789-001",
        user: customer._id,
        items: [],
        subtotal: 99.99,
        totalAmount: 99.99,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "pending",
      })
      await testOrder.save()
    })

    it("should update order status", async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "confirmed" })

      expect(response.status).toBe(200)
      expect(response.body.data.order.status).toBe("confirmed")
      expect(response.body.data.order.confirmedAt).toBeDefined()
    })

    it("should reject invalid status", async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid" })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe("Invalid status")
    })

    it("should deny access to customers", async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "confirmed" })

      expect(response.status).toBe(403)
    })
  })

  describe("GET /api/orders/admin/stats", () => {
    beforeEach(async () => {
      // Create orders with different dates
      const order1 = new Order({
        orderNumber: "ORD-123456789-001",
        user: customer._id,
        items: [],
        subtotal: 100,
        totalAmount: 100,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "delivered",
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
      })
      await order1.save()

      const order2 = new Order({
        orderNumber: "ORD-123456790-002",
        user: customer._id,
        items: [],
        subtotal: 200,
        totalAmount: 200,
        shippingAddress: global.mockOrder.shippingAddress,
        status: "pending",
        createdAt: new Date(),
      })
      await order2.save()
    })

    it("should get order statistics", async () => {
      const response = await request(app)
        .get("/api/orders/admin/stats")
        .set("Authorization", `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.summary.totalOrders).toBe(2)
      expect(response.body.data.summary.totalRevenue).toBe(300)
      expect(response.body.data.summary.deliveredOrders).toBe(1)
      expect(response.body.data.summary.pendingOrders).toBe(1)
    })

    it("should filter by period", async () => {
      const response = await request(app)
        .get("/api/orders/admin/stats?period=7d")
        .set("Authorization", `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.summary.totalOrders).toBe(2)
    })
  })
})
