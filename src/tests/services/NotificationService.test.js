/**
 * NotificationService Tests
 * 
 * Comprehensive tests for the NotificationService including:
 * - Single user notifications
 * - Bulk user notifications
 * - Multi-channel delivery
 * - User preference handling
 * - Notification templates
 * - Database operations
 * 
 * Test Categories:
 * 1. Single notification tests
 * 2. Bulk notification tests
 * 3. Channel-specific tests
 * 4. Template tests
 * 5. Database operation tests
 * 6. Error handling tests
 */

const mongoose = require("mongoose")
const { NotificationService, NOTIFICATION_TYPES } = require("../../services/notificationService")
const Notification = require("../../models/Notification")
const User = require("../../models/User")

// Mock the external services
jest.mock("../../services/emailService")
jest.mock("../../services/pushService")
jest.mock("../../services/socketService")

describe("NotificationService", () => {
  let testUser1, testUser2

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI)
  })

  beforeEach(async () => {
    await global.cleanupDatabase()

    // Create test users
    testUser1 = new User({
      ...global.mockUsers.customer,
      email: "user1@test.com",
      preferences: {
        newsletter: true,
        pushNotifications: true,
        smsNotifications: false,
      },
    })
    await testUser1.save()

    testUser2 = new User({
      ...global.mockUsers.customer,
      email: "user2@test.com",
      preferences: {
        newsletter: false,
        pushNotifications: true,
        smsNotifications: true,
      },
    })
    await testUser2.save()

    // Clear all mocks
    jest.clearAllMocks()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  describe("Single User Notifications", () => {
    it("should send notification to single user with all channels", async () => {
      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.ORDER_CONFIRMATION,
        {
          orderNumber: "ORD-12345",
          url: "/orders/12345",
        }
      )

      expect(result.success).toBe(true)
      expect(result.notificationId).toBeDefined()
      expect(result.channels).toHaveProperty("email")
      expect(result.channels).toHaveProperty("push")
      expect(result.channels).toHaveProperty("in_app")

      // Verify notification was saved to database
      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification).toBeDefined()
      expect(savedNotification.recipient.toString()).toBe(testUser1._id.toString())
      expect(savedNotification.type).toBe(NOTIFICATION_TYPES.ORDER_CONFIRMATION)
    })

    it("should respect user preferences for channels", async () => {
      const result = await NotificationService.sendToUser(
        testUser2._id, // Has newsletter disabled
        NOTIFICATION_TYPES.WELCOME,
        {
          firstName: "Test",
          url: "/welcome",
        }
      )

      expect(result.success).toBe(true)
      
      // Verify notification was saved
      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.channels.email.sent).toBe(false) // Newsletter disabled
      expect(savedNotification.channels.push.sent).toBe(true)   // Push enabled
    })

    it("should handle inactive user", async () => {
      testUser1.isActive = false
      await testUser1.save()

      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.ORDER_CONFIRMATION,
        { orderNumber: "ORD-12345" }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("User not found or inactive")
    })

    it("should handle non-existent user", async () => {
      const fakeUserId = new mongoose.Types.ObjectId()

      const result = await NotificationService.sendToUser(
        fakeUserId,
        NOTIFICATION_TYPES.ORDER_CONFIRMATION,
        { orderNumber: "ORD-12345" }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("User not found or inactive")
    })

    it("should use custom title and message when provided", async () => {
      const customTitle = "Custom Notification Title"
      const customMessage = "This is a custom notification message"

      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.SYSTEM,
        { url: "/system" },
        {
          title: customTitle,
          message: customMessage,
        }
      )

      expect(result.success).toBe(true)

      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.title).toBe(customTitle)
      expect(savedNotification.message).toBe(customMessage)
    })
  })

  describe("Bulk User Notifications", () => {
    it("should send notifications to multiple users", async () => {
      const userIds = [testUser1._id, testUser2._id]

      const result = await NotificationService.sendToUsers(
        userIds,
        NOTIFICATION_TYPES.FLASH_SALE_ALERT,
        {
          name: "Summer Sale",
          description: "50% off all shoes!",
          url: "/flash-sales/summer",
        }
      )

      expect(result.success).toBe(true)
      expect(result.totalSent).toBe(2)
      expect(result.totalFailed).toBe(0)
      expect(result.results).toHaveLength(2)

      // Verify notifications were saved for both users
      const notifications = await Notification.find({
        type: NOTIFICATION_TYPES.FLASH_SALE_ALERT,
      })
      expect(notifications).toHaveLength(2)
    })

    it("should handle mixed success/failure in bulk notifications", async () => {
      const fakeUserId = new mongoose.Types.ObjectId()
      const userIds = [testUser1._id, fakeUserId, testUser2._id]

      const result = await NotificationService.sendToUsers(
        userIds,
        NOTIFICATION_TYPES.FLASH_SALE_ALERT,
        {
          name: "Summer Sale",
          description: "50% off all shoes!",
          url: "/flash-sales/summer",
        }
      )

      expect(result.success).toBe(true)
      expect(result.totalSent).toBe(2) // Only valid users
      expect(result.totalFailed).toBe(1) // Fake user failed
      expect(result.results).toHaveLength(3)
    })

    it("should handle empty user list", async () => {
      const result = await NotificationService.sendToUsers(
        [],
        NOTIFICATION_TYPES.FLASH_SALE_ALERT,
        { name: "Sale" }
      )

      expect(result.success).toBe(true)
      expect(result.totalSent).toBe(0)
      expect(result.totalFailed).toBe(0)
      expect(result.results).toHaveLength(0)
    })
  })

  describe("Notification Templates", () => {
    it("should use correct template for order confirmation", async () => {
      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.ORDER_CONFIRMATION,
        {
          orderNumber: "ORD-12345",
          url: "/orders/12345",
        }
      )

      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.title).toContain("Order Confirmation")
      expect(savedNotification.title).toContain("ORD-12345")
      expect(savedNotification.message).toContain("confirmed")
      expect(savedNotification.priority).toBe("high")
    })

    it("should use correct template for welcome notification", async () => {
      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.WELCOME,
        {
          firstName: "John",
          url: "/welcome",
        }
      )

      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.title).toContain("Welcome")
      expect(savedNotification.message).toContain("John")
      expect(savedNotification.priority).toBe("normal")
    })

    it("should use correct template for price drop alert", async () => {
      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.PRICE_DROP,
        {
          productName: "Running Shoes",
          discountPercentage: 25,
          url: "/products/123",
        }
      )

      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.title).toContain("Price Drop")
      expect(savedNotification.message).toContain("Running Shoes")
      expect(savedNotification.message).toContain("25%")
    })

    it("should use default template for unknown notification type", async () => {
      const result = await NotificationService.sendToUser(
        testUser1._id,
        "unknown_type",
        { url: "/test" }
      )

      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.title).toBe("Notification")
      expect(savedNotification.message).toBe("You have a new notification")
      expect(savedNotification.priority).toBe("normal")
    })
  })

  describe("Database Operations", () => {
    beforeEach(async () => {
      // Create some test notifications
      const notifications = [
        {
          recipient: testUser1._id,
          type: NOTIFICATION_TYPES.ORDER_CONFIRMATION,
          title: "Order Confirmed",
          message: "Your order has been confirmed",
          isRead: false,
        },
        {
          recipient: testUser1._id,
          type: NOTIFICATION_TYPES.ORDER_SHIPPED,
          title: "Order Shipped",
          message: "Your order has been shipped",
          isRead: true,
        },
        {
          recipient: testUser2._id,
          type: NOTIFICATION_TYPES.WELCOME,
          title: "Welcome",
          message: "Welcome to our store",
          isRead: false,
        },
      ]

      for (const notificationData of notifications) {
        const notification = new Notification(notificationData)
        await notification.save()
      }
    })

    it("should get user notifications with pagination", async () => {
      const result = await NotificationService.getUserNotifications(testUser1._id, {
        page: 1,
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.notifications).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)
    })

    it("should get only unread notifications", async () => {
      const result = await NotificationService.getUserNotifications(testUser1._id, {
        unreadOnly: true,
      })

      expect(result.success).toBe(true)
      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0].isRead).toBe(false)
    })

    it("should filter notifications by type", async () => {
      const result = await NotificationService.getUserNotifications(testUser1._id, {
        type: NOTIFICATION_TYPES.ORDER_CONFIRMATION,
      })

      expect(result.success).toBe(true)
      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0].type).toBe(NOTIFICATION_TYPES.ORDER_CONFIRMATION)
    })

    it("should mark notification as read", async () => {
      const notifications = await Notification.find({ recipient: testUser1._id, isRead: false })
      const notificationId = notifications[0]._id

      const result = await NotificationService.markAsRead(notificationId, testUser1._id)

      expect(result.success).toBe(true)
      expect(result.notification.isRead).toBe(true)
      expect(result.notification.readAt).toBeDefined()
    })

    it("should not mark notification as read for wrong user", async () => {
      const notifications = await Notification.find({ recipient: testUser1._id })
      const notificationId = notifications[0]._id

      const result = await NotificationService.markAsRead(notificationId, testUser2._id)

      expect(result.success).toBe(false)
      expect(result.error).toBe("Notification not found")
    })

    it("should mark all notifications as read", async () => {
      const result = await NotificationService.markAllAsRead(testUser1._id)

      expect(result.success).toBe(true)
      expect(result.modifiedCount).toBe(1) // Only 1 unread notification for user1

      // Verify all notifications are now read
      const unreadCount = await Notification.countDocuments({
        recipient: testUser1._id,
        isRead: false,
      })
      expect(unreadCount).toBe(0)
    })

    it("should delete notification", async () => {
      const notifications = await Notification.find({ recipient: testUser1._id })
      const notificationId = notifications[0]._id

      const result = await NotificationService.deleteNotification(notificationId, testUser1._id)

      expect(result.success).toBe(true)

      // Verify notification was deleted
      const deletedNotification = await Notification.findById(notificationId)
      expect(deletedNotification).toBeNull()
    })

    it("should get user notification statistics", async () => {
      const result = await NotificationService.getUserNotificationStats(testUser1._id)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(2)
      expect(result.stats.unread).toBe(1)
      expect(result.stats.byType).toHaveProperty(NOTIFICATION_TYPES.ORDER_CONFIRMATION)
      expect(result.stats.byType).toHaveProperty(NOTIFICATION_TYPES.ORDER_SHIPPED)
    })

    it("should handle user with no notifications", async () => {
      const newUser = new User({
        ...global.mockUsers.customer,
        email: "newuser@test.com",
      })
      await newUser.save()

      const result = await NotificationService.getUserNotificationStats(newUser._id)

      expect(result.success).toBe(true)
      expect(result.stats.total).toBe(0)
      expect(result.stats.unread).toBe(0)
      expect(result.stats.byType).toEqual({})
    })
  })

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // Mock mongoose connection error
      const originalSave = Notification.prototype.save
      Notification.prototype.save = jest.fn().mockRejectedValue(new Error("Database error"))

      const result = await NotificationService.sendToUser(
        testUser1._id,
        NOTIFICATION_TYPES.SYSTEM,
        { message: "Test" }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Database error")

      // Restore original method
      Notification.prototype.save = originalSave
    })

    it("should handle invalid notification type", async () => {
      const result = await NotificationService.sendToUser(
        testUser1._id,
        null,
        { message: "Test" }
      )

      expect(result.success).toBe(true) // Should still work with default template
      
      const savedNotification = await Notification.findById(result.notificationId)
      expect(savedNotification.type).toBeNull()
    })
  })
})
