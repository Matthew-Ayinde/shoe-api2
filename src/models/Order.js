/**
 * Order Model
 *
 * Comprehensive e-commerce order management system supporting:
 * - Complete order lifecycle tracking
 * - Payment integration with Stripe
 * - Shipping and tracking management
 * - Order status workflow
 * - Product snapshot preservation
 * - Pricing calculations and tax handling
 * - Coupon and discount application
 *
 * Key Features:
 * - Immutable order history (product snapshots)
 * - Real-time order tracking
 * - Payment attempt tracking
 * - Refund management
 * - Shipping integration
 * - Analytics and reporting support
 *
 * Performance Optimizations:
 * - Indexed fields for fast queries
 * - Efficient status-based filtering
 * - User-based order retrieval
 */

const mongoose = require("mongoose")

/**
 * Order Item Schema
 *
 * Represents individual items within an order with complete product information.
 * Includes product snapshots to preserve order details even if products change.
 *
 * Key Features:
 * - Product reference for current product data
 * - Product snapshot for historical preservation
 * - Variant-specific information (size, color, SKU)
 * - Quantity and pricing at time of purchase
 */
const orderItemSchema = new mongoose.Schema({
  // Reference to the current product (may change after order)
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true // Index for product-based order queries
  },

  // Product snapshot - preserves product details at time of purchase
  // This ensures order history remains accurate even if products are modified
  productSnapshot: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    brand: {
      type: String,
      required: true,
      trim: true
    },
    image: String, // Primary product image URL
    description: String, // Product description at time of purchase
    category: String, // Product category for analytics
  },

  // Specific variant information (size/color combination)
  variant: {
    size: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    // Store variant image if different from main product image
    image: String,
  },

  // Quantity ordered
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100 per item']
  },

  // Unit price at time of purchase (preserves pricing history)
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },

  // Total price for this line item (quantity × price)
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  },
})

/**
 * Main Order Schema
 *
 * Complete order information including customer details, items, pricing,
 * payment status, and shipping information.
 */
const orderSchema = new mongoose.Schema(
  {
    // Order Identification
    // Unique human-readable order number (e.g., "ORD-2024-001234")
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
      index: true // Index for fast order lookups
    },

    // Customer reference
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true // Index for user-based order queries
    },

    // Order items with complete product information
    items: [orderItemSchema],

    // Pricing Breakdown
    // Subtotal before taxes, shipping, and discounts
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },

    // Tax amount calculated based on shipping address
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },

    // Shipping cost based on method and destination
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative']
    },

    // Total discount amount applied (sum of all discounts)
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative']
    },

    // Final total amount charged to customer
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative']
    },

    // Applied Discounts and Promotions
    discounts: {
      // Coupon code applied (if any)
      couponCode: {
        type: String,
        uppercase: true,
        trim: true
      },

      // Discount amount from coupon
      couponDiscount: {
        type: Number,
        default: 0,
        min: [0, 'Coupon discount cannot be negative']
      },

      // Flash sale reference (if order was placed during flash sale)
      flashSaleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FlashSale"
      },

      // Discount amount from flash sale
      flashSaleDiscount: {
        type: Number,
        default: 0,
        min: [0, 'Flash sale discount cannot be negative']
      },
    },

    // Shipping Information
    // Complete shipping address (snapshot at time of order)
    shippingAddress: {
      firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
      },
      street: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters']
      },
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters']
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'State cannot exceed 50 characters']
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
        maxlength: [20, 'Zip code cannot exceed 20 characters']
      },
      country: {
        type: String,
        default: "US",
        trim: true,
        maxlength: [50, 'Country cannot exceed 50 characters']
      },
      phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
      },
    },

    // Shipping method selected by customer
    shippingMethod: {
      type: String,
      enum: {
        values: ["standard", "express", "overnight"],
        message: 'Shipping method must be one of: standard, express, overnight'
      },
      default: "standard",
      index: true // Index for shipping method analytics
    },

    // Payment Information
    payment: {
      // Payment processor used
      method: {
        type: String,
        enum: {
          values: ["stripe", "dummy"],
          message: 'Payment method must be one of: stripe, dummy'
        },
        required: true,
      },

      // Payment status tracking
      status: {
        type: String,
        enum: {
          values: ["pending", "completed", "failed", "refunded", "partially_refunded"],
          message: 'Payment status must be one of: pending, completed, failed, refunded, partially_refunded'
        },
        default: "pending",
        index: true // Index for payment status queries
      },

      // Stripe Payment Intent ID for tracking
      stripePaymentIntentId: String,

      // Transaction ID from payment processor
      transactionId: String,

      // Timestamp when payment was completed
      paidAt: Date,

      // Refund information
      refunds: [{
        amount: {
          type: Number,
          required: true,
          min: [0, 'Refund amount cannot be negative']
        },
        reason: String,
        refundedAt: {
          type: Date,
          default: Date.now
        },
        stripeRefundId: String,
      }],
    },

    // Order Status Workflow
    status: {
      type: String,
      enum: {
        values: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
        message: 'Order status must be one of: pending, confirmed, processing, shipped, delivered, cancelled, returned'
      },
      default: "pending",
      index: true // Index for status-based order queries
    },

    // Shipping Tracking Information
    tracking: {
      // Shipping carrier (e.g., "UPS", "FedEx", "USPS")
      carrier: {
        type: String,
        trim: true,
        maxlength: [50, 'Carrier name cannot exceed 50 characters']
      },

      // Tracking number provided by carrier
      trackingNumber: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [100, 'Tracking number cannot exceed 100 characters']
      },

      // Direct URL to carrier's tracking page
      trackingUrl: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Tracking URL must be a valid HTTP/HTTPS URL']
      },
    },

    // Order Lifecycle Timestamps
    // When order was confirmed (payment successful)
    confirmedAt: Date,

    // When order was shipped
    shippedAt: Date,

    // When order was delivered
    deliveredAt: Date,

    // When order was cancelled
    cancelledAt: Date,

    // Order Notes and Communication
    // Customer-provided notes (special instructions, etc.)
    customerNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Customer notes cannot exceed 500 characters']
    },

    // Internal admin notes for order management
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },

    // Gift Order Features
    // Flag indicating if this is a gift order
    isGift: { type: Boolean, default: false },

    // Gift message to include with shipment
    giftMessage: {
      type: String,
      trim: true,
      maxlength: [200, 'Gift message cannot exceed 200 characters']
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  },
)

