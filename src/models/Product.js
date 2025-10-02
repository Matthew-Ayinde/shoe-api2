/**
 * Product Model
 *
 * Comprehensive e-commerce product management system supporting:
 * - Multi-variant products (size, color combinations)
 * - Advanced inventory management
 * - SEO optimization with slugs and metadata
 * - Image management with Cloudinary integration
 * - Product categorization and filtering
 * - Review and rating aggregation
 * - Flash sale and promotion support
 *
 * Performance Features:
 * - Compound indexes for fast search and filtering
 * - Text search indexes for product discovery
 * - Optimized queries for catalog browsing
 *
 * Business Features:
 * - Stock tracking and low stock alerts
 * - Price comparison and sale pricing
 * - Product visibility controls
 * - Analytics tracking (views, purchases)
 */

const mongoose = require("mongoose")

/**
 * Product Variant Schema
 *
 * Represents individual product variations (size/color combinations).
 * Each variant has its own pricing, inventory, and SKU for precise control.
 *
 * Key Features:
 * - Unique SKU per variant for inventory tracking
 * - Individual pricing per variant (allows size-based pricing)
 * - Stock management at variant level
 * - Color codes for UI display
 * - Sale pricing support with compareAtPrice
 */
const variantSchema = new mongoose.Schema({
  // Shoe size - comprehensive range from 5 to 15 including half sizes
  size: {
    type: String,
    required: true,
    enum: [
      "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5",
      "10", "10.5", "11", "11.5", "12", "12.5", "13", "14", "15",
    ],
  },

  // Color name (e.g., "Black", "Navy Blue", "Crimson Red")
  color: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Color name cannot exceed 50 characters']
  },

  // Hex color code for UI display (e.g., "#000000" for black)
  colorCode: {
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code']
  },

  // Stock Keeping Unit - unique identifier for this specific variant
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'SKU cannot exceed 20 characters']
  },

  // Current selling price for this variant
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
    max: [10000, 'Price cannot exceed $10,000']
  },

  // Original price (for displaying discounts and sale pricing)
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price cannot be negative'],
    validate: {
      validator: function(value) {
        // compareAtPrice should be greater than or equal to current price
        return !value || value >= this.price
      },
      message: 'Compare at price must be greater than or equal to current price'
    }
  },

  // Available inventory for this specific variant
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  // Low stock alert threshold - triggers notifications when stock falls below this level
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: [0, 'Low stock threshold cannot be negative']
  },

  // Variant-specific images (different colors may have different images)
  images: [
    {
      public_id: String, // Cloudinary public ID for image management
      url: String,       // Full image URL
      alt: String,       // Alt text for accessibility
    },
  ],

  // Variant availability flag (allows hiding specific variants)
  isActive: {
    type: Boolean,
    default: true,
  },
})

/**
 * Main Product Schema
 *
 * Core product information shared across all variants.
 * Contains product metadata, categorization, and aggregated data.
 */
