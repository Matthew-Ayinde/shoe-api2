/**
 * Wishlist Model Tests
 * 
 * Comprehensive tests for the Wishlist model including:
 * - Model validation and constraints
 * - Instance methods functionality
 * - Static methods functionality
 * - Wishlist item management
 * - Sharing functionality
 * - Virtual properties
 * 
 * Test Categories:
 * 1. Basic CRUD operations
 * 2. Validation tests
 * 3. Item management tests
 * 4. Sharing functionality tests
 * 5. Static method tests
 * 6. Virtual property tests
 */

const mongoose = require("mongoose")
const Wishlist = require("../../models/Wishlist")
const Product = require("../../models/Product")
const User = require("../../models/User")

describe("Wishlist Model", () => {
  let testUser, testProduct1, testProduct2

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI)
  })

  beforeEach(async () => {
    await global.cleanupDatabase()

    // Create test user
    testUser = new User(global.mockUsers.customer)
    await testUser.save()

    // Create test products
    testProduct1 = new Product(global.mockProduct)
    await testProduct1.save()

    testProduct2 = new Product({
      ...global.mockProduct,
      name: "Test Casual Shoe",
      category: "casual",
      variants: [
        {
          size: "8",
          color: "brown",
          sku: "TEST-CAS-BRN-8",
          price: 79.99,
          stock: 15,
          lowStockThreshold: 3,
          isActive: true,
        },
      ],
    })
    await testProduct2.save()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("Model Validation", () => {
    it("should create a valid wishlist with required fields", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "My Favorites",
        description: "My favorite shoes",
        category: "general",
      }

      const wishlist = new Wishlist(wishlistData)
      const savedWishlist = await wishlist.save()

      expect(savedWishlist._id).toBeDefined()
      expect(savedWishlist.name).toBe("My Favorites")
      expect(savedWishlist.description).toBe("My favorite shoes")
      expect(savedWishlist.category).toBe("general")
      expect(savedWishlist.isPublic).toBe(false)
      expect(savedWishlist.isActive).toBe(true)
      expect(savedWishlist.items).toHaveLength(0)
    })

    it("should create wishlist with default values", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
      }

      const wishlist = new Wishlist(wishlistData)
      const savedWishlist = await wishlist.save()

      expect(savedWishlist.name).toBe("Test Wishlist")
      expect(savedWishlist.category).toBe("general")
      expect(savedWishlist.isPublic).toBe(false)
      expect(savedWishlist.isActive).toBe(true)
      expect(savedWishlist.displaySettings.sortBy).toBe("dateAdded")
      expect(savedWishlist.displaySettings.sortOrder).toBe("desc")
    })

    it("should fail validation without required fields", async () => {
      const wishlist = new Wishlist({})
      await expect(wishlist.save()).rejects.toThrow()
    })

    it("should fail validation with invalid category", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
        category: "invalid-category",
      }

      const wishlist = new Wishlist(wishlistData)
      await expect(wishlist.save()).rejects.toThrow()
    })

    it("should fail validation with name too long", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "A".repeat(101), // Exceeds 100 character limit
      }

      const wishlist = new Wishlist(wishlistData)
      await expect(wishlist.save()).rejects.toThrow()
    })
  })

  describe("Pre-save Middleware", () => {
    it("should generate share token when sharing is enabled", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Shareable Wishlist",
        sharing: {
          isShareable: true,
        },
      }

      const wishlist = new Wishlist(wishlistData)
      const savedWishlist = await wishlist.save()

      expect(savedWishlist.sharing.shareToken).toBeDefined()
      expect(savedWishlist.sharing.shareToken).toHaveLength(32) // 16 bytes = 32 hex chars
    })

    it("should update lastActivityAt on save", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
      }

      const wishlist = new Wishlist(wishlistData)
      const beforeSave = new Date()
      const savedWishlist = await wishlist.save()

      expect(savedWishlist.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime())
    })
  })

  describe("Item Management", () => {
    let testWishlist

    beforeEach(async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
      }

      testWishlist = new Wishlist(wishlistData)
      await testWishlist.save()
    })

    it("should add item to wishlist", async () => {
      const preferredVariant = {
        size: "9",
        color: "black",
        sku: "TEST-RUN-BLK-9",
      }

      await testWishlist.addItem(testProduct1._id, preferredVariant, 99.99, {
        priority: 3,
        notes: "Need these for running",
      })

      expect(testWishlist.items).toHaveLength(1)
      expect(testWishlist.items[0].product.toString()).toBe(testProduct1._id.toString())
      expect(testWishlist.items[0].preferredVariant.size).toBe("9")
      expect(testWishlist.items[0].preferredVariant.color).toBe("black")
      expect(testWishlist.items[0].priceWhenAdded).toBe(99.99)
      expect(testWishlist.items[0].priority).toBe(3)
      expect(testWishlist.items[0].notes).toBe("Need these for running")
    })

    it("should update existing item when adding duplicate", async () => {
      const preferredVariant = {
        size: "9",
        color: "black",
        sku: "TEST-RUN-BLK-9",
      }

      // Add item first time
      await testWishlist.addItem(testProduct1._id, preferredVariant, 99.99, {
        priority: 3,
        notes: "First note",
      })

      // Add same item again with different details
      await testWishlist.addItem(testProduct1._id, preferredVariant, 89.99, {
        priority: 5,
        notes: "Updated note",
      })

      expect(testWishlist.items).toHaveLength(1)
      expect(testWishlist.items[0].priceWhenAdded).toBe(89.99)
      expect(testWishlist.items[0].priority).toBe(5)
      expect(testWishlist.items[0].notes).toBe("Updated note")
    })

    it("should remove item from wishlist", async () => {
      const preferredVariant = {
        size: "9",
        color: "black",
        sku: "TEST-RUN-BLK-9",
      }

      // Add item first
      await testWishlist.addItem(testProduct1._id, preferredVariant, 99.99)
      expect(testWishlist.items).toHaveLength(1)

      // Remove item
      await testWishlist.removeItem(testProduct1._id, preferredVariant)
      expect(testWishlist.items).toHaveLength(0)
    })

    it("should update item in wishlist", async () => {
      const preferredVariant = {
        size: "9",
        color: "black",
        sku: "TEST-RUN-BLK-9",
      }

      // Add item first
      await testWishlist.addItem(testProduct1._id, preferredVariant, 99.99, {
        priority: 3,
        notes: "Original note",
      })

      // Update item
      await testWishlist.updateItem(testProduct1._id, {
        priority: 5,
        notes: "Updated note",
      }, preferredVariant)

      expect(testWishlist.items[0].priority).toBe(5)
      expect(testWishlist.items[0].notes).toBe("Updated note")
    })

    it("should throw error when updating non-existent item", async () => {
      await expect(
        testWishlist.updateItem(testProduct1._id, { priority: 5 })
      ).rejects.toThrow("Item not found in wishlist")
    })

    it("should move item to another wishlist", async () => {
      // Create target wishlist
      const targetWishlist = new Wishlist({
        user: testUser._id,
        name: "Target Wishlist",
      })
      await targetWishlist.save()

      // Add item to source wishlist
      await testWishlist.addItem(testProduct1._id, null, 99.99, {
        priority: 3,
        notes: "Moving this item",
      })

      // Move item
      const result = await testWishlist.moveItemTo(testProduct1._id, targetWishlist._id)

      expect(result.source.items).toHaveLength(0)
      expect(result.target.items).toHaveLength(1)
      expect(result.target.items[0].product.toString()).toBe(testProduct1._id.toString())
      expect(result.target.items[0].notes).toBe("Moving this item")
    })
  })

  describe("Sharing Functionality", () => {
    let testWishlist

    beforeEach(async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Shareable Wishlist",
      }

      testWishlist = new Wishlist(wishlistData)
      await testWishlist.save()
    })

    it("should share wishlist with email", async () => {
      await testWishlist.shareWith("friend@example.com", false)

      expect(testWishlist.sharing.isShareable).toBe(true)
      expect(testWishlist.sharing.shareToken).toBeDefined()
      expect(testWishlist.sharing.sharedWith).toHaveLength(1)
      expect(testWishlist.sharing.sharedWith[0].email).toBe("friend@example.com")
      expect(testWishlist.sharing.sharedWith[0].canEdit).toBe(false)
    })

    it("should update existing share when sharing with same email", async () => {
      // Share first time
      await testWishlist.shareWith("friend@example.com", false)
      expect(testWishlist.sharing.sharedWith[0].canEdit).toBe(false)

      // Share again with edit permission
      await testWishlist.shareWith("friend@example.com", true)
      expect(testWishlist.sharing.sharedWith).toHaveLength(1)
      expect(testWishlist.sharing.sharedWith[0].canEdit).toBe(true)
    })

    it("should unshare wishlist", async () => {
      // Share first
      await testWishlist.shareWith("friend@example.com", false)
      expect(testWishlist.sharing.sharedWith).toHaveLength(1)

      // Unshare
      await testWishlist.unshareWith("friend@example.com")
      expect(testWishlist.sharing.sharedWith).toHaveLength(0)
      expect(testWishlist.sharing.isShareable).toBe(false)
    })
  })

  describe("Static Methods", () => {
    beforeEach(async () => {
      // Create public wishlists
      const publicWishlist1 = new Wishlist({
        user: testUser._id,
        name: "Public Wishlist 1",
        isPublic: true,
        viewCount: 10,
      })
      await publicWishlist1.save()

      const publicWishlist2 = new Wishlist({
        user: testUser._id,
        name: "Public Wishlist 2",
        isPublic: true,
        viewCount: 5,
      })
      await publicWishlist2.save()

      // Create private wishlist (should not appear in public results)
      const privateWishlist = new Wishlist({
        user: testUser._id,
        name: "Private Wishlist",
        isPublic: false,
      })
      await privateWishlist.save()
    })

    it("should find public wishlists", async () => {
      const publicWishlists = await Wishlist.findPublicWishlists(10, 0)

      expect(publicWishlists).toHaveLength(2)
      expect(publicWishlists[0].name).toBe("Public Wishlist 1") // Higher view count first
      expect(publicWishlists[1].name).toBe("Public Wishlist 2")
    })

    it("should find wishlist by share token", async () => {
      const shareableWishlist = new Wishlist({
        user: testUser._id,
        name: "Shareable Wishlist",
        sharing: {
          isShareable: true,
        },
      })
      await shareableWishlist.save()

      const foundWishlist = await Wishlist.findByShareToken(shareableWishlist.sharing.shareToken)

      expect(foundWishlist).toBeDefined()
      expect(foundWishlist.name).toBe("Shareable Wishlist")
    })
  })

  describe("Virtual Properties", () => {
    it("should calculate total items correctly", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
        items: [
          {
            product: testProduct1._id,
            priceWhenAdded: 99.99,
          },
          {
            product: testProduct2._id,
            priceWhenAdded: 79.99,
          },
        ],
      }

      const wishlist = new Wishlist(wishlistData)

      expect(wishlist.totalItems).toBe(2)
    })

    it("should calculate total value correctly", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
        items: [
          {
            product: testProduct1._id,
            priceWhenAdded: 99.99,
          },
          {
            product: testProduct2._id,
            priceWhenAdded: 79.99,
          },
        ],
      }

      const wishlist = new Wishlist(wishlistData)

      expect(wishlist.totalValue).toBe(179.98)
    })

    it("should filter items with price alerts", async () => {
      const wishlistData = {
        user: testUser._id,
        name: "Test Wishlist",
        items: [
          {
            product: testProduct1._id,
            priceWhenAdded: 99.99,
            notifications: {
              priceDropAlert: true,
            },
          },
          {
            product: testProduct2._id,
            priceWhenAdded: 79.99,
            notifications: {
              priceDropAlert: false,
            },
          },
        ],
      }

      const wishlist = new Wishlist(wishlistData)

      expect(wishlist.itemsWithPriceAlerts).toHaveLength(1)
      expect(wishlist.itemsWithPriceAlerts[0].product.toString()).toBe(testProduct1._id.toString())
    })
  })

  describe("Sorting Functionality", () => {
    let testWishlist

    beforeEach(async () => {
      testWishlist = new Wishlist({
        user: testUser._id,
        name: "Test Wishlist",
        items: [
          {
            product: testProduct1._id,
            priceWhenAdded: 99.99,
            priority: 3,
            addedAt: new Date("2023-01-01"),
          },
          {
            product: testProduct2._id,
            priceWhenAdded: 79.99,
            priority: 5,
            addedAt: new Date("2023-01-02"),
          },
        ],
        displaySettings: {
          sortBy: "priority",
          sortOrder: "desc",
        },
      })
    })

    it("should sort items by priority descending", async () => {
      const sortedItems = testWishlist.getSortedItems()

      expect(sortedItems[0].priority).toBe(5) // Higher priority first
      expect(sortedItems[1].priority).toBe(3)
    })

    it("should sort items by date added ascending", async () => {
      testWishlist.displaySettings.sortBy = "dateAdded"
      testWishlist.displaySettings.sortOrder = "asc"

      const sortedItems = testWishlist.getSortedItems()

      expect(sortedItems[0].addedAt.getTime()).toBeLessThan(sortedItems[1].addedAt.getTime())
    })

    it("should sort items by price ascending", async () => {
      testWishlist.displaySettings.sortBy = "price"
      testWishlist.displaySettings.sortOrder = "asc"

      const sortedItems = testWishlist.getSortedItems()

      expect(sortedItems[0].priceWhenAdded).toBe(79.99) // Lower price first
      expect(sortedItems[1].priceWhenAdded).toBe(99.99)
    })
  })
})
