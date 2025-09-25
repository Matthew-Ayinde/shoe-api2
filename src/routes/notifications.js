const express = require("express")
const webpush = require("web-push")
const User = require("../models/User")
const { authenticate } = require("../middleware/auth")
const { isStaffOrAdmin } = require("../middleware/roles")
const { sendBulkEmail } = require("../services/emailService")

const router = express.Router()

// Configure web push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:test@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
router.post("/subscribe", authenticate, async (req, res) => {
  try {
    const { subscription } = req.body

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        status: "error",
        message: "Invalid subscription data",
      })
    }

    // Update user's push subscription
    const user = await User.findById(req.user._id)
    user.pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    }

    await user.save()

    res.json({
      status: "success",
      message: "Push notification subscription saved",
    })
  } catch (error) {
    console.error("Subscribe to push notifications error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to subscribe to push notifications",
    })
  }
})

// @desc    Unsubscribe from push notifications
// @route   DELETE /api/notifications/subscribe
// @access  Private
router.delete("/subscribe", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.pushSubscription = undefined
    await user.save()

    res.json({
      status: "success",
      message: "Push notification subscription removed",
    })
  } catch (error) {
    console.error("Unsubscribe from push notifications error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to unsubscribe from push notifications",
    })
  }
})

// @desc    Send test push notification
// @route   POST /api/notifications/test-push
// @access  Private
router.post("/test-push", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user.pushSubscription) {
      return res.status(400).json({
        status: "error",
        message: "No push subscription found",
      })
    }

    const payload = JSON.stringify({
      title: "Test Notification",
      body: "This is a test push notification from your shoe store!",
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      data: {
        url: "/",
        type: "test",
      },
    })

    await webpush.sendNotification(user.pushSubscription, payload)

    res.json({
      status: "success",
      message: "Test push notification sent",
    })
  } catch (error) {
    console.error("Send test push notification error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to send test push notification",
    })
  }
})

// @desc    Send bulk push notification (Admin)
// @route   POST /api/notifications/bulk-push
// @access  Private (Admin)
router.post("/bulk-push", authenticate, isStaffOrAdmin, async (req, res) => {
  try {
    const { title, body, url, userIds, userRoles, icon, badge } = req.body

    if (!title || !body) {
      return res.status(400).json({
        status: "error",
        message: "Title and body are required",
      })
    }

    // Build user filter
    const filter = { pushSubscription: { $exists: true } }

    if (userIds && userIds.length > 0) {
      filter._id = { $in: userIds }
    } else if (userRoles && userRoles.length > 0) {
      filter.role = { $in: userRoles }
    }

    const users = await User.find(filter)

    if (users.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No users found with push subscriptions",
      })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icon-192x192.png",
      badge: badge || "/badge-72x72.png",
      data: {
        url: url || "/",
        type: "bulk",
        timestamp: new Date().toISOString(),
      },
    })

    const promises = users.map((user) => {
      if (user.pushSubscription && user.preferences.pushNotifications) {
        return webpush.sendNotification(user.pushSubscription, payload).catch((error) => {
          console.error(`Failed to send push notification to user ${user._id}:`, error)
          // Remove invalid subscription
          if (error.statusCode === 410) {
            user.pushSubscription = undefined
            user.save()
          }
        })
      }
    })

    await Promise.allSettled(promises)

    res.json({
      status: "success",
      message: `Bulk push notification sent to ${users.length} users`,
      data: {
        recipientCount: users.length,
      },
    })
  } catch (error) {
    console.error("Send bulk push notification error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to send bulk push notification",
    })
  }
})

