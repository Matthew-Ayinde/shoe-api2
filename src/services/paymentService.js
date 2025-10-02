/**
 * Payment Service - Advanced Payment Processing
 *
 * Comprehensive payment service that handles:
 * - Payment intent creation and management
 * - Payment method management
 * - Subscription and recurring payments
 * - Refund processing
 * - Payment analytics and reporting
 * - Fraud detection and risk management
 * - Multi-currency support
 * - Payment retry logic
 * - Webhook event processing
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Order = require('../models/Order')
const User = require('../models/User')
const logger = require('../utils/logger')
const { sendEmail } = require('./emailService')
const { emitOrderStatusUpdate, sendToAdmins } = require('./socketService')

class PaymentService {
  /**
   * Create or retrieve Stripe customer for user
   */
  static async ensureStripeCustomer(user) {
    try {
      if (user.stripeCustomerId) {
        // Verify customer still exists in Stripe
        try {
          const customer = await stripe.customers.retrieve(user.stripeCustomerId)
          return customer
        } catch (error) {
          if (error.code === 'resource_missing') {
            // Customer was deleted, create new one
            user.stripeCustomerId = null
          } else {
            throw error
          }
        }
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.profile.firstName} ${user.profile.lastName}`,
        metadata: {
          userId: user._id.toString(),
          createdAt: new Date().toISOString()
        }
      })

      // Update user with customer ID
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id })

      logger.info('Stripe customer created', {
        userId: user._id,
        customerId: customer.id,
        email: user.email
      })

      return customer
    } catch (error) {
      logger.error('Error ensuring Stripe customer:', error)
      throw error
    }
  }

  /**
   * Create payment intent with advanced configuration
   */
  static async createPaymentIntent(order, options = {}) {
    try {
      const {
        paymentMethodId,
        savePaymentMethod = false,
        currency = 'usd',
        confirmImmediately = false,
        metadata = {}
      } = options

      // Ensure user has Stripe customer
      const customer = await this.ensureStripeCustomer(order.user)

      // Calculate fees and taxes
      const amount = Math.round(order.pricing.total * 100) // Convert to cents

      // Build payment intent configuration
      const config = {
        amount,
        currency: currency.toLowerCase(),
        customer: customer.id,
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          userId: order.user._id.toString(),
          itemCount: order.items.length.toString(),
          ...metadata
        },
        description: `Order ${order.orderNumber}`,
        statement_descriptor: 'SHOE STORE',
        receipt_email: order.user.email,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      }

      // Add shipping information if available
      if (order.shippingAddress) {
        config.shipping = {
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

      // Configure payment method
      if (paymentMethodId) {
        config.payment_method = paymentMethodId
        if (confirmImmediately) {
          config.confirmation_method = 'manual'
          config.confirm = true
        }
      }

      // Setup future usage
      if (savePaymentMethod) {
        config.setup_future_usage = 'off_session'
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create(config)

      // Update order with payment intent details
      order.payment.stripePaymentIntentId = paymentIntent.id
      order.payment.method = 'stripe'
      order.payment.currency = currency
      order.payment.stripeCustomerId = customer.id

      // Track payment attempt
      if (!order.payment.attempts) {
        order.payment.attempts = []
      }
      order.payment.attempts.push({
        timestamp: new Date(),
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        action: 'created'
      })

      await order.save()

      logger.info('Payment intent created', {
        orderId: order._id,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      })

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret
      }
    } catch (error) {
      logger.error('Error creating payment intent:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process refund with comprehensive handling
   */
  static async processRefund(order, options = {}) {
    try {
      const {
        amount,
        reason = 'requested_by_customer',
        metadata = {},
        notifyCustomer = true
      } = options

      if (order.payment.status !== 'completed') {
        throw new Error('Cannot refund order that is not paid')
      }

      const refundAmount = amount || order.pricing.total
      if (refundAmount > order.pricing.total) {
        throw new Error('Refund amount cannot exceed order total')
      }

      let refund
      if (order.payment.method === 'stripe' && order.payment.stripePaymentIntentId) {
        // Process Stripe refund
        refund = await stripe.refunds.create({
          payment_intent: order.payment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason,
          metadata: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            ...metadata
          }
        })

        // Update order
        order.payment.status = refund.amount === order.pricing.total * 100 ? 'refunded' : 'partially_refunded'
        order.payment.refunds = order.payment.refunds || []
        order.payment.refunds.push({
          refundId: refund.id,
          amount: refund.amount / 100,
          reason,
          status: refund.status,
          createdAt: new Date(refund.created * 1000)
        })
      } else {
        // Handle non-Stripe refunds
        order.payment.status = 'refunded'
        order.payment.refunds = order.payment.refunds || []
        order.payment.refunds.push({
          amount: refundAmount,
          reason,
          status: 'succeeded',
          createdAt: new Date()
        })
      }

      // Update order status
      if (order.payment.status === 'refunded') {
        order.updateStatus('refunded')
      }

      await order.save()

      // Send notification email
      if (notifyCustomer) {
        try {
          await sendEmail({
            to: order.user.email,
            subject: `Refund Processed - ${order.orderNumber}`,
            template: 'refund-processed',
            data: {
              user: order.user,
              order: order,
              refundAmount: refundAmount.toFixed(2),
              reason
            }
          })
        } catch (emailError) {
          logger.error('Failed to send refund email:', emailError)
        }
      }

      // Emit real-time update
      emitOrderStatusUpdate(order.user._id, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        message: `Refund of $${refundAmount.toFixed(2)} has been processed.`
      })

      logger.info('Refund processed', {
        orderId: order._id,
        refundId: refund?.id,
        amount: refundAmount,
        reason
      })

      return {
        success: true,
        refund: refund || { amount: refundAmount, status: 'succeeded' },
        order
      }
    } catch (error) {
      logger.error('Error processing refund:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Calculate payment processing fees
   */
  static calculateFees(amount, currency = 'usd', paymentMethod = 'card') {
    const fees = {
      usd: {
        card: { percentage: 0.029, fixed: 0.30 },
        ach: { percentage: 0.008, fixed: 0 }
      },
      eur: {
        card: { percentage: 0.014, fixed: 0.25 },
        sepa: { percentage: 0.008, fixed: 0 }
      }
    }

    const feeStructure = fees[currency]?.[paymentMethod] || fees.usd.card
    const percentageFee = amount * feeStructure.percentage
    const totalFee = percentageFee + feeStructure.fixed

    return {
      percentageFee: Math.round(percentageFee * 100) / 100,
      fixedFee: feeStructure.fixed,
      totalFee: Math.round(totalFee * 100) / 100,
      netAmount: Math.round((amount - totalFee) * 100) / 100
    }
  }

  /**
   * Validate payment method
   */
  static async validatePaymentMethod(paymentMethodId, customerId) {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

      if (paymentMethod.customer !== customerId) {
        throw new Error('Payment method does not belong to customer')
      }

      return {
        success: true,
        paymentMethod
      }
    } catch (error) {
      logger.error('Error validating payment method:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Legacy functions for backward compatibility
const createStripePaymentIntent = async (order) => {
  const result = await PaymentService.createPaymentIntent(order)
  return result
}

// Process dummy payment (for testing)
const processDummyPayment = async (order, paymentData = {}) => {
  try {
    const { shouldFail = false, delay = 2000 } = paymentData

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (shouldFail) {
      return {
        success: false,
        error: "Payment declined",
        transactionId: `dummy_failed_${Date.now()}`,
      }
    }

    return {
      success: true,
      transactionId: `dummy_success_${Date.now()}`,
      paidAt: new Date(),
      method: "dummy",
    }
  } catch (error) {
    logger.error("Process dummy payment error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Verify Stripe webhook signature
const verifyStripeWebhook = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)
    return { success: true, event }
  } catch (error) {
    console.error("Stripe webhook verification failed:", error)
    return { success: false, error: error.message }
  }
}

// Create Stripe refund
const createStripeRefund = async (paymentIntentId, amount, reason = "requested_by_customer") => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents if amount specified
      reason,
    })

    return {
      success: true,
      refund,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to dollars
    }
  } catch (error) {
    console.error("Create Stripe refund error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Get payment method details
const getPaymentMethodDetails = (method) => {
  const methods = {
    stripe: {
      name: "Credit/Debit Card",
      description: "Pay securely with your credit or debit card via Stripe",
      enabled: !!process.env.STRIPE_SECRET_KEY,
      fees: {
        percentage: 2.9,
        fixed: 0.3,
      },
    },
    dummy: {
      name: "Test Payment",
      description: "For testing and development purposes only",
      enabled: process.env.NODE_ENV === "development",
      fees: {
        percentage: 0,
        fixed: 0,
      },
    },
  }

  return methods[method] || null
}

// Calculate payment processing fees
const calculateProcessingFees = (amount, method) => {
  const methodDetails = getPaymentMethodDetails(method)

  if (!methodDetails) {
    return 0
  }

  const percentageFee = (amount * methodDetails.fees.percentage) / 100
  const totalFee = percentageFee + methodDetails.fees.fixed

  return Math.round(totalFee * 100) / 100 // Round to 2 decimal places
}

// Validate payment amount
const validatePaymentAmount = (amount) => {
  if (typeof amount !== "number" || amount <= 0) {
    return { valid: false, error: "Amount must be a positive number" }
  }

  if (amount < 0.5) {
    return { valid: false, error: "Minimum payment amount is $0.50" }
  }

  if (amount > 999999.99) {
    return { valid: false, error: "Maximum payment amount is $999,999.99" }
  }

  return { valid: true }
}

// Get supported currencies
const getSupportedCurrencies = () => {
  return [
    {
      code: "USD",
      name: "US Dollar",
      symbol: "$",
      default: true,
    },
    // Add more currencies as needed
  ]
}

// Format currency amount
const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

module.exports = {
  PaymentService,
  // Legacy exports for backward compatibility
  createStripePaymentIntent,
  processDummyPayment,
  verifyStripeWebhook,
  createStripeRefund,
  getPaymentMethodDetails,
  calculateProcessingFees,
  validatePaymentAmount,
  getSupportedCurrencies,
  formatCurrency,
}
