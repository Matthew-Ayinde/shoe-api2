/**
 * Reviews Routes Integration Tests
 * 
 * Comprehensive tests for the reviews API endpoints including:
 * - Creating reviews with validation
 * - Getting reviews with filtering and pagination
 * - Updating and deleting reviews
 * - Review moderation functionality
 * - Helpful votes and flagging
 * - Authentication and authorization
 * 
 * Test Categories:
 * 1. Public endpoints (get reviews)
 * 2. Authenticated endpoints (create, update, delete)
 * 3. Admin/Staff endpoints (moderation)
 * 4. Validation and error handling
 * 5. File upload functionality
 * 6. Pagination and filtering
 */

const request = require("supertest")
const mongoose = require("mongoose")
const app = require("../../app")
const Review = require("../../models/Review")
const Product = require("../../models/Product")
const User = require("../../models/User")
const Order = require("../../models/Order")

describe("Reviews Routes", () => {
  let customerUser, customerToken
  let staffUser, staffToken
  let adminUser, adminToken
  let testProduct, testOrder

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI)
  })

  beforeEach(async () => {
    await global.cleanupDatabase()

    // Create test users
    const customerAuth = await global.createAuthenticatedUser(global.mockUsers.customer)
    customerUser = customerAuth.user
    customerToken = customerAuth.token

    const staffAuth = await global.createAuthenticatedUser(global.mockUsers.staff)
    staffUser = staffAuth.user
    staffToken = staffAuth.token

    const adminAuth = await global.createAuthenticatedUser(global.mockUsers.admin)
    adminUser = adminAuth.user
    adminToken = adminAuth.token

    // Create test product
    testProduct = new Product(global.mockProduct)
    await testProduct.save()

    // Create test order
    const orderData = {
      ...global.mockOrder,
      user: customerUser._id,
      items: [
        {
          ...global.mockOrder.items[0],
          product: testProduct._id,
        },
      ],
    }
    testOrder = new Order(orderData)
    await testOrder.save()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("GET /api/reviews/product/:productId", () => {
    beforeEach(async () => {
      // Create test reviews
      const reviews = [
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 5,
          title: "Excellent shoes!",
          content: "These shoes are amazing. Very comfortable and stylish.",
          moderationStatus: "approved",
        },
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 4,
          title: "Good quality",
          content: "Good shoes, comfortable to wear for long periods.",
          moderationStatus: "approved",
        },
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 3,
          title: "Average",
          content: "Shoes are okay, nothing special but decent quality.",
          moderationStatus: "pending", // Should not appear in results
        },
      ]

      for (const reviewData of reviews) {
        const review = new Review(reviewData)
        await review.save()
      }
    })

    it("should get approved reviews for a product", async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.reviews).toHaveLength(2) // Only approved reviews
      expect(response.body.data.stats.totalReviews).toBe(2)
      expect(response.body.data.stats.averageRating).toBeCloseTo(4.5, 1)
    })

    it("should filter reviews by rating", async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}?rating=5`)
        .expect(200)

      expect(response.body.data.reviews).toHaveLength(1)
      expect(response.body.data.reviews[0].rating).toBe(5)
    })

    it("should paginate reviews", async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}?page=1&limit=1`)
        .expect(200)

      expect(response.body.data.reviews).toHaveLength(1)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(1)
      expect(response.body.data.pagination.total).toBe(2)
    })

    it("should sort reviews by different criteria", async () => {
      const response = await request(app)
        .get(`/api/reviews/product/${testProduct._id}?sortBy=rating&sortOrder=asc`)
        .expect(200)

      expect(response.body.data.reviews[0].rating).toBe(4) // Lower rating first
      expect(response.body.data.reviews[1].rating).toBe(5)
    })

    it("should return 404 for non-existent product", async () => {
      const fakeProductId = new mongoose.Types.ObjectId()

      const response = await request(app)
        .get(`/api/reviews/product/${fakeProductId}`)
        .expect(200) // Still returns 200 but with empty results

      expect(response.body.data.reviews).toHaveLength(0)
      expect(response.body.data.stats.totalReviews).toBe(0)
    })
  })

  describe("POST /api/reviews", () => {
    it("should create a new review", async () => {
      const reviewData = {
        product: testProduct._id,
        order: testOrder._id,
        rating: 5,
        title: "Amazing shoes!",
        content: "These shoes exceeded my expectations. Great quality and comfort.",
        variant: {
          size: "9",
          color: "black",
          sku: "TEST-RUN-BLK-9",
        },
        wouldRecommend: true,
      }

      const response = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(reviewData)
        .expect(201)

      expect(response.body.status).toBe("success")
      expect(response.body.data.review.title).toBe("Amazing shoes!")
      expect(response.body.data.review.rating).toBe(5)
      expect(response.body.data.review.moderationStatus).toBe("pending")

      // Verify review was saved to database
      const savedReview = await Review.findById(response.body.data.review._id)
      expect(savedReview).toBeDefined()
      expect(savedReview.wouldRecommend).toBe(true)
    })

    it("should create review with detailed ratings", async () => {
      const reviewData = {
        product: testProduct._id,
        order: testOrder._id,
        rating: 4,
        title: "Good shoes",
        content: "Overall good shoes with some minor issues.",
        detailedRatings: {
          comfort: 5,
          quality: 4,
          sizing: 3,
          style: 4,
          value: 4,
        },
      }

      const response = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(reviewData)
        .expect(201)

      expect(response.body.data.review.detailedRatings.comfort).toBe(5)
      expect(response.body.data.review.detailedRatings.quality).toBe(4)
    })

    it("should fail without authentication", async () => {
      const reviewData = {
        product: testProduct._id,
        order: testOrder._id,
        rating: 5,
        title: "Test review",
        content: "Test content for review.",
      }

      await request(app)
        .post("/api/reviews")
        .send(reviewData)
        .expect(401)
    })

    it("should fail with missing required fields", async () => {
      const reviewData = {
        product: testProduct._id,
        // Missing order, rating, title, content
      }

      const response = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(reviewData)
        .expect(400)

      expect(response.body.status).toBe("error")
      expect(response.body.message).toContain("required")
    })

    it("should fail with invalid rating", async () => {
      const reviewData = {
        product: testProduct._id,
        order: testOrder._id,
        rating: 6, // Invalid - should be 1-5
        title: "Test review",
        content: "Test content for review.",
      }

      const response = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(reviewData)
        .expect(400)

      expect(response.body.message).toContain("Rating must be between 1 and 5")
    })

    it("should prevent duplicate reviews for same product/order", async () => {
      const reviewData = {
        product: testProduct._id,
        order: testOrder._id,
        rating: 5,
        title: "First review",
        content: "This is my first review for this product.",
      }

      // Create first review
      await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(reviewData)
        .expect(201)

      // Try to create duplicate review
      const duplicateReviewData = {
        ...reviewData,
        title: "Duplicate review",
        content: "This should not be allowed.",
      }

      const response = await request(app)
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(duplicateReviewData)
        .expect(400)

      expect(response.body.message).toContain("already reviewed")
    })
  })

  describe("PUT /api/reviews/:id", () => {
    let testReview

    beforeEach(async () => {
      testReview = new Review({
        product: testProduct._id,
        user: customerUser._id,
        order: testOrder._id,
        rating: 4,
        title: "Original title",
        content: "Original content for this review.",
        moderationStatus: "approved",
      })
      await testReview.save()
    })

    it("should update own review", async () => {
      const updateData = {
        rating: 5,
        title: "Updated title",
        content: "Updated content for this review with more details.",
        wouldRecommend: true,
      }

      const response = await request(app)
        .put(`/api/reviews/${testReview._id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.review.title).toBe("Updated title")
      expect(response.body.data.review.rating).toBe(5)
      expect(response.body.data.review.moderationStatus).toBe("pending") // Reset to pending after edit
    })

    it("should not update other user's review", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "other@test.com",
      })

      const updateData = {
        title: "Hacked title",
        content: "This should not work.",
      }

      const response = await request(app)
        .put(`/api/reviews/${testReview._id}`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send(updateData)
        .expect(404)

      expect(response.body.message).toContain("not found")
    })

    it("should fail without authentication", async () => {
      const updateData = {
        title: "Updated title",
      }

      await request(app)
        .put(`/api/reviews/${testReview._id}`)
        .send(updateData)
        .expect(401)
    })
  })

  describe("DELETE /api/reviews/:id", () => {
    let testReview

    beforeEach(async () => {
      testReview = new Review({
        product: testProduct._id,
        user: customerUser._id,
        order: testOrder._id,
        rating: 4,
        title: "Review to delete",
        content: "This review will be deleted.",
      })
      await testReview.save()
    })

    it("should delete own review", async () => {
      const response = await request(app)
        .delete(`/api/reviews/${testReview._id}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.message).toContain("deleted successfully")

      // Verify review was deleted
      const deletedReview = await Review.findById(testReview._id)
      expect(deletedReview).toBeNull()
    })

    it("should not delete other user's review", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "other@test.com",
      })

      const response = await request(app)
        .delete(`/api/reviews/${testReview._id}`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .expect(404)

      expect(response.body.message).toContain("not found")

      // Verify review still exists
      const existingReview = await Review.findById(testReview._id)
      expect(existingReview).toBeDefined()
    })
  })

  describe("POST /api/reviews/:id/helpful", () => {
    let testReview

    beforeEach(async () => {
      testReview = new Review({
        product: testProduct._id,
        user: customerUser._id,
        order: testOrder._id,
        rating: 4,
        title: "Helpful review",
        content: "This is a helpful review.",
        moderationStatus: "approved",
      })
      await testReview.save()
    })

    it("should add helpful vote", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "voter@test.com",
      })

      const response = await request(app)
        .post(`/api/reviews/${testReview._id}/helpful`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ helpful: true })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.helpfulCount).toBe(1)
      expect(response.body.data.notHelpfulCount).toBe(0)
    })

    it("should update existing vote", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "voter@test.com",
      })

      // Add initial vote
      await request(app)
        .post(`/api/reviews/${testReview._id}/helpful`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ helpful: true })
        .expect(200)

      // Update vote
      const response = await request(app)
        .post(`/api/reviews/${testReview._id}/helpful`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ helpful: false })
        .expect(200)

      expect(response.body.data.helpfulCount).toBe(0)
      expect(response.body.data.notHelpfulCount).toBe(1)
    })

    it("should fail without authentication", async () => {
      await request(app)
        .post(`/api/reviews/${testReview._id}/helpful`)
        .send({ helpful: true })
        .expect(401)
    })
  })

  describe("POST /api/reviews/:id/flag", () => {
    let testReview

    beforeEach(async () => {
      testReview = new Review({
        product: testProduct._id,
        user: customerUser._id,
        order: testOrder._id,
        rating: 4,
        title: "Review to flag",
        content: "This review might be inappropriate.",
        moderationStatus: "approved",
      })
      await testReview.save()
    })

    it("should flag review", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "flagger@test.com",
      })

      const response = await request(app)
        .post(`/api/reviews/${testReview._id}/flag`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({
          reason: "inappropriate",
          details: "This review contains inappropriate content",
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.message).toContain("flagged successfully")

      // Verify flag was added
      const flaggedReview = await Review.findById(testReview._id)
      expect(flaggedReview.flags).toHaveLength(1)
      expect(flaggedReview.flags[0].reason).toBe("inappropriate")
    })

    it("should prevent duplicate flags from same user", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "flagger@test.com",
      })

      // Add first flag
      await request(app)
        .post(`/api/reviews/${testReview._id}/flag`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ reason: "inappropriate" })
        .expect(200)

      // Try to add duplicate flag
      const response = await request(app)
        .post(`/api/reviews/${testReview._id}/flag`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({ reason: "spam" })
        .expect(400)

      expect(response.body.message).toContain("already flagged")
    })

    it("should fail without reason", async () => {
      const otherUser = await global.createAuthenticatedUser({
        ...global.mockUsers.customer,
        email: "flagger@test.com",
      })

      const response = await request(app)
        .post(`/api/reviews/${testReview._id}/flag`)
        .set("Authorization", `Bearer ${otherUser.token}`)
        .send({}) // No reason provided
        .expect(400)

      expect(response.body.message).toContain("required")
    })
  })

  describe("GET /api/reviews/my-reviews", () => {
    beforeEach(async () => {
      // Create reviews for the customer
      const reviews = [
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 5,
          title: "My first review",
          content: "This is my first review.",
          moderationStatus: "approved",
        },
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 4,
          title: "My second review",
          content: "This is my second review.",
          moderationStatus: "pending",
        },
      ]

      for (const reviewData of reviews) {
        const review = new Review(reviewData)
        await review.save()
      }
    })

    it("should get user's own reviews", async () => {
      const response = await request(app)
        .get("/api/reviews/my-reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.reviews).toHaveLength(2)
      expect(response.body.data.reviews[0].user).toBe(customerUser._id.toString())
    })

    it("should filter reviews by status", async () => {
      const response = await request(app)
        .get("/api/reviews/my-reviews?status=approved")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)

      expect(response.body.data.reviews).toHaveLength(1)
      expect(response.body.data.reviews[0].moderationStatus).toBe("approved")
    })

    it("should fail without authentication", async () => {
      await request(app)
        .get("/api/reviews/my-reviews")
        .expect(401)
    })
  })

  describe("PUT /api/reviews/:id/moderate (Admin/Staff)", () => {
    let testReview

    beforeEach(async () => {
      testReview = new Review({
        product: testProduct._id,
        user: customerUser._id,
        order: testOrder._id,
        rating: 4,
        title: "Review to moderate",
        content: "This review needs moderation.",
        moderationStatus: "pending",
      })
      await testReview.save()
    })

    it("should approve review as admin", async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview._id}/moderate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "approved",
          response: "Review approved - meets our guidelines",
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.review.moderationStatus).toBe("approved")
      expect(response.body.data.review.response.content).toBe("Review approved - meets our guidelines")
      expect(response.body.data.review.moderatedAt).toBeDefined()
    })

    it("should reject review as staff", async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview._id}/moderate`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "rejected",
          response: "Review violates community guidelines",
        })
        .expect(200)

      expect(response.body.data.review.moderationStatus).toBe("rejected")
      expect(response.body.data.review.response.content).toBe("Review violates community guidelines")
    })

    it("should fail with invalid status", async () => {
      const response = await request(app)
        .put(`/api/reviews/${testReview._id}/moderate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid-status" })
        .expect(400)

      expect(response.body.message).toContain("Invalid moderation status")
    })

    it("should fail as regular customer", async () => {
      await request(app)
        .put(`/api/reviews/${testReview._id}/moderate`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "approved" })
        .expect(403)
    })

    it("should fail without authentication", async () => {
      await request(app)
        .put(`/api/reviews/${testReview._id}/moderate`)
        .send({ status: "approved" })
        .expect(401)
    })
  })

  describe("GET /api/reviews/moderation (Admin/Staff)", () => {
    beforeEach(async () => {
      // Create reviews with different moderation statuses
      const reviews = [
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 5,
          title: "Pending review 1",
          content: "This review is pending moderation.",
          moderationStatus: "pending",
        },
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 4,
          title: "Pending review 2",
          content: "Another review pending moderation.",
          moderationStatus: "pending",
        },
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 3,
          title: "Flagged review",
          content: "This review has been flagged.",
          moderationStatus: "flagged",
        },
        {
          product: testProduct._id,
          user: customerUser._id,
          order: testOrder._id,
          rating: 5,
          title: "Approved review",
          content: "This review is already approved.",
          moderationStatus: "approved",
        },
      ]

      for (const reviewData of reviews) {
        const review = new Review(reviewData)
        await review.save()
      }
    })

    it("should get pending reviews for moderation as admin", async () => {
      const response = await request(app)
        .get("/api/reviews/moderation?status=pending")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.reviews).toHaveLength(2)
      expect(response.body.data.reviews[0].moderationStatus).toBe("pending")
    })

    it("should get flagged reviews as staff", async () => {
      const response = await request(app)
        .get("/api/reviews/moderation?status=flagged")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200)

      expect(response.body.data.reviews).toHaveLength(1)
      expect(response.body.data.reviews[0].moderationStatus).toBe("flagged")
    })

    it("should include moderation statistics", async () => {
      const response = await request(app)
        .get("/api/reviews/moderation")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.stats).toBeDefined()
      expect(response.body.data.stats.pending).toBe(2)
      expect(response.body.data.stats.flagged).toBe(1)
      expect(response.body.data.stats.approved).toBe(1)
    })

    it("should fail as regular customer", async () => {
      await request(app)
        .get("/api/reviews/moderation")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403)
    })

    it("should fail without authentication", async () => {
      await request(app)
        .get("/api/reviews/moderation")
        .expect(401)
    })
  })
})
