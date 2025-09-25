const mongoose = require("mongoose")

const flashSaleProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
    required: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
  },
  maxQuantity: {
    type: Number,
    default: null, // null means no limit
  },
  soldQuantity: {
    type: Number,
    default: 0,
  },
  variants: [
    {
      size: String,
      color: String,
      sku: String,
      maxQuantity: Number,
      soldQuantity: { type: Number, default: 0 },
    },
  ],
})

const flashSaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    products: [flashSaleProductSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1, // Higher number = higher priority
    },
    maxOrdersPerUser: {
      type: Number,
      default: null, // null means no limit
    },
    bannerImage: {
      public_id: String,
      url: String,
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
flashSaleSchema.index({ startTime: 1, endTime: 1 })
flashSaleSchema.index({ isActive: 1 })
flashSaleSchema.index({ "products.product": 1 })

// Virtual to check if flash sale is currently active
flashSaleSchema.virtual("isCurrentlyActive").get(function () {
  const now = new Date()
  return this.isActive && this.startTime <= now && this.endTime >= now
})

// Virtual to get time remaining
flashSaleSchema.virtual("timeRemaining").get(function () {
  const now = new Date()
  if (now < this.startTime) {
    return { status: "upcoming", milliseconds: this.startTime - now }
  } else if (now > this.endTime) {
    return { status: "ended", milliseconds: 0 }
  } else {
    return { status: "active", milliseconds: this.endTime - now }
  }
})

// Method to check if product is in flash sale
flashSaleSchema.methods.getProductSale = function (productId, size = null, color = null) {
  const productSale = this.products.find((p) => p.product.toString() === productId.toString())

  if (!productSale) return null

  // Check if specific variant is on sale
  if (size && color) {
    const variant = productSale.variants.find((v) => v.size === size && v.color === color)
    if (variant) {
      return {
        ...productSale.toObject(),
        variant,
        availableQuantity: variant.maxQuantity ? variant.maxQuantity - variant.soldQuantity : null,
      }
    }
  }

  return {
    ...productSale.toObject(),
    availableQuantity: productSale.maxQuantity ? productSale.maxQuantity - productSale.soldQuantity : null,
  }
}

// Method to update sold quantity
flashSaleSchema.methods.updateSoldQuantity = function (productId, quantity, size = null, color = null) {
  const productSale = this.products.find((p) => p.product.toString() === productId.toString())

  if (productSale) {
    productSale.soldQuantity += quantity

    // Update variant quantity if specified
    if (size && color) {
      const variant = productSale.variants.find((v) => v.size === size && v.color === color)
      if (variant) {
        variant.soldQuantity += quantity
      }
    }
  }
}

// Method to check availability
flashSaleSchema.methods.checkAvailability = function (productId, quantity, size = null, color = null) {
  if (!this.isCurrentlyActive) {
    return { available: false, reason: "Flash sale not active" }
  }

  const productSale = this.getProductSale(productId, size, color)

  if (!productSale) {
    return { available: false, reason: "Product not in flash sale" }
  }

  if (productSale.availableQuantity !== null && quantity > productSale.availableQuantity) {
    return { available: false, reason: "Insufficient quantity available" }
  }

  return { available: true }
}

module.exports = mongoose.models.FlashSale || mongoose.model("FlashSale", flashSaleSchema)
