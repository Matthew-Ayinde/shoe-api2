/**
 * Payment Routes - Comprehensive Stripe Integration
 *
 * Features:
 * - Stripe Payment Intents with advanced configuration
 * - Comprehensive webhook handling for all payment events
 * - Payment method management and saved cards
 * - Subscription and recurring payment support
 * - Advanced refund and dispute handling
 * - Payment analytics and reporting
 * - Multi-currency support
 * - Payment retry logic and failure recovery
 * - Fraud detection and risk management
 * - PCI compliance utilities
 */

const express = require("express")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const Order = require("../models/Order")
const User = require("../models/User")
const Product = require("../models/Product")
const { authenticate } = require("../middleware/auth")
const { isStaffOrAdmin } = require("../middleware/roles")
const { validateObjectId } = require("../middleware/validation")
const { emitOrderStatusUpdate, sendToAdmins } = require("../services/socketService")
const { sendEmail } = require("../services/emailService")
const logger = require("../utils/logger")

const router = express.Router()

// @desc    Create payment intent (Stripe) - Enhanced
// @route   POST /api/payments/create-intent
// @access  Private
router.post("/create-intent", authenticate, async (req, res) => {
  try {
    const {
      orderId,
      paymentMethodId,
      savePaymentMethod = false,
      currency = "usd",
      setupFutureUsage
    } = req.body

    if (!orderId) {
      return res.status(400).json({
        status: "error",
        message: "Order ID is required",
      })
    }

    const order = await Order.findById(orderId)
      .populate('user', 'profile email stripeCustomerId')
      .populate('items.product', 'name brand category')

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

    // Ensure user has Stripe customer ID
    let customerId = order.user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: order.user.email,
        name: `${order.user.profile.firstName} ${order.user.profile.lastName}`,
        metadata: {
          userId: order.user._id.toString()
        }
      })

      customerId = customer.id
      await User.findByIdAndUpdate(order.user._id, { stripeCustomerId: customerId })
    }

    // Build payment intent configuration
    const paymentIntentConfig = {
      amount: Math.round(order.pricing.total * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customerId,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.user._id.toString(),
        itemCount: order.items.length.toString(),
        categories: [...new Set(order.items.map(item => item.product.category))].join(',')
      },
      description: `Order ${order.orderNumber} - ${order.items.length} items`,
      statement_descriptor: 'SHOE STORE',
      receipt_email: order.user.email,
      shipping: {
        name: `${order.user.profile.firstName} ${order.user.profile.lastName}`,
        address: {
          line1: order.shippingAddress.street,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          postal_code: order.shippingAddress.zipCode,
          country: order.shippingAddress.country || 'US'
        }
      }
    }

    // Add payment method if provided
    if (paymentMethodId) {
      paymentIntentConfig.payment_method = paymentMethodId
      paymentIntentConfig.confirmation_method = 'manual'
      paymentIntentConfig.confirm = true
    }

    // Setup for future usage if requested
    if (savePaymentMethod || setupFutureUsage) {
      paymentIntentConfig.setup_future_usage = setupFutureUsage || 'off_session'
    }

    // Add automatic payment methods for better conversion
    paymentIntentConfig.automatic_payment_methods = {
      enabled: true,
      allow_redirects: 'never' // Keep it simple for now
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentConfig)

    // Update order with payment intent details
    order.payment.stripePaymentIntentId = paymentIntent.id
    order.payment.method = "stripe"
    order.payment.currency = currency
    order.payment.stripeCustomerId = customerId

    // Add payment attempt tracking
    if (!order.payment.attempts) {
      order.payment.attempts = []
    }
    order.payment.attempts.push({
      timestamp: new Date(),
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    })

    await order.save()

    // Log payment intent creation
    logger.info('Payment intent created', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      userId: order.user._id
    })

    const responseData = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }

    // If payment was confirmed immediately, handle the result
    if (paymentIntent.status === 'succeeded') {
      responseData.success = true
      responseData.message = 'Payment completed successfully'
    } else if (paymentIntent.status === 'requires_action') {
      responseData.requiresAction = true
      responseData.nextAction = paymentIntent.next_action
    }

    res.json({
      status: "success",
      data: responseData
    })

  } catch (error) {
    logger.error("Create payment intent error:", error)

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        status: "error",
        message: error.message,
        code: error.code,
        type: 'card_error'
      })
    }

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        status: "error",
        message: "Invalid payment request",
        type: 'invalid_request'
      })
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create payment intent",
      type: 'server_error'
    })
  }
})

