const express = require("express")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const Order = require("../models/Order")
const { authenticate } = require("../middleware/auth")
const { validateObjectId } = require("../middleware/validation")
const { emitOrderStatusUpdate } = require("../services/socketService")

const router = express.Router()

// @desc    Create payment intent (Stripe)
// @route   POST /api/payments/create-intent
// @access  Private
router.post("/create-intent", authenticate, async (req, res) => {
  try {
    const { orderId } = req.body

    if (!orderId) {
      return res.status(400).json({
        status: "error",
        message: "Order ID is required",
      })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      })
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      })
    }

    // Check if order is in correct status
    if (order.payment.status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: "Order payment is not pending",
      })
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: "usd",
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: req.user._id.toString(),
      },
      description: `Order ${order.orderNumber}`,
    })

    // Update order with payment intent ID
    order.payment.stripePaymentIntentId = paymentIntent.id
    order.payment.method = "stripe"
    await order.save()

    res.json({
      status: "success",
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    })
  } catch (error) {
    console.error("Create payment intent error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to create payment intent",
    })
  }
})

// @desc    Process dummy payment (for testing)
// @route   POST /api/payments/dummy-payment
// @access  Private
router.post("/dummy-payment", authenticate, async (req, res) => {
  try {
    const { orderId, paymentMethod = "dummy_card", shouldFail = false } = req.body

    if (!orderId) {
      return res.status(400).json({
        status: "error",
        message: "Order ID is required",
      })
    }

    const order = await Order.findById(orderId).populate("user", "profile email")

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      })
    }

    // Check if user owns the order
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      })
    }

    // Check if order is in correct status
    if (order.payment.status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: "Order payment is not pending",
      })
    }

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (shouldFail) {
      // Simulate payment failure
      order.payment.status = "failed"
      order.payment.transactionId = `dummy_failed_${Date.now()}`
      await order.save()

      return res.status(400).json({
        status: "error",
        message: "Payment failed",
        data: {
          order,
        },
      })
    }

    // Simulate successful payment
    order.payment.status = "completed"
    order.payment.method = "dummy"
    order.payment.transactionId = `dummy_${Date.now()}`
    order.payment.paidAt = new Date()
    order.updateStatus("confirmed")

    await order.save()

    // Emit order status update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: "Payment successful! Your order has been confirmed.",
    })

    res.json({
      status: "success",
      message: "Payment processed successfully",
      data: {
        order,
        transaction: {
          id: order.payment.transactionId,
          method: order.payment.method,
          amount: order.totalAmount,
          paidAt: order.payment.paidAt,
        },
      },
    })
  } catch (error) {
    console.error("Dummy payment error:", error)
    res.status(500).json({
      status: "error",
      message: "Payment processing failed",
    })
  }
})

// @desc    Stripe webhook handler
// @route   POST /api/payments/webhook
// @access  Public (Stripe webhook)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"]
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object)
        break

      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object)
        break

      case "payment_intent.canceled":
        await handlePaymentCancellation(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    res.status(500).json({ error: "Webhook handler failed" })
  }
})

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")

    if (!order) {
      console.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    order.payment.status = "completed"
    order.payment.paidAt = new Date()
    order.updateStatus("confirmed")

    await order.save()

    // Emit order status update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: "Payment successful! Your order has been confirmed.",
    })

    console.log(`Payment successful for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Handle payment success error:", error)
  }
}

// Handle failed payment
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")

    if (!order) {
      console.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    order.payment.status = "failed"
    await order.save()

    // Emit order status update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: "Payment failed. Please try again or contact support.",
    })

    console.log(`Payment failed for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Handle payment failure error:", error)
  }
}

// Handle payment cancellation
const handlePaymentCancellation = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    })

    if (!order) {
      console.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    order.payment.status = "failed"
    await order.save()

    console.log(`Payment cancelled for order ${order.orderNumber}`)
  } catch (error) {
    console.error("Handle payment cancellation error:", error)
  }
}

// @desc    Get payment methods
// @route   GET /api/payments/methods
// @access  Private
router.get("/methods", authenticate, (req, res) => {
  res.json({
    status: "success",
    data: {
      methods: [
        {
          id: "stripe",
          name: "Credit/Debit Card",
          description: "Pay securely with your credit or debit card",
          enabled: !!process.env.STRIPE_SECRET_KEY,
        },
        {
          id: "dummy",
          name: "Test Payment",
          description: "For testing purposes only",
          enabled: process.env.NODE_ENV === "development",
        },
      ],
    },
  })
})

// @desc    Refund payment
// @route   POST /api/payments/:orderId/refund
// @access  Private (Admin)
router.post("/:orderId/refund", authenticate, validateObjectId, async (req, res) => {
  try {
    const { orderId } = req.params
    const { amount, reason } = req.body

    // Check admin permissions
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      })
    }

    const order = await Order.findById(orderId).populate("user", "profile email")

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      })
    }

    if (order.payment.status !== "completed") {
      return res.status(400).json({
        status: "error",
        message: "Cannot refund order that is not paid",
      })
    }

    const refundAmount = amount || order.totalAmount

    if (refundAmount > order.totalAmount) {
      return res.status(400).json({
        status: "error",
        message: "Refund amount cannot exceed order total",
      })
    }

    if (order.payment.method === "stripe" && order.payment.stripePaymentIntentId) {
      // Process Stripe refund
      const refund = await stripe.refunds.create({
        payment_intent: order.payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: "requested_by_customer",
        metadata: {
          orderId: order._id.toString(),
          reason: reason || "Admin refund",
        },
      })

      order.payment.status = "refunded"
      order.adminNotes = `${order.adminNotes || ""}\nRefund processed: $${refundAmount}. Reason: ${reason || "Admin refund"}`
    } else {
      // Handle dummy payment refund
      order.payment.status = "refunded"
      order.adminNotes = `${order.adminNotes || ""}\nDummy refund processed: $${refundAmount}. Reason: ${reason || "Admin refund"}`
    }

    await order.save()

    // Emit order status update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: "refunded",
      message: `Refund of $${refundAmount} has been processed for your order.`,
    })

    res.json({
      status: "success",
      message: "Refund processed successfully",
      data: {
        order,
        refundAmount,
      },
    })
  } catch (error) {
    console.error("Refund payment error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to process refund",
    })
  }
})

module.exports = router
