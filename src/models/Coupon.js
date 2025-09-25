const mongoose = require("mongoose")

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number, // Only for percentage coupons
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    userUsageLimit: {
      type: Number,
      default: 1, // How many times a single user can use this coupon
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [String],
    applicableBrands: [String],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
couponSchema.index({ code: 1 })
couponSchema.index({ validFrom: 1, validTo: 1 })
couponSchema.index({ isActive: 1 })

// Virtual to check if coupon is currently valid
couponSchema.virtual("isCurrentlyValid").get(function () {
  const now = new Date()
  return (
    this.isActive &&
    this.validFrom <= now &&
    this.validTo >= now &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  )
})

// Method to check if coupon is applicable to products
couponSchema.methods.isApplicableToProducts = function (products) {
  // If no specific products/categories/brands specified, applies to all
  if (
    this.applicableProducts.length === 0 &&
    this.applicableCategories.length === 0 &&
    this.applicableBrands.length === 0
  ) {
    return true
  }

  return products.some((product) => {
    // Check if product is excluded
    if (this.excludedProducts.some((id) => id.toString() === product._id.toString())) {
      return false
    }

    // Check if product is in applicable products
    if (this.applicableProducts.some((id) => id.toString() === product._id.toString())) {
      return true
    }

    // Check if product category is applicable
    if (this.applicableCategories.includes(product.category)) {
      return true
    }

    // Check if product brand is applicable
    if (this.applicableBrands.includes(product.brand)) {
      return true
    }

    return false
  })
}

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function (orderAmount) {
  if (!this.isCurrentlyValid) {
    return 0
  }

  if (orderAmount < this.minOrderAmount) {
    return 0
  }

  let discount = 0

  if (this.type === "percentage") {
    discount = (orderAmount * this.value) / 100
    if (this.maxDiscount && discount > this.maxDiscount) {
      discount = this.maxDiscount
    }
  } else if (this.type === "fixed") {
    discount = this.value
  }

  // Don't let discount exceed order amount
  return Math.min(discount, orderAmount)
}

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema)