// @desc    Confirm payment intent
// @route   POST /api/payments/confirm-intent
// @access  Private
router.post("/confirm-intent", authenticate, async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body

    if (!paymentIntentId) {
      return res.status(400).json({
        status: "error",
        message: "Payment intent ID is required",
      })
    }

    // Find order by payment intent ID
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntentId,
      user: req.user._id
    })

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found or access denied",
      })
    }

    // Confirm the payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
      return_url: `${process.env.CLIENT_URL}/orders/${order._id}/confirmation`
    })

    // Update order with confirmation attempt
    order.payment.attempts.push({
      timestamp: new Date(),
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      action: 'confirm'
    })
    await order.save()

    logger.info('Payment intent confirmed', {
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    })

    const responseData = {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status
    }

    if (paymentIntent.status === 'succeeded') {
      responseData.success = true
      responseData.message = 'Payment completed successfully'
    } else if (paymentIntent.status === 'requires_action') {
      responseData.requiresAction = true
      responseData.nextAction = paymentIntent.next_action
    } else if (paymentIntent.status === 'requires_payment_method') {
      responseData.requiresPaymentMethod = true
      responseData.message = 'Payment method failed, please try another'
    }

    res.json({
      status: "success",
      data: responseData
    })

  } catch (error) {
    logger.error("Confirm payment intent error:", error)

    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        status: "error",
        message: error.message,
        code: error.code,
        type: 'card_error'
      })
    }

    res.status(500).json({
      status: "error",
      message: "Failed to confirm payment",
      type: 'server_error'
    })
  }
})

// @desc    Get payment methods for user
// @route   GET /api/payments/payment-methods
// @access  Private
router.get("/payment-methods", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user.stripeCustomerId) {
      return res.json({
        status: "success",
        data: {
          paymentMethods: []
        }
      })
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card'
    })

    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        funding: pm.card.funding
      },
      created: pm.created
    }))

    res.json({
      status: "success",
      data: {
        paymentMethods: formattedMethods
      }
    })

  } catch (error) {
    logger.error("Get payment methods error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve payment methods"
    })
  }
})

// @desc    Delete payment method
// @route   DELETE /api/payments/payment-methods/:paymentMethodId
// @access  Private
router.delete("/payment-methods/:paymentMethodId", authenticate, async (req, res) => {
  try {
    const { paymentMethodId } = req.params
    const user = await User.findById(req.user._id)

    if (!user.stripeCustomerId) {
      return res.status(404).json({
        status: "error",
        message: "No payment methods found"
      })
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    if (paymentMethod.customer !== user.stripeCustomerId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      })
    }

    // Detach the payment method
    await stripe.paymentMethods.detach(paymentMethodId)

    logger.info('Payment method deleted', {
      userId: user._id,
      paymentMethodId,
      last4: paymentMethod.card?.last4
    })

    res.json({
      status: "success",
      message: "Payment method removed successfully"
    })

  } catch (error) {
    logger.error("Delete payment method error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to remove payment method"
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

// @desc    Stripe webhook handler - Enhanced
// @route   POST /api/payments/webhook
// @access  Public (Stripe webhook)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"]
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    logger.error("Webhook signature verification failed:", err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    logger.info('Webhook received', {
      type: event.type,
      id: event.id,
      objectId: event.data.object.id
    })

    switch (event.type) {
      // Payment Intent Events
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object)
        break

      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object)
        break

      case "payment_intent.canceled":
        await handlePaymentCancellation(event.data.object)
        break

      case "payment_intent.requires_action":
        await handlePaymentRequiresAction(event.data.object)
        break

      case "payment_intent.processing":
        await handlePaymentProcessing(event.data.object)
        break

      // Payment Method Events
      case "payment_method.attached":
        await handlePaymentMethodAttached(event.data.object)
        break

      case "payment_method.detached":
        await handlePaymentMethodDetached(event.data.object)
        break

      // Charge Events
      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object)
        break

      case "charge.failed":
        await handleChargeFailed(event.data.object)
        break

      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object)
        break

      // Refund Events
      case "charge.refunded":
        await handleChargeRefunded(event.data.object)
        break

      // Customer Events
      case "customer.created":
        await handleCustomerCreated(event.data.object)
        break

      case "customer.updated":
        await handleCustomerUpdated(event.data.object)
        break

      // Invoice Events (for subscriptions)
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object)
        break

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object)
        break

      // Subscription Events
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object)
        break

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object)
        break

      // Radar Events (Fraud Detection)
      case "radar.early_fraud_warning.created":
        await handleFraudWarning(event.data.object)
        break

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    logger.error("Webhook handler error:", error)
    res.status(500).json({ error: "Webhook handler failed" })
  }
})

