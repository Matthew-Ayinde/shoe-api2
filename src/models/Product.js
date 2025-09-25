const mongoose = require("mongoose")

const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    enum: [
      "5",
      "5.5",
      "6",
      "6.5",
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
      "12.5",
      "13",
      "14",
      "15",
    ],
  },
  color: {
    type: String,
    required: true,
  },
  colorCode: String, // Hex color code
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  compareAtPrice: Number, // Original price for sale items
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
  },
  images: [
    {
      public_id: String,
      url: String,
      alt: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
})

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    shortDescription: String,
    brand: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["running", "casual", "formal", "sports", "boots", "sandals", "sneakers"],
      index: true,
    },
    subcategory: String,
    gender: {
      type: String,
      enum: ["men", "women", "unisex", "kids"],
      required: true,
      index: true,
    },
    variants: [variantSchema],
    features: [String], // e.g., ['waterproof', 'breathable', 'lightweight']
    materials: [String], // e.g., ['leather', 'rubber', 'mesh']
    tags: [String],
    images: [
      {
        public_id: String,
        url: String,
        alt: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    seo: {
      title: String,
      description: String,
      keywords: [String],
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    totalSold: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    launchDate: Date,
    discontinuedDate: Date,
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
productSchema.index({ name: "text", description: "text", brand: "text" })
productSchema.index({ brand: 1, category: 1 })
productSchema.index({ "variants.price": 1 })
productSchema.index({ isActive: 1, isFeatured: 1 })
productSchema.index({ createdAt: -1 })

// Generate slug before saving
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }
  next()
})

// Virtual for price range
productSchema.virtual("priceRange").get(function () {
  if (this.variants.length === 0) return { min: 0, max: 0 }

  const prices = this.variants.map((v) => v.price)
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  }
})

// Virtual for total stock
productSchema.virtual("totalStock").get(function () {
  return this.variants.reduce((total, variant) => total + variant.stock, 0)
})

// Method to check if product is in stock
productSchema.methods.isInStock = function (size, color) {
  const variant = this.variants.find((v) => v.size === size && v.color === color)
  return variant && variant.stock > 0
}

// Method to get variant by size and color
productSchema.methods.getVariant = function (size, color) {
  return this.variants.find((v) => v.size === size && v.color === color)
}

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema)