// @desc    Send bulk email notification (Admin)
// @route   POST /api/notifications/bulk-email
// @access  Private (Admin)
router.post("/bulk-email", authenticate, isStaffOrAdmin, async (req, res) => {
  try {
    const { subject, htmlContent, textContent, userIds, userRoles, templateType } = req.body

    if (!subject || (!htmlContent && !textContent)) {
      return res.status(400).json({
        status: "error",
        message: "Subject and content are required",
      })
    }

    // Build user filter
    const filter = { "preferences.newsletter": true }

    if (userIds && userIds.length > 0) {
      filter._id = { $in: userIds }
    } else if (userRoles && userRoles.length > 0) {
      filter.role = { $in: userRoles }
    }

    const users = await User.find(filter, "email profile.firstName profile.lastName")

    if (users.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No users found matching criteria",
      })
    }

    const emailData = {
      subject,
      htmlContent,
      textContent,
      templateType,
      recipients: users.map((user) => ({
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
      })),
    }

    await sendBulkEmail(emailData)

    res.json({
      status: "success",
      message: `Bulk email sent to ${users.length} users`,
      data: {
        recipientCount: users.length,
      },
    })
  } catch (error) {
    console.error("Send bulk email error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to send bulk email",
    })
  }
})

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
router.get("/preferences", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id, "preferences pushSubscription")

    res.json({
      status: "success",
      data: {
        preferences: user.preferences,
        hasPushSubscription: !!user.pushSubscription,
      },
    })
  } catch (error) {
    console.error("Get notification preferences error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch notification preferences",
    })
  }
})

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
router.put("/preferences", authenticate, async (req, res) => {
  try {
    const { newsletter, pushNotifications, smsNotifications } = req.body

    const user = await User.findById(req.user._id)

    if (newsletter !== undefined) user.preferences.newsletter = newsletter
    if (pushNotifications !== undefined) user.preferences.pushNotifications = pushNotifications
    if (smsNotifications !== undefined) user.preferences.smsNotifications = smsNotifications

    await user.save()

    res.json({
      status: "success",
      message: "Notification preferences updated",
      data: {
        preferences: user.preferences,
      },
    })
  } catch (error) {
    console.error("Update notification preferences error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update notification preferences",
    })
  }
})

// @desc    Get VAPID public key
// @route   GET /api/notifications/vapid-public-key
// @access  Public
router.get("/vapid-public-key", (req, res) => {
  res.json({
    status: "success",
    data: {
      publicKey: process.env.VAPID_PUBLIC_KEY,
    },
  })
})

// @desc    Send flash sale notification
// @route   POST /api/notifications/flash-sale
// @access  Private (Admin)
router.post("/flash-sale", authenticate, isStaffOrAdmin, async (req, res) => {
  try {
    const { flashSaleId, customMessage } = req.body

    const FlashSale = require("../models/FlashSale")
    const flashSale = await FlashSale.findById(flashSaleId).populate("products.product", "name brand")

    if (!flashSale) {
      return res.status(404).json({
        status: "error",
        message: "Flash sale not found",
      })
    }

    // Get users who want flash sale notifications
    const users = await User.find({
      pushSubscription: { $exists: true },
      "preferences.pushNotifications": true,
    })

    const title = `🔥 Flash Sale: ${flashSale.name}`
    const body =
      customMessage ||
      `Don't miss out! Up to ${Math.max(...flashSale.products.map((p) => p.discountPercentage))}% off on selected shoes!`

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      data: {
        url: `/flash-sales/${flashSale._id}`,
        type: "flash_sale",
        flashSaleId: flashSale._id,
        timestamp: new Date().toISOString(),
      },
    })

    const promises = users.map((user) =>
      webpush.sendNotification(user.pushSubscription, payload).catch((error) => {
        console.error(`Failed to send flash sale notification to user ${user._id}:`, error)
        if (error.statusCode === 410) {
          user.pushSubscription = undefined
          user.save()
        }
      }),
    )

    await Promise.allSettled(promises)

    res.json({
      status: "success",
      message: `Flash sale notification sent to ${users.length} users`,
      data: {
        recipientCount: users.length,
        flashSale: {
          id: flashSale._id,
          name: flashSale.name,
        },
      },
    })
  } catch (error) {
    console.error("Send flash sale notification error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to send flash sale notification",
    })
  }
})

module.exports = router
