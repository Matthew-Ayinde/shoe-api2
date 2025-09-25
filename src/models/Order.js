const mongoose = require("mongoose")

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productSnapshot: {
    name: String,
    brand: String,
    image: String,
  },
  variant: {
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String, required: true },
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
})

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],

    // Pricing
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    // Discounts applied
    discounts: {
      couponCode: String,
      couponDiscount: { type: Number, default: 0 },
      flashSaleId: { type: mongoose.Schema.Types.ObjectId, ref: "FlashSale" },
      flashSaleDiscount: { type: Number, default: 0 },
    },

    // Shipping information
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: "US" },
      phone: String,
    },

    shippingMethod: {
      type: String,
      enum: ["standard", "express", "overnight"],
      default: "standard",
    },

    // Payment information
    payment: {
      method: {
        type: String,
        enum: ["stripe", "dummy"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "pending",
      },
      stripePaymentIntentId: String,
      transactionId: String,
      paidAt: Date,
    },

    // Order status
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },

    // Tracking
    tracking: {
      carrier: String,
      trackingNumber: String,
      trackingUrl: String,
    },

    // Timestamps
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // Notes
    customerNotes: String,
    adminNotes: String,

    // Flags
    isGift: { type: Boolean, default: false },
    giftMessage: String,
  },
  {
    timestamps: true,
  },
)

// Indexes
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ orderNumber: 1 })
orderSchema.index({ status: 1 })
orderSchema.index({ "payment.status": 1 })

// Generate order number before saving
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

// Calculate totals before saving
orderSchema.pre("save", function (next) {
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0)

  // Calculate total with tax, shipping, and discounts
  this.totalAmount = this.subtotal + this.tax + this.shippingCost - this.discountAmount

  next()
})

// Method to update status with timestamp
orderSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus

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

// Virtual for order age
orderSchema.virtual("orderAge").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)) // days
})

module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema)