/**
 * Database Indexes for Performance Optimization
 *
 * These indexes optimize common order queries:
 * - User order history (most common query)
 * - Order number lookups (customer service)
 * - Status-based filtering (admin dashboard)
 * - Payment status queries (financial reporting)
 */

// Compound index for user order history (most frequent query)
orderSchema.index({ user: 1, createdAt: -1 })

// Unique index for order number lookups
orderSchema.index({ orderNumber: 1 })

// Index for order status filtering
orderSchema.index({ status: 1 })

// Index for payment status queries
orderSchema.index({ "payment.status": 1 })

// Index for date-based reporting
orderSchema.index({ createdAt: -1 })

/**
 * Pre-save Middleware: Order Number Generation
 *
 * Automatically generates unique order numbers for new orders.
 * Format: ORD-{timestamp}-{random3digits}
 * Example: ORD-1640995200000-123
 */
orderSchema.pre("save", function (next) {
  if (this.isNew) {
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    this.orderNumber = `ORD-${timestamp}-${random}`
  }
  next()
})

/**
 * Pre-save Middleware: Automatic Total Calculations
 *
 * Recalculates order totals whenever the order is saved.
 * Ensures data consistency and prevents manual calculation errors.
 */
orderSchema.pre("save", function (next) {
  // Calculate subtotal from all items
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0)

  // Calculate final total: subtotal + tax + shipping - discounts
  this.totalAmount = Math.max(0,
    this.subtotal +
    (this.tax || 0) +
    (this.shippingCost || 0) -
    (this.discountAmount || 0)
  )

  next()
})

/**
 * Instance Method: Update Order Status
 *
 * Updates order status and automatically sets appropriate timestamps.
 * Ensures consistent status tracking throughout order lifecycle.
 *
 * @param {string} newStatus - New order status
 */
orderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus

  // Set appropriate timestamp based on status
  switch (newStatus) {
    case "confirmed":
      this.confirmedAt = new Date()
      break
    case "shipped":
      this.shippedAt = new Date()
      break
    case "delivered":
      this.deliveredAt = new Date()
      break
    case "cancelled":
      this.cancelledAt = new Date()
      break
  }
}

/**
 * Instance Method: Calculate Refund Amount
 *
 * Calculates the maximum refundable amount for the order.
 * Considers already processed refunds.
 *
 * @returns {number} - Maximum refundable amount
 */
orderSchema.methods.getRefundableAmount = function () {
  const totalRefunded = this.payment.refunds.reduce((sum, refund) => sum + refund.amount, 0)
  return Math.max(0, this.totalAmount - totalRefunded)
}

/**
 * Instance Method: Check if Order is Refundable
 *
 * Determines if the order can be refunded based on status and payment state.
 *
 * @returns {boolean} - True if order can be refunded
 */
orderSchema.methods.canBeRefunded = function () {
  return this.payment.status === 'completed' &&
         this.getRefundableAmount() > 0 &&
         !['delivered', 'cancelled'].includes(this.status)
}

/**
 * Instance Method: Get Order Summary
 *
 * Returns a formatted summary of the order for display purposes.
 *
 * @returns {Object} - Order summary object
 */
orderSchema.methods.getSummary = function () {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    totalAmount: this.totalAmount,
    itemCount: this.items.length,
    totalQuantity: this.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: this.createdAt,
    estimatedDelivery: this.getEstimatedDelivery()
  }
}

/**
 * Instance Method: Get Estimated Delivery Date
 *
 * Calculates estimated delivery date based on shipping method and order date.
 *
 * @returns {Date|null} - Estimated delivery date
 */
orderSchema.methods.getEstimatedDelivery = function () {
  if (this.status === 'delivered') return this.deliveredAt
  if (['cancelled', 'returned'].includes(this.status)) return null

  const baseDate = this.shippedAt || this.createdAt
  const deliveryDays = {
    'standard': 5,
    'express': 2,
    'overnight': 1
  }

  const days = deliveryDays[this.shippingMethod] || 5
  const estimatedDate = new Date(baseDate)
  estimatedDate.setDate(estimatedDate.getDate() + days)

  return estimatedDate
}

/**
 * Virtual Property: Order Age
 *
 * Calculates the age of the order in days since creation.
 * Useful for analytics and customer service.
 *
 * @returns {number} - Order age in days
 */
orderSchema.virtual("orderAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

/**
 * Export Order Model
 *
 * Uses mongoose.models.Order to prevent re-compilation errors in development.
 * This pattern ensures the model is only compiled once even with hot reloading.
 */
module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema)