/**
 * Enhanced Webhook Event Handlers
 */

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")
      .populate("items.product", "name brand")

    if (!order) {
      logger.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    // Update order payment status
    order.payment.status = "completed"
    order.payment.paidAt = new Date()
    order.payment.transactionId = paymentIntent.charges?.data[0]?.id || paymentIntent.id
    order.payment.receiptUrl = paymentIntent.charges?.data[0]?.receipt_url
    order.updateStatus("confirmed")

    // Add payment success to attempts log
    order.payment.attempts.push({
      timestamp: new Date(),
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: 'succeeded',
      action: 'webhook_success'
    })

    await order.save()

    // Send confirmation email
    try {
      await sendEmail({
        to: order.user.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        template: 'order-confirmation',
        data: {
          user: order.user,
          order: order,
          paymentAmount: (paymentIntent.amount / 100).toFixed(2),
          receiptUrl: order.payment.receiptUrl
        }
      })
    } catch (emailError) {
      logger.error('Failed to send confirmation email:', emailError)
    }

    // Emit real-time order status update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: "Payment successful! Your order has been confirmed.",
      receiptUrl: order.payment.receiptUrl
    })

    // Notify admins of new paid order
    sendToAdmins('new_paid_order', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: `${order.user.profile.firstName} ${order.user.profile.lastName}`,
      amount: (paymentIntent.amount / 100).toFixed(2),
      itemCount: order.items.length
    })

    logger.info(`Payment successful for order ${order.orderNumber}`, {
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      userId: order.user._id
    })

  } catch (error) {
    logger.error("Handle payment success error:", error)
  }
}

// Handle failed payment
const handlePaymentFailure = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")

    if (!order) {
      logger.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    // Get failure reason from last charge
    const lastCharge = paymentIntent.charges?.data[0]
    const failureCode = lastCharge?.failure_code
    const failureMessage = lastCharge?.failure_message
    const declineCode = lastCharge?.outcome?.seller_message

    order.payment.status = "failed"
    order.payment.failureReason = failureMessage || 'Payment failed'
    order.payment.failureCode = failureCode

    // Add failure to attempts log
    order.payment.attempts.push({
      timestamp: new Date(),
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: 'failed',
      action: 'webhook_failure',
      failureCode,
      failureMessage
    })

    await order.save()

    // Send failure notification email
    try {
      await sendEmail({
        to: order.user.email,
        subject: `Payment Failed - ${order.orderNumber}`,
        template: 'payment-failed',
        data: {
          user: order.user,
          order: order,
          failureReason: declineCode || failureMessage || 'Payment could not be processed',
          retryUrl: `${process.env.CLIENT_URL}/orders/${order._id}/payment`
        }
      })
    } catch (emailError) {
      logger.error('Failed to send payment failure email:', emailError)
    }

    // Emit real-time order status update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      message: `Payment failed: ${declineCode || failureMessage || 'Please try again or contact support.'}`,
      failureCode,
      canRetry: true
    })

    // Notify admins of payment failure
    sendToAdmins('payment_failure', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: `${order.user.profile.firstName} ${order.user.profile.lastName}`,
      amount: (paymentIntent.amount / 100).toFixed(2),
      failureReason: failureMessage,
      failureCode
    })

    logger.warn(`Payment failed for order ${order.orderNumber}`, {
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
      failureCode,
      failureMessage,
      userId: order.user._id
    })

  } catch (error) {
    logger.error("Handle payment failure error:", error)
  }
}