const productSchema = new mongoose.Schema(
  {
    // Product Identification and SEO
    // Product display name - searchable and user-facing
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters'],
      index: 'text' // Enable text search on product names
    },

    // URL-friendly slug for SEO and routing (e.g., "nike-air-max-270")
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },

    // Detailed product description - supports HTML for rich formatting
    description: {
      type: String,
      required: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      index: 'text' // Enable text search on descriptions
    },

    // Brief description for product cards and previews
    shortDescription: {
      type: String,
      // maxlength: [200, 'Short description cannot exceed 200 characters']
    },

    // Product Categorization
    // Brand name - indexed for fast brand-based filtering
    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Brand name cannot exceed 50 characters'],
      index: true, // Indexed for fast brand filtering
    },

    // Primary category - predefined list for consistent categorization
    category: {
      type: String,
      required: true,
      enum: {
        values: ["running", "casual", "formal", "sports", "boots", "sandals", "sneakers"],
        message: 'Category must be one of: running, casual, formal, sports, boots, sandals, sneakers'
      },
      index: true, // Indexed for fast category filtering
    },

    // Optional subcategory for more granular classification
    subcategory: {
      type: String,
      trim: true,
      maxlength: [50, 'Subcategory cannot exceed 50 characters']
    },

    // Target gender - supports unisex products
    gender: {
      type: String,
      enum: {
        values: ["men", "women", "unisex", "kids"],
        message: 'Gender must be one of: men, women, unisex, kids'
      },
      required: true,
      index: true, // Indexed for gender-based filtering
    },

    // Product Variants - array of size/color combinations with individual pricing and inventory
    variants: [variantSchema],

    // Product Attributes for Filtering and Search
    // Key features that customers search for (e.g., ['waterproof', 'breathable', 'lightweight'])
    features: {
      type: [String],
      validate: {
        validator: function(features) {
          return features.length <= 10 // Limit to 10 features for performance
        },
        message: 'Product cannot have more than 10 features'
      }
    },

    // Materials used in construction (e.g., ['leather', 'rubber', 'mesh'])
    materials: {
      type: [String],
      validate: {
        validator: function(materials) {
          return materials.length <= 10 // Limit to 10 materials for performance
        },
        message: 'Product cannot have more than 10 materials'
      }
    },

    // Flexible tagging system for marketing and organization
    tags: {
      type: [String],
      validate: {
        validator: function(tags) {
          return tags.length <= 20 // Limit to 20 tags for performance
        },
        message: 'Product cannot have more than 20 tags'
      }
    },

    // Product Images (shared across all variants, variant-specific images in variant schema)
    images: [
      {
        public_id: String, // Cloudinary public ID for image management
        url: String,       // Full image URL
        alt: String,       // Alt text for accessibility and SEO
        isPrimary: { type: Boolean, default: false }, // Primary image for product cards
      },
    ],

    // SEO Optimization Fields
    seo: {
      title: {
        type: String,
        maxlength: [60, 'SEO title cannot exceed 60 characters']
      },
      description: {
        type: String,
        maxlength: [160, 'SEO description cannot exceed 160 characters']
      },
      keywords: {
        type: [String],
        validate: {
          validator: function(keywords) {
            return keywords.length <= 10 // Limit SEO keywords
          },
          message: 'Cannot have more than 10 SEO keywords'
        }
      },
    },

    // Aggregated Rating Data (updated when reviews are added/modified)
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5']
      },
      count: {
        type: Number,
        default: 0,
        min: [0, 'Rating count cannot be negative']
      },
    },

    // Business Analytics
    totalSold: {
      type: Number,
      default: 0,
      min: [0, 'Total sold cannot be negative']
    },

    // Product Status Controls
    isActive: { type: Boolean, default: true },     // Product visibility in catalog
    isFeatured: { type: Boolean, default: false },  // Featured product promotion

    // Product Lifecycle Dates
    launchDate: Date,       // When product becomes available
    discontinuedDate: Date, // When product is discontinued (soft delete)
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  },
)

/**
 * Database Indexes for Performance Optimization
 *
 * These indexes are crucial for fast product search and filtering operations:
 * - Text search across name, description, and brand
 * - Compound indexes for common filter combinations
 * - Price range filtering for search results
 * - Product status filtering for catalog display
 * - Chronological sorting for admin interfaces
 */

// Full-text search index for product discovery
productSchema.index({
  name: "text",
  description: "text",
  brand: "text"
}, {
  weights: {
    name: 10,        // Product name is most important for search
    brand: 5,        // Brand is moderately important
    description: 1   // Description has lowest weight
  },
  name: "product_text_search"
})

// Compound index for brand + category filtering (very common combination)
productSchema.index({ brand: 1, category: 1 })

// Price range filtering index (for price-based search)
productSchema.index({ "variants.price": 1 })

// Product status index for catalog filtering
productSchema.index({ isActive: 1, isFeatured: 1 })

