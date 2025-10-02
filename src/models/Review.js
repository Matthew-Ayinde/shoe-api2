/**
 * Review Model
 * 
 * Handles product reviews and ratings from customers.
 * Features include:
 * - Star ratings (1-5)
 * - Written reviews with moderation
 * - Helpful votes from other users
 * - Image attachments for reviews
 * - Verified purchase validation
 * - Review moderation and approval workflow
 */

const mongoose = require("mongoose")

/**
 * Review Schema
 * Stores customer reviews and ratings for products
 */
const reviewSchema = new mongoose.Schema(
  {
    // Product being reviewed
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // User who wrote the review
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Order that contains this product (for verified purchase)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Product variant reviewed (optional - for specific size/color feedback)
    variant: {
      size: String,
      color: String,
      sku: String,
    },

    // Rating (1-5 stars)
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Review title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Review content
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // Review images (optional)
    images: [
      {
        public_id: String,
        url: String,
        alt: String,
      },
    ],

    // Detailed ratings for different aspects
    detailedRatings: {
      comfort: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      sizing: { type: Number, min: 1, max: 5 },
      style: { type: Number, min: 1, max: 5 },
      value: { type: Number, min: 1, max: 5 },
    },

    // Pros and cons
    pros: [String],
    cons: [String],

    // Recommendation
    wouldRecommend: {
      type: Boolean,
      default: true,
    },

    // Verified purchase flag
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },

    // Moderation status
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
    },

    // Moderation details
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: Date,
    moderationNotes: String,

    // Helpful votes
    helpfulVotes: {
      up: { type: Number, default: 0 },
      down: { type: Number, default: 0 },
      voters: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          vote: { type: String, enum: ["up", "down"] },
          votedAt: { type: Date, default: Date.now },
        },
      ],
    },

    // Flags and reports
    flags: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: {
          type: String,
          enum: ["inappropriate", "spam", "fake", "offensive", "other"],
        },
        description: String,
        flaggedAt: { type: Date, default: Date.now },
      },
    ],

    // Response from seller/admin (optional)
    response: {
      content: String,
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      respondedAt: Date,
    },

    // SEO and display settings
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // Analytics
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for efficient queries
reviewSchema.index({ product: 1, moderationStatus: 1, createdAt: -1 })
reviewSchema.index({ user: 1, createdAt: -1 })
reviewSchema.index({ rating: 1 })
reviewSchema.index({ isVerifiedPurchase: 1 })
reviewSchema.index({ moderationStatus: 1 })

// Ensure one review per user per product per order
reviewSchema.index({ product: 1, user: 1, order: 1 }, { unique: true })

/**
 * Pre-save middleware to validate verified purchase
 */
reviewSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      // Check if the order contains this product and belongs to this user
      const Order = mongoose.model("Order")
      const order = await Order.findOne({
        _id: this.order,
        user: this.user,
        "items.product": this.product,
        status: { $in: ["delivered", "completed"] }, // Only allow reviews for delivered orders
      })

      if (order) {
        this.isVerifiedPurchase = true
      } else {
        return next(new Error("Cannot review product not purchased or not yet delivered"))
      }
    } catch (error) {
      return next(error)
    }
  }
  next()
})

/**
 * Post-save middleware to update product rating
 */
reviewSchema.post("save", async function () {
  try {
    await this.constructor.updateProductRating(this.product)
  } catch (error) {
    console.error("Error updating product rating:", error)
  }
})

/**
 * Post-remove middleware to update product rating
 */
reviewSchema.post("remove", async function () {
  try {
    await this.constructor.updateProductRating(this.product)
  } catch (error) {
    console.error("Error updating product rating:", error)
  }
})

/**
 * Static method to update product rating
 */
reviewSchema.statics.updateProductRating = async function (productId) {
  try {
    const stats = await this.aggregate([
      {
        $match: {
          product: productId,
          moderationStatus: "approved",
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ])

    const Product = mongoose.model("Product")
    
    if (stats.length > 0) {
      const { averageRating, totalReviews } = stats[0]
      
      await Product.findByIdAndUpdate(productId, {
        "ratings.average": Math.round(averageRating * 10) / 10, // Round to 1 decimal
        "ratings.count": totalReviews,
      })
    } else {
      // No approved reviews
      await Product.findByIdAndUpdate(productId, {
        "ratings.average": 0,
        "ratings.count": 0,
      })
    }
  } catch (error) {
    console.error("Error in updateProductRating:", error)
  }
}

/**
 * Instance method to add helpful vote
 */
reviewSchema.methods.addHelpfulVote = function (userId, voteType) {
  // Remove existing vote from this user
  this.helpfulVotes.voters = this.helpfulVotes.voters.filter(
    (voter) => voter.user.toString() !== userId.toString()
  )

  // Add new vote
  this.helpfulVotes.voters.push({
    user: userId,
    vote: voteType,
  })

  // Recalculate vote counts
  const upVotes = this.helpfulVotes.voters.filter((v) => v.vote === "up").length
  const downVotes = this.helpfulVotes.voters.filter((v) => v.vote === "down").length

  this.helpfulVotes.up = upVotes
  this.helpfulVotes.down = downVotes

  return this.save()
}

/**
 * Instance method to add flag/report
 */
reviewSchema.methods.addFlag = function (userId, reason, description = "") {
  // Check if user already flagged this review
  const existingFlag = this.flags.find(
    (flag) => flag.user.toString() === userId.toString()
  )

  if (existingFlag) {
    throw new Error("You have already flagged this review")
  }

  this.flags.push({
    user: userId,
    reason,
    description,
  })

  // Auto-flag for moderation if multiple flags
  if (this.flags.length >= 3 && this.moderationStatus === "approved") {
    this.moderationStatus = "flagged"
  }

  return this.save()
}

/**
 * Instance method to moderate review
 */
reviewSchema.methods.moderate = function (moderatorId, status, notes = "") {
  this.moderationStatus = status
  this.moderatedBy = moderatorId
  this.moderatedAt = new Date()
  this.moderationNotes = notes

  return this.save()
}

/**
 * Virtual for helpful score
 */
reviewSchema.virtual("helpfulScore").get(function () {
  const total = this.helpfulVotes.up + this.helpfulVotes.down
  if (total === 0) return 0
  return (this.helpfulVotes.up / total) * 100
})

/**
 * Virtual for review age in days
 */
reviewSchema.virtual("ageInDays").get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

/**
 * Method to check if user can vote on this review
 */
reviewSchema.methods.canUserVote = function (userId) {
  // Users can't vote on their own reviews
  if (this.user.toString() === userId.toString()) {
    return false
  }

  // Check if user already voted
  const existingVote = this.helpfulVotes.voters.find(
    (voter) => voter.user.toString() === userId.toString()
  )

  return !existingVote
}

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema)
