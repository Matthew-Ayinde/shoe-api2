const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const Order = require("../models/Order")

// Create Stripe payment intent
const createStripePaymentIntent = async (order) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: "usd",
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.user.toString(),
      },
      description: `Order ${order.orderNumber}`,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return {
      success: true,
      paymentIntent,
      clientSecret: paymentIntent.client_secret,
    }
  } catch (error) {
    console.error("Create Stripe payment intent error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
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
    console.error("Process dummy payment error:", error)
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
