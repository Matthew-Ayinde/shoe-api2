const mongoose = require("mongoose")

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: {
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
})

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Update totals before saving
cartSchema.pre("save", function (next) {
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0)
  this.totalAmount = this.items.reduce((total, item) => total + item.variant.price * item.quantity, 0)
  this.lastModified = new Date()
  next()
})

// Method to add item to cart
cartSchema.methods.addItem = function (productId, variant, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      item.variant.size === variant.size &&
      item.variant.color === variant.color,
  )

  if (existingItemIndex > -1) {
    this.items[existingItemIndex].quantity += quantity
  } else {
    this.items.push({
      product: productId,
      variant,
      quantity,
    })
  }
}

// Method to remove item from cart
cartSchema.methods.removeItem = function (productId, size, color) {
  this.items = this.items.filter(
    (item) =>
      !(item.product.toString() === productId.toString() && item.variant.size === size && item.variant.color === color),
  )
}

// Method to update item quantity
cartSchema.methods.updateQuantity = function (productId, size, color, quantity) {
  const item = this.items.find(
    (item) =>
      item.product.toString() === productId.toString() && item.variant.size === size && item.variant.color === color,
  )

  if (item) {
    if (quantity <= 0) {
      this.removeItem(productId, size, color)
    } else {
      item.quantity = quantity
    }
  }
}

// Method to clear cart
cartSchema.methods.clearCart = function () {
  this.items = []
}

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema)