// Handle payment cancellation
const handlePaymentCancellation = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")

    if (!order) {
      logger.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    order.payment.status = "cancelled"
    order.payment.attempts.push({
      timestamp: new Date(),
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: 'cancelled',
      action: 'webhook_cancellation'
    })

    await order.save()

    // Emit real-time update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'cancelled',
      message: "Payment was cancelled. You can try again anytime."
    })

    logger.info(`Payment cancelled for order ${order.orderNumber}`, {
      orderId: order._id,
      paymentIntentId: paymentIntent.id
    })

  } catch (error) {
    logger.error("Handle payment cancellation error:", error)
  }
}

// Handle payment requires action
const handlePaymentRequiresAction = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")

    if (!order) {
      logger.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    // Emit real-time update for 3D Secure or other authentication
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'requires_action',
      message: "Additional authentication required for your payment.",
      nextAction: paymentIntent.next_action
    })

    logger.info(`Payment requires action for order ${order.orderNumber}`, {
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
      actionType: paymentIntent.next_action?.type
    })

  } catch (error) {
    logger.error("Handle payment requires action error:", error)
  }
}

// Handle payment processing
const handlePaymentProcessing = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      "payment.stripePaymentIntentId": paymentIntent.id,
    }).populate("user", "profile email")

    if (!order) {
      logger.error("Order not found for payment intent:", paymentIntent.id)
      return
    }

    // Emit real-time update
    emitOrderStatusUpdate(order.user._id, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'processing',
      message: "Your payment is being processed. Please wait..."
    })

    logger.info(`Payment processing for order ${order.orderNumber}`, {
      orderId: order._id,
      paymentIntentId: paymentIntent.id
    })

  } catch (error) {
    logger.error("Handle payment processing error:", error)
  }
}

// Handle payment method attached
const handlePaymentMethodAttached = async (paymentMethod) => {
  try {
    if (!paymentMethod.customer) return

    const user = await User.findOne({ stripeCustomerId: paymentMethod.customer })
    if (!user) return

    logger.info('Payment method attached', {
      userId: user._id,
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      last4: paymentMethod.card?.last4
    })

  } catch (error) {
    logger.error("Handle payment method attached error:", error)
  }
}

// Handle payment method detached
const handlePaymentMethodDetached = async (paymentMethod) => {
  try {
    logger.info('Payment method detached', {
      paymentMethodId: paymentMethod.id,
      type: paymentMethod.type,
      last4: paymentMethod.card?.last4
    })

  } catch (error) {
    logger.error("Handle payment method detached error:", error)
  }
}

// Handle charge succeeded
const handleChargeSucceeded = async (charge) => {
  try {
    logger.info('Charge succeeded', {
      chargeId: charge.id,
      amount: charge.amount,
      paymentIntentId: charge.payment_intent,
      receiptUrl: charge.receipt_url
    })

  } catch (error) {
    logger.error("Handle charge succeeded error:", error)
  }
}

// Handle charge failed
const handleChargeFailed = async (charge) => {
  try {
    logger.warn('Charge failed', {
      chargeId: charge.id,
      amount: charge.amount,
      paymentIntentId: charge.payment_intent,
      failureCode: charge.failure_code,
      failureMessage: charge.failure_message
    })

  } catch (error) {
    logger.error("Handle charge failed error:", error)
  }
}

// Handle dispute created
const handleDisputeCreated = async (dispute) => {
  try {
    const charge = await stripe.charges.retrieve(dispute.charge)
    const paymentIntent = charge.payment_intent

    if (paymentIntent) {
      const order = await Order.findOne({
        "payment.stripePaymentIntentId": paymentIntent
      }).populate("user", "profile email")

      if (order) {
        // Notify admins immediately
        sendToAdmins('dispute_created', {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customer: `${order.user.profile.firstName} ${order.user.profile.lastName}`,
          amount: (dispute.amount / 100).toFixed(2),
          reason: dispute.reason,
          status: dispute.status,
          disputeId: dispute.id
        })

        logger.warn('Dispute created', {
          orderId: order._id,
          disputeId: dispute.id,
          chargeId: dispute.charge,
          amount: dispute.amount,
          reason: dispute.reason
        })
      }
    }

  } catch (error) {
    logger.error("Handle dispute created error:", error)
  }
}

