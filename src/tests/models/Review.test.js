/**
 * Review Model Tests
 * 
 * Comprehensive tests for the Review model including:
 * - Model validation and constraints
 * - Instance methods functionality
 * - Static methods functionality
 * - Middleware hooks (pre/post save)
 * - Virtual properties
 * - Database operations
 * 
 * Test Categories:
 * 1. Basic CRUD operations
 * 2. Validation tests
 * 3. Instance method tests
 * 4. Static method tests
 * 5. Middleware tests
 * 6. Integration tests
 */

const mongoose = require("mongoose")
const Review = require("../../models/Review")
const Product = require("../../models/Product")
const User = require("../../models/User")
const Order = require("../../models/Order")

describe("Review Model", () => {
  let testUser, testProduct, testOrder

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI)
  })

  beforeEach(async () => {
    await global.cleanupDatabase()

    // Create test user
    testUser = new User(global.mockUsers.customer)
    await testUser.save()

    // Create test product
    testProduct = new Product(global.mockProduct)
    await testProduct.save()

    // Create test order
    const orderData = {
      ...global.mockOrder,
      user: testUser._id,
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

  describe("Model Validation", () => {
    it("should create a valid review with required fields", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview._id).toBeDefined()
      expect(savedReview.rating).toBe(5)
      expect(savedReview.title).toBe("Great shoes!")
      expect(savedReview.moderationStatus).toBe("pending")
      expect(savedReview.isVerifiedPurchase).toBe(false) // Will be set by middleware
    })

    it("should fail validation without required fields", async () => {
      const review = new Review({})

      await expect(review.save()).rejects.toThrow()
    })

    it("should fail validation with invalid rating", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 6, // Invalid - should be 1-5
        title: "Test review",
        content: "Test content",
      }

      const review = new Review(reviewData)
      await expect(review.save()).rejects.toThrow()
    })

    it("should fail validation with empty title", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "", // Empty title should fail
        content: "Test content",
      }

      const review = new Review(reviewData)
      await expect(review.save()).rejects.toThrow()
    })

    it("should fail validation with content too short", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Test review",
        content: "Hi", // Too short - minimum 10 characters
      }

      const review = new Review(reviewData)
      await expect(review.save()).rejects.toThrow()
    })
  })

  describe("Pre-save Middleware", () => {
    it("should set isVerifiedPurchase to true for valid order", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview.isVerifiedPurchase).toBe(true)
    })

    it("should set isVerifiedPurchase to false for invalid order", async () => {
      // Create order for different user
      const otherUser = new User({
        ...global.mockUsers.customer,
        email: "other@test.com",
      })
      await otherUser.save()

      const otherOrder = new Order({
        ...global.mockOrder,
        user: otherUser._id,
        items: [
          {
            ...global.mockOrder.items[0],
            product: testProduct._id,
          },
        ],
      })
      await otherOrder.save()

      const reviewData = {
        product: testProduct._id,
        user: testUser._id, // Different user than order
        order: otherOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
      }

      const review = new Review(reviewData)
      const savedReview = await review.save()

      expect(savedReview.isVerifiedPurchase).toBe(false)
    })
  })

  describe("Instance Methods", () => {
    let testReview

    beforeEach(async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
      }

      testReview = new Review(reviewData)
      await testReview.save()
    })

    it("should add helpful vote", async () => {
      const otherUser = new User({
        ...global.mockUsers.customer,
        email: "voter@test.com",
      })
      await otherUser.save()

      await testReview.addHelpfulVote(otherUser._id, true)

      expect(testReview.helpfulVotes).toHaveLength(1)
      expect(testReview.helpfulVotes[0].user.toString()).toBe(otherUser._id.toString())
      expect(testReview.helpfulVotes[0].helpful).toBe(true)
    })

    it("should update existing helpful vote", async () => {
      const otherUser = new User({
        ...global.mockUsers.customer,
        email: "voter@test.com",
      })
      await otherUser.save()

      // Add initial vote
      await testReview.addHelpfulVote(otherUser._id, true)
      expect(testReview.helpfulVotes[0].helpful).toBe(true)

      // Update vote
      await testReview.addHelpfulVote(otherUser._id, false)
      expect(testReview.helpfulVotes).toHaveLength(1)
      expect(testReview.helpfulVotes[0].helpful).toBe(false)
    })

    it("should add flag to review", async () => {
      const flagger = new User({
        ...global.mockUsers.customer,
        email: "flagger@test.com",
      })
      await flagger.save()

      await testReview.addFlag(flagger._id, "inappropriate", "This review is offensive")

      expect(testReview.flags).toHaveLength(1)
      expect(testReview.flags[0].flaggedBy.toString()).toBe(flagger._id.toString())
      expect(testReview.flags[0].reason).toBe("inappropriate")
      expect(testReview.flags[0].details).toBe("This review is offensive")
    })

    it("should auto-flag review after 3 flags", async () => {
      // Create 3 different users to flag the review
      const flaggers = []
      for (let i = 0; i < 3; i++) {
        const flagger = new User({
          ...global.mockUsers.customer,
          email: `flagger${i}@test.com`,
        })
        await flagger.save()
        flaggers.push(flagger)
      }

      // Add 3 flags
      for (let i = 0; i < 3; i++) {
        await testReview.addFlag(flaggers[i]._id, "inappropriate", `Flag ${i + 1}`)
      }

      expect(testReview.flags).toHaveLength(3)
      expect(testReview.moderationStatus).toBe("flagged")
    })

    it("should moderate review", async () => {
      const moderator = new User(global.mockUsers.admin)
      await moderator.save()

      await testReview.moderate("approved", moderator._id, "Review approved")

      expect(testReview.moderationStatus).toBe("approved")
      expect(testReview.moderatedBy.toString()).toBe(moderator._id.toString())
      expect(testReview.moderatedAt).toBeDefined()
      expect(testReview.response.content).toBe("Review approved")
    })
  })

  describe("Static Methods", () => {
    beforeEach(async () => {
      // Create multiple reviews for testing
      const reviews = [
        {
          product: testProduct._id,
          user: testUser._id,
          order: testOrder._id,
          rating: 5,
          title: "Excellent!",
          content: "Amazing shoes, highly recommend!",
          moderationStatus: "approved",
        },
        {
          product: testProduct._id,
          user: testUser._id,
          order: testOrder._id,
          rating: 4,
          title: "Good quality",
          content: "Good shoes, comfortable to wear.",
          moderationStatus: "approved",
        },
        {
          product: testProduct._id,
          user: testUser._id,
          order: testOrder._id,
          rating: 3,
          title: "Average",
          content: "Shoes are okay, nothing special.",
          moderationStatus: "approved",
        },
      ]

      for (const reviewData of reviews) {
        const review = new Review(reviewData)
        await review.save()
      }
    })

    it("should update product rating correctly", async () => {
      await Review.updateProductRating(testProduct._id)

      const updatedProduct = await Product.findById(testProduct._id)
      expect(updatedProduct.ratings.average).toBeCloseTo(4.0, 1) // (5+4+3)/3 = 4
      expect(updatedProduct.ratings.count).toBe(3)
    })

    it("should handle product with no reviews", async () => {
      const newProduct = new Product({
        ...global.mockProduct,
        name: "New Test Product",
      })
      await newProduct.save()

      await Review.updateProductRating(newProduct._id)

      const updatedProduct = await Product.findById(newProduct._id)
      expect(updatedProduct.ratings.average).toBe(0)
      expect(updatedProduct.ratings.count).toBe(0)
    })
  })

  describe("Virtual Properties", () => {
    it("should calculate helpful votes count correctly", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
        helpfulVotes: [
          { user: new mongoose.Types.ObjectId(), helpful: true },
          { user: new mongoose.Types.ObjectId(), helpful: true },
          { user: new mongoose.Types.ObjectId(), helpful: false },
        ],
      }

      const review = new Review(reviewData)
      
      expect(review.helpfulCount).toBe(2)
      expect(review.notHelpfulCount).toBe(1)
    })
  })

  describe("Database Operations", () => {
    it("should find reviews by product", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
        moderationStatus: "approved",
      }

      const review = new Review(reviewData)
      await review.save()

      const reviews = await Review.find({ product: testProduct._id })
      expect(reviews).toHaveLength(1)
      expect(reviews[0].title).toBe("Great shoes!")
    })

    it("should populate related fields correctly", async () => {
      const reviewData = {
        product: testProduct._id,
        user: testUser._id,
        order: testOrder._id,
        rating: 5,
        title: "Great shoes!",
        content: "These shoes are amazing. Very comfortable and stylish.",
      }

      const review = new Review(reviewData)
      await review.save()

      const populatedReview = await Review.findById(review._id)
        .populate("user", "profile.firstName profile.lastName")
        .populate("product", "name brand")

      expect(populatedReview.user.profile.firstName).toBe("Test")
      expect(populatedReview.product.name).toBe("Test Running Shoe")
    })
  })
})
