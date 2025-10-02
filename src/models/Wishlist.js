/**
 * Wishlist Model
 * 
 * Manages user wishlists for saving favorite products.
 * Features include:
 * - Multiple wishlists per user (e.g., "Favorites", "Birthday Wishlist")
 * - Product variants in wishlist (specific size/color preferences)
 * - Privacy settings (public/private wishlists)
 * - Sharing capabilities
 * - Price drop notifications
 * - Stock availability notifications
 */

const mongoose = require("mongoose")

/**
 * Wishlist Item Schema
 * Individual items within a wishlist
 */
const wishlistItemSchema = new mongoose.Schema({
  // Product reference
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  // Preferred variant (optional - user might want specific size/color)
  preferredVariant: {
    size: String,
    color: String,
    sku: String,
  },

  // Price tracking
  priceWhenAdded: {
    type: Number,
    required: true,
  },

  // Notifications preferences for this item
  notifications: {
    priceDropAlert: {
      type: Boolean,
      default: true,
    },
    stockAlert: {
      type: Boolean,
      default: true,
    },
    targetPrice: Number, // Alert when price drops to this level
  },

  // Priority/ranking within wishlist
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
  },

  // Personal notes about the item
  notes: {
    type: String,
    maxlength: 500,
  },

  // When item was added
  addedAt: {
    type: Date,
    default: Date.now,
  },

  // Last time user viewed this item
  lastViewedAt: Date,
})

/**
 * Wishlist Schema
 * Main wishlist container
 */
const wishlistSchema = new mongoose.Schema(
  {
    // Owner of the wishlist
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Wishlist name/title
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: "My Wishlist",
    },

    // Description of the wishlist
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Items in the wishlist
    items: [wishlistItemSchema],

    // Privacy settings
    isPublic: {
      type: Boolean,
      default: false,
    },

    // Sharing settings
    sharing: {
      isShareable: {
        type: Boolean,
        default: false,
      },
      shareToken: {
        type: String,
        unique: true,
        sparse: true, // Only create index for non-null values
      },
      sharedWith: [
        {
          email: String,
          sharedAt: { type: Date, default: Date.now },
          canEdit: { type: Boolean, default: false },
        },
      ],
    },

    // Wishlist category/type
    category: {
      type: String,
      enum: ["general", "birthday", "holiday", "wedding", "anniversary", "other"],
      default: "general",
    },

    // Event date (for birthday, holiday wishlists)
    eventDate: Date,

    // Display settings
    displaySettings: {
      showPrices: { type: Boolean, default: true },
      showNotes: { type: Boolean, default: true },
      sortBy: {
        type: String,
        enum: ["dateAdded", "priority", "price", "name"],
        default: "dateAdded",
      },
      sortOrder: {
        type: String,
        enum: ["asc", "desc"],
        default: "desc",
      },
    },

    // Analytics
    viewCount: {
      type: Number,
      default: 0,
    },

    // Last activity
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },

    // Wishlist status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
wishlistSchema.index({ user: 1, name: 1 })
wishlistSchema.index({ isPublic: 1 })
wishlistSchema.index({ "sharing.shareToken": 1 })
wishlistSchema.index({ "items.product": 1 })

/**
 * Pre-save middleware to generate share token if needed
 */
wishlistSchema.pre("save", function (next) {
  if (this.sharing.isShareable && !this.sharing.shareToken) {
    this.sharing.shareToken = require("crypto").randomBytes(16).toString("hex")
  }
  
  // Update last activity
  this.lastActivityAt = new Date()
  
  next()
})

/**
 * Instance method to add item to wishlist
 */
wishlistSchema.methods.addItem = function (productId, preferredVariant = null, priceWhenAdded, options = {}) {
  // Check if item already exists
  const existingItemIndex = this.items.findIndex((item) => {
    const sameProduct = item.product.toString() === productId.toString()
    
    if (!preferredVariant) return sameProduct
    
    return (
      sameProduct &&
      item.preferredVariant?.size === preferredVariant.size &&
      item.preferredVariant?.color === preferredVariant.color
    )
  })

  if (existingItemIndex > -1) {
    // Update existing item
    const existingItem = this.items[existingItemIndex]
    existingItem.priceWhenAdded = priceWhenAdded
    existingItem.addedAt = new Date()
    
    // Update options if provided
    if (options.priority) existingItem.priority = options.priority
    if (options.notes) existingItem.notes = options.notes
    if (options.notifications) {
      existingItem.notifications = { ...existingItem.notifications, ...options.notifications }
    }
  } else {
    // Add new item
    this.items.push({
      product: productId,
      preferredVariant,
      priceWhenAdded,
      priority: options.priority || 1,
      notes: options.notes || "",
      notifications: options.notifications || {},
    })
  }

  return this.save()
}