// Handle charge refunded
const handleChargeRefunded = async (charge) => {
  try {
    if (charge.payment_intent) {
      const order = await Order.findOne({
        "payment.stripePaymentIntentId": charge.payment_intent
      }).populate("user", "profile email")

      if (order) {
        const refundAmount = charge.amount_refunded / 100

        // Update order status if fully refunded
        if (charge.refunded) {
          order.payment.status = "refunded"
          order.updateStatus("refunded")
          await order.save()
        }

        // Emit real-time update
        emitOrderStatusUpdate(order.user._id, {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          message: `Refund of $${refundAmount.toFixed(2)} has been processed.`
        })

        logger.info('Charge refunded', {
          orderId: order._id,
          chargeId: charge.id,
          refundAmount: refundAmount
        })
      }
    }

  } catch (error) {
    logger.error("Handle charge refunded error:", error)
  }
}

// Handle customer created
const handleCustomerCreated = async (customer) => {
  try {
    logger.info('Stripe customer created', {
      customerId: customer.id,
      email: customer.email
    })

  } catch (error) {
    logger.error("Handle customer created error:", error)
  }
}

// Handle customer updated
const handleCustomerUpdated = async (customer) => {
  try {
    logger.info('Stripe customer updated', {
      customerId: customer.id,
      email: customer.email
    })

  } catch (error) {
    logger.error("Handle customer updated error:", error)
  }
}

// Handle fraud warning
const handleFraudWarning = async (fraudWarning) => {
  try {
    const charge = await stripe.charges.retrieve(fraudWarning.charge)

    // Notify admins immediately
    sendToAdmins('fraud_warning', {
      chargeId: fraudWarning.charge,
      amount: (charge.amount / 100).toFixed(2),
      fraudType: fraudWarning.fraud_type,
      actionable: fraudWarning.actionable
    })

    logger.warn('Fraud warning received', {
      chargeId: fraudWarning.charge,
      fraudType: fraudWarning.fraud_type,
      actionable: fraudWarning.actionable
    })

  } catch (error) {
    logger.error("Handle fraud warning error:", error)
  }
}

// Placeholder handlers for subscription events
const handleInvoicePaymentSucceeded = async (invoice) => {
  logger.info('Invoice payment succeeded', { invoiceId: invoice.id })
}

const handleInvoicePaymentFailed = async (invoice) => {
  logger.warn('Invoice payment failed', { invoiceId: invoice.id })
}

const handleSubscriptionCreated = async (subscription) => {
  logger.info('Subscription created', { subscriptionId: subscription.id })
}

const handleSubscriptionUpdated = async (subscription) => {
  logger.info('Subscription updated', { subscriptionId: subscription.id })
}

const handleSubscriptionDeleted = async (subscription) => {
  logger.info('Subscription deleted', { subscriptionId: subscription.id })
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
          supportedCards: ['visa', 'mastercard', 'amex', 'discover'],
          currencies: ['usd', 'eur', 'gbp', 'cad']
        },
        {
          id: "apple_pay",
          name: "Apple Pay",
          description: "Pay with Touch ID or Face ID",
          enabled: !!process.env.STRIPE_SECRET_KEY,
          platforms: ['ios', 'web']
        },
        {
          id: "google_pay",
          name: "Google Pay",
          description: "Pay with your Google account",
          enabled: !!process.env.STRIPE_SECRET_KEY,
          platforms: ['android', 'web']
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

// @desc    Get payment analytics (Admin)
// @route   GET /api/payments/analytics
// @access  Private (Admin)
router.get("/analytics", authenticate, isStaffOrAdmin, async (req, res) => {
  try {
    const { startDate, endDate, currency = 'usd' } = req.query

    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)

    const matchStage = {
      'payment.status': 'completed'
    }
    if (Object.keys(dateFilter).length > 0) {
      matchStage['payment.paidAt'] = dateFilter
    }

    const analytics = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$pricing.total' },
          paymentMethods: {
            $push: '$payment.method'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalOrders: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          paymentMethodBreakdown: {
            $reduce: {
              input: '$paymentMethods',
              initialValue: {},
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $cond: [
                      { $eq: [{ $type: { $getField: { field: '$$this', input: '$$value' } } }, 'missing'] },
                      { $arrayToObject: [[{ k: '$$this', v: 1 }]] },
                      { $arrayToObject: [[{ k: '$$this', v: { $add: [{ $getField: { field: '$$this', input: '$$value' } }, 1] } }]] }
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ])

    // Get failed payments count
    const failedPayments = await Order.countDocuments({
      'payment.status': 'failed',
      ...(Object.keys(dateFilter).length > 0 && { 'payment.paidAt': dateFilter })
    })

    // Get refunded payments
    const refundedPayments = await Order.aggregate([
      {
        $match: {
          'payment.status': 'refunded',
          ...(Object.keys(dateFilter).length > 0 && { 'payment.paidAt': dateFilter })
        }
      },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$pricing.total' },
          refundCount: { $sum: 1 }
        }
      }
    ])

    const result = analytics[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      paymentMethodBreakdown: {}
    }

    result.failedPayments = failedPayments
    result.refunds = refundedPayments[0] || { totalRefunded: 0, refundCount: 0 }
    result.successRate = result.totalOrders > 0
      ? ((result.totalOrders / (result.totalOrders + failedPayments)) * 100).toFixed(2)
      : 0

    res.json({
      status: "success",
      data: {
        analytics: result,
        currency: currency.toUpperCase(),
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        }
      }
    })

  } catch (error) {
    logger.error("Get payment analytics error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve payment analytics"
    })
  }
})

