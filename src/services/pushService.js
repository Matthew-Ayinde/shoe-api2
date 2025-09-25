const webpush = require("web-push")
const User = require("../models/User")

// Configure web push
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:test@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

// Send push notification to single user
const sendPushNotification = async (userId, notification) => {
  try {
    const user = await User.findById(userId)

    if (!user || !user.pushSubscription || !user.preferences.pushNotifications) {
      return { success: false, reason: "No valid subscription or notifications disabled" }
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || "/icon-192x192.png",
      badge: notification.badge || "/badge-72x72.png",
      data: {
        url: notification.url || "/",
        type: notification.type || "general",
        timestamp: new Date().toISOString(),
        ...notification.data,
      },
    })

    await webpush.sendNotification(user.pushSubscription, payload)

    return { success: true }
  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error)

    // Handle invalid subscriptions
    if (error.statusCode === 410) {
      await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: 1 } })
      return { success: false, reason: "Invalid subscription removed" }
    }

    return { success: false, reason: error.message }
  }
}

// Send push notification to multiple users
const sendBulkPushNotification = async (userIds, notification) => {
  try {
    const users = await User.find({
      _id: { $in: userIds },
      pushSubscription: { $exists: true },
      "preferences.pushNotifications": true,
    })

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || "/icon-192x192.png",
      badge: notification.badge || "/badge-72x72.png",
      data: {
        url: notification.url || "/",
        type: notification.type || "bulk",
        timestamp: new Date().toISOString(),
        ...notification.data,
      },
    })

    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          await webpush.sendNotification(user.pushSubscription, payload)
          return { userId: user._id, success: true }
        } catch (error) {
          console.error(`Failed to send push notification to user ${user._id}:`, error)

          // Remove invalid subscriptions
          if (error.statusCode === 410) {
            user.pushSubscription = undefined
            await user.save()
          }

          return { userId: user._id, success: false, error: error.message }
        }
      }),
    )

    const successful = results.filter((result) => result.status === "fulfilled" && result.value.success).length
    const failed = results.length - successful

    return {
      success: true,
      totalSent: successful,
      totalFailed: failed,
      results: results.map((result) => (result.status === "fulfilled" ? result.value : result.reason)),
    }
  } catch (error) {
    console.error("Send bulk push notification error:", error)
    return { success: false, error: error.message }
  }
}

// Send order status update notification
const sendOrderStatusNotification = async (userId, orderData) => {
  const statusMessages = {
    confirmed: "Your order has been confirmed!",
    processing: "Your order is being processed",
    shipped: "Your order has been shipped!",
    delivered: "Your order has been delivered",
    cancelled: "Your order has been cancelled",
  }

  const notification = {
    title: `Order ${orderData.orderNumber}`,
    body: statusMessages[orderData.status] || `Order status updated to ${orderData.status}`,
    url: `/orders/${orderData.orderId}`,
    type: "order_status",
    data: {
      orderId: orderData.orderId,
      orderNumber: orderData.orderNumber,
      status: orderData.status,
    },
  }

  return await sendPushNotification(userId, notification)
}

// Send flash sale alert
const sendFlashSaleAlert = async (flashSaleData) => {
  try {
    // Get all users who want flash sale notifications
    const users = await User.find({
      pushSubscription: { $exists: true },
      "preferences.pushNotifications": true,
    })

    if (users.length === 0) {
      return { success: true, totalSent: 0 }
    }

    const notification = {
      title: `🔥 Flash Sale: ${flashSaleData.name}`,
      body: `Don't miss out! Up to ${flashSaleData.maxDiscount}% off on selected shoes!`,
      url: `/flash-sales/${flashSaleData.id}`,
      type: "flash_sale",
      data: {
        flashSaleId: flashSaleData.id,
        endTime: flashSaleData.endTime,
      },
    }

    const userIds = users.map((user) => user._id)
    return await sendBulkPushNotification(userIds, notification)
  } catch (error) {
    console.error("Send flash sale alert error:", error)
    return { success: false, error: error.message }
  }
}

// Send low stock alert to admin users
const sendLowStockAlert = async (productData) => {
  try {
    const adminUsers = await User.find({
      role: { $in: ["admin", "staff"] },
      pushSubscription: { $exists: true },
      "preferences.pushNotifications": true,
    })

    if (adminUsers.length === 0) {
      return { success: true, totalSent: 0 }
    }

    const notification = {
      title: "⚠️ Low Stock Alert",
      body: `${productData.productName} - ${productData.variant.color} (Size ${productData.variant.size}) is running low (${productData.variant.stock} left)`,
      url: `/admin/products/${productData.productId}`,
      type: "low_stock",
      data: {
        productId: productData.productId,
        variant: productData.variant,
      },
    }

    const userIds = adminUsers.map((user) => user._id)
    return await sendBulkPushNotification(userIds, notification)
  } catch (error) {
    console.error("Send low stock alert error:", error)
    return { success: false, error: error.message }
  }
}

// Send new order notification to admin users
const sendNewOrderAlert = async (orderData) => {
  try {
    const adminUsers = await User.find({
      role: { $in: ["admin", "staff"] },
      pushSubscription: { $exists: true },
      "preferences.pushNotifications": true,
    })

    if (adminUsers.length === 0) {
      return { success: true, totalSent: 0 }
    }

    const notification = {
      title: "🛍️ New Order",
      body: `New order ${orderData.orderNumber} from ${orderData.customerName} - $${orderData.totalAmount}`,
      url: `/admin/orders/${orderData.orderId}`,
      type: "new_order",
      data: {
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        totalAmount: orderData.totalAmount,
      },
    }

    const userIds = adminUsers.map((user) => user._id)
    return await sendBulkPushNotification(userIds, notification)
  } catch (error) {
    console.error("Send new order alert error:", error)
    return { success: false, error: error.message }
  }
}

// Send welcome notification to new users
const sendWelcomeNotification = async (userId, userData) => {
  const notification = {
    title: `Welcome to Our Shoe Store, ${userData.firstName}!`,
    body: "Thanks for joining us! Explore our latest collection and exclusive deals.",
    url: "/products",
    type: "welcome",
    data: {
      userId,
      isNewUser: true,
    },
  }

  return await sendPushNotification(userId, notification)
}

// Clean up invalid subscriptions
const cleanupInvalidSubscriptions = async () => {
  try {
    const result = await User.updateMany({ pushSubscription: { $exists: true } }, { $unset: { pushSubscription: 1 } })

    console.log(`Cleaned up ${result.modifiedCount} invalid push subscriptions`)
    return { success: true, cleaned: result.modifiedCount }
  } catch (error) {
    console.error("Cleanup invalid subscriptions error:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  sendPushNotification,
  sendBulkPushNotification,
  sendOrderStatusNotification,
  sendFlashSaleAlert,
  sendLowStockAlert,
  sendNewOrderAlert,
  sendWelcomeNotification,
  cleanupInvalidSubscriptions,
}