// Chronological index for admin product management
productSchema.index({ createdAt: -1 })

// Gender-based filtering index
productSchema.index({ gender: 1, category: 1 })

/**
 * Pre-save Middleware: Automatic Slug Generation
 *
 * Generates SEO-friendly URL slugs from product names.
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes leading/trailing hyphens
 * - Only regenerates if name is modified
 */
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
  }
  next()
})

/**
 * Virtual Property: Price Range
 *
 * Calculates the minimum and maximum prices across all variants.
 * Useful for displaying price ranges in product listings.
 *
 * @returns {Object} - {min: number, max: number}
 */
productSchema.virtual("priceRange").get(function () {
  if (this.variants.length === 0) return { min: 0, max: 0 }

  const prices = this.variants
    .filter(variant => variant.isActive) // Only consider active variants
    .map(variant => variant.price)

  if (prices.length === 0) return { min: 0, max: 0 }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  }
})

/**
 * Virtual Property: Total Stock
 *
 * Calculates total available inventory across all active variants.
 * Used for inventory management and stock display.
 *
 * @returns {number} - Total stock count
 */
productSchema.virtual("totalStock").get(function () {
  return this.variants
    .filter(variant => variant.isActive)
    .reduce((total, variant) => total + variant.stock, 0)
})

/**
 * Instance Method: Check Stock Availability
 *
 * Checks if a specific size/color combination is in stock.
 * Used during cart operations and product display.
 *
 * @param {string} size - Shoe size
 * @param {string} color - Color name
 * @returns {boolean} - True if variant is in stock
 */
productSchema.methods.isInStock = function (size, color) {
  const variant = this.variants.find(v =>
    v.size === size &&
    v.color === color &&
    v.isActive
  )
  return variant && variant.stock > 0
}

/**
 * Instance Method: Get Specific Variant
 *
 * Retrieves a specific variant by size and color combination.
 * Returns null if variant doesn't exist or is inactive.
 *
 * @param {string} size - Shoe size
 * @param {string} color - Color name
 * @returns {Object|null} - Variant object or null
 */
productSchema.methods.getVariant = function (size, color) {
  return this.variants.find(v =>
    v.size === size &&
    v.color === color &&
    v.isActive
  ) || null
}

/**
 * Instance Method: Get Available Sizes for Color
 *
 * Returns all available sizes for a specific color.
 * Useful for size selection UI components.
 *
 * @param {string} color - Color name
 * @returns {Array} - Array of available sizes
 */
productSchema.methods.getAvailableSizes = function (color) {
  return this.variants
    .filter(v => v.color === color && v.isActive && v.stock > 0)
    .map(v => v.size)
    .sort((a, b) => parseFloat(a) - parseFloat(b)) // Sort sizes numerically
}

/**
 * Instance Method: Get Available Colors
 *
 * Returns all available colors with stock information.
 * Useful for color selection UI components.
 *
 * @returns {Array} - Array of color objects with stock info
 */
productSchema.methods.getAvailableColors = function () {
  const colorMap = new Map()

  this.variants
    .filter(v => v.isActive)
    .forEach(variant => {
      if (!colorMap.has(variant.color)) {
        colorMap.set(variant.color, {
          color: variant.color,
          colorCode: variant.colorCode,
          totalStock: 0,
          availableSizes: []
        })
      }

      const colorInfo = colorMap.get(variant.color)
      colorInfo.totalStock += variant.stock

      if (variant.stock > 0) {
        colorInfo.availableSizes.push(variant.size)
      }
    })

  return Array.from(colorMap.values())
    .filter(color => color.totalStock > 0)
    .sort((a, b) => a.color.localeCompare(b.color))
}

/**
 * Export Product Model
 *
 * Uses mongoose.models.Product to prevent re-compilation errors in development.
 * This pattern ensures the model is only compiled once even with hot reloading.
 */
module.exports = mongoose.models.Product || mongoose.model("Product", productSchema)