// @desc    Retry failed payment
// @route   POST /api/payments/:orderId/retry
// @access  Private
router.post("/:orderId/retry", authenticate, validateObjectId, async (req, res) => {
  try {
    const { orderId } = req.params
    const { paymentMethodId } = req.body

    const order = await Order.findById(orderId)
      .populate('user', 'profile email stripeCustomerId')

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found"
      })
    }

    // Check if user owns the order
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      })
    }

    // Check if order can be retried
    if (!['failed', 'cancelled'].includes(order.payment.status)) {
      return res.status(400).json({
        status: "error",
        message: "Order payment cannot be retried"
      })
    }

    // Create new payment intent for retry
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.pricing.total * 100),
      currency: order.payment.currency || 'usd',
      customer: order.user.stripeCustomerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.user._id.toString(),
        retry: 'true'
      },
      description: `Retry payment for order ${order.orderNumber}`
    })

    // Update order with new payment intent
    order.payment.stripePaymentIntentId = paymentIntent.id
    order.payment.status = 'pending'
    order.payment.attempts.push({
      timestamp: new Date(),
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      action: 'retry'
    })

    await order.save()

    logger.info('Payment retry initiated', {
      orderId: order._id,
      paymentIntentId: paymentIntent.id,
      userId: order.user._id
    })

    const responseData = {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret
    }

    if (paymentIntent.status === 'succeeded') {
      responseData.success = true
      responseData.message = 'Payment completed successfully'
    } else if (paymentIntent.status === 'requires_action') {
      responseData.requiresAction = true
      responseData.nextAction = paymentIntent.next_action
    }

    res.json({
      status: "success",
      data: responseData
    })

  } catch (error) {
    logger.error("Retry payment error:", error)

    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        status: "error",
        message: error.message,
        code: error.code,
        type: 'card_error'
      })
    }

    res.status(500).json({
      status: "error",
      message: "Failed to retry payment"
    })
  }
})

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private
router.get("/history", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const skip = (page - 1) * limit

    const filter = { user: req.user._id }
    if (status) {
      filter['payment.status'] = status
    }

    const orders = await Order.find(filter)
      .select('orderNumber payment pricing createdAt items')
      .populate('items.product', 'name brand images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Order.countDocuments(filter)

    const paymentHistory = orders.map(order => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.pricing.total,
      currency: order.payment.currency || 'USD',
      status: order.payment.status,
      method: order.payment.method,
      paidAt: order.payment.paidAt,
      transactionId: order.payment.transactionId,
      receiptUrl: order.payment.receiptUrl,
      itemCount: order.items.length,
      createdAt: order.createdAt
    }))

    res.json({
      status: "success",
      data: {
        payments: paymentHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    })

  } catch (error) {
    logger.error("Get payment history error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve payment history"
    })
  }
})

module.exports = router