/**
 * Instance method to remove item from wishlist
 */
wishlistSchema.methods.removeItem = function (productId, preferredVariant = null) {
  this.items = this.items.filter((item) => {
    const sameProduct = item.product.toString() === productId.toString()
    
    if (!preferredVariant) return !sameProduct
    
    return !(
      sameProduct &&
      item.preferredVariant?.size === preferredVariant.size &&
      item.preferredVariant?.color === preferredVariant.color
    )
  })

  return this.save()
}

/**
 * Instance method to update item
 */
wishlistSchema.methods.updateItem = function (productId, updates, preferredVariant = null) {
  const item = this.items.find((item) => {
    const sameProduct = item.product.toString() === productId.toString()
    
    if (!preferredVariant) return sameProduct
    
    return (
      sameProduct &&
      item.preferredVariant?.size === preferredVariant.size &&
      item.preferredVariant?.color === preferredVariant.color
    )
  })

  if (item) {
    Object.assign(item, updates)
    return this.save()
  }

  throw new Error("Item not found in wishlist")
}

/**
 * Instance method to move item to another wishlist
 */
wishlistSchema.methods.moveItemTo = async function (productId, targetWishlistId, preferredVariant = null) {
  const item = this.items.find((item) => {
    const sameProduct = item.product.toString() === productId.toString()
    
    if (!preferredVariant) return sameProduct
    
    return (
      sameProduct &&
      item.preferredVariant?.size === preferredVariant.size &&
      item.preferredVariant?.color === preferredVariant.color
    )
  })

  if (!item) {
    throw new Error("Item not found in wishlist")
  }

  // Get target wishlist
  const targetWishlist = await this.constructor.findById(targetWishlistId)
  if (!targetWishlist) {
    throw new Error("Target wishlist not found")
  }

  // Add to target wishlist
  await targetWishlist.addItem(
    item.product,
    item.preferredVariant,
    item.priceWhenAdded,
    {
      priority: item.priority,
      notes: item.notes,
      notifications: item.notifications,
    }
  )

  // Remove from current wishlist
  await this.removeItem(productId, preferredVariant)

  return { source: this, target: targetWishlist }
}

/**
 * Instance method to share wishlist
 */
wishlistSchema.methods.shareWith = function (email, canEdit = false) {
  // Check if already shared with this email
  const existingShare = this.sharing.sharedWith.find((share) => share.email === email)
  
  if (existingShare) {
    existingShare.canEdit = canEdit
    existingShare.sharedAt = new Date()
  } else {
    this.sharing.sharedWith.push({ email, canEdit })
  }

  this.sharing.isShareable = true
  return this.save()
}

/**
 * Instance method to unshare wishlist
 */
wishlistSchema.methods.unshareWith = function (email) {
  this.sharing.sharedWith = this.sharing.sharedWith.filter((share) => share.email !== email)
  
  if (this.sharing.sharedWith.length === 0) {
    this.sharing.isShareable = false
  }

  return this.save()
}

/**
 * Instance method to get sorted items
 */
wishlistSchema.methods.getSortedItems = function () {
  const { sortBy, sortOrder } = this.displaySettings
  
  return this.items.sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case "dateAdded":
        comparison = new Date(a.addedAt) - new Date(b.addedAt)
        break
      case "priority":
        comparison = b.priority - a.priority // Higher priority first
        break
      case "price":
        comparison = a.priceWhenAdded - b.priceWhenAdded
        break
      case "name":
        // This would need product population
        comparison = 0
        break
      default:
        comparison = 0
    }
    
    return sortOrder === "desc" ? -comparison : comparison
  })
}

/**
 * Static method to find public wishlists
 */
wishlistSchema.statics.findPublicWishlists = function (limit = 20, skip = 0) {
  return this.find({ isPublic: true, isActive: true })
    .populate("user", "profile.firstName profile.lastName")
    .populate("items.product", "name brand images")
    .sort({ viewCount: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip)
}

/**
 * Static method to find wishlist by share token
 */
wishlistSchema.statics.findByShareToken = function (shareToken) {
  return this.findOne({ "sharing.shareToken": shareToken, "sharing.isShareable": true })
    .populate("user", "profile.firstName profile.lastName")
    .populate("items.product", "name brand images variants")
}

/**
 * Virtual for total items count
 */
wishlistSchema.virtual("totalItems").get(function () {
  return this.items.length
})

/**
 * Virtual for total value
 */
wishlistSchema.virtual("totalValue").get(function () {
  return this.items.reduce((total, item) => total + item.priceWhenAdded, 0)
})

/**
 * Virtual for items needing price alerts
 */
wishlistSchema.virtual("itemsWithPriceAlerts").get(function () {
  return this.items.filter((item) => item.notifications.priceDropAlert)
})

module.exports = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema)
