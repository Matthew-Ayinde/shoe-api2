/**
 * Reviews Routes
 * 
 * Handles all review-related operations including:
 * - Creating product reviews
 * - Getting reviews with filtering and pagination
 * - Updating and deleting reviews
 * - Review moderation (admin/staff)
 * - Helpful votes on reviews
 * - Review flagging and reporting
 */

const express = require("express")
const multer = require("multer")
const Review = require("../models/Review")
const Product = require("../models/Product")
const Order = require("../models/Order")
const { authenticate, optionalAuth } = require("../middleware/auth")
const { requireRole } = require("../middleware/auth")
const { validatePagination, validateObjectId } = require("../middleware/validation")
const { uploadImage, deleteImage } = require("../config/cloudinary")
const { getPaginationInfo } = require("../utils/helpers")

const router = express.Router()

// Configure multer for review image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 5, // Maximum 5 images per review
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

/**
 * @desc    Get reviews for a product
 * @route   GET /api/reviews/product/:productId
 * @access  Public
 */
router.get("/product/:productId", validateObjectId, validatePagination, optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = "createdAt",
      sortOrder = "desc",
      verified = null,
    } = req.query

    // Build filter
    const filter = {
      product: productId,
      moderationStatus: "approved",
    }

    if (rating) {
      filter.rating = parseInt(rating)
    }

    if (verified !== null) {
      filter.isVerifiedPurchase = verified === "true"
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const reviews = await Review.find(filter)
      .populate("user", "profile.firstName profile.lastName")
      .populate("response.respondedBy", "profile.firstName profile.lastName role")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

    const total = await Review.countDocuments(filter)

    // Get review statistics
    const stats = await Review.aggregate([
      {
        $match: { product: productId, moderationStatus: "approved" },
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

    let reviewStats = { averageRating: 0, totalReviews: 0, distribution: {} }
    
    if (stats.length > 0) {
      const { averageRating, totalReviews, ratingDistribution } = stats[0]
      
      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      ratingDistribution.forEach(rating => {
        distribution[rating] = (distribution[rating] || 0) + 1
      })

      reviewStats = {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        distribution,
      }
    }

    res.json({
      status: "success",
      data: {
        reviews,
        stats: reviewStats,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  } catch (error) {
    console.error("Get product reviews error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get reviews",
    })
  }
})

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
router.post("/", authenticate, upload.array("images", 5), async (req, res) => {
  try {
    const {
      product: productId,
      order: orderId,
      rating,
      title,
      content,
      variant,
      detailedRatings,
      pros,
      cons,
      wouldRecommend,
    } = req.body

    // Validate required fields
    if (!productId || !orderId || !rating || !title || !content) {
      return res.status(400).json({
        status: "error",
        message: "Product, order, rating, title, and content are required",
      })
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: "error",
        message: "Rating must be between 1 and 5",
      })
    }

    // Check if user already reviewed this product for this order
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
      order: orderId,
    })

    if (existingReview) {
      return res.status(400).json({
        status: "error",
        message: "You have already reviewed this product for this order",
      })
    }

    // Upload images if provided
    const images = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadImage(file.buffer, "reviews")
          images.push({
            public_id: result.public_id,
            url: result.url,
            alt: `Review image for ${title}`,
          })
        } catch (uploadError) {
          console.error("Image upload error:", uploadError)
          // Continue without this image
        }
      }
    }

    // Create review
    const review = new Review({
      product: productId,
      user: req.user._id,
      order: orderId,
      rating: parseInt(rating),
      title: title.trim(),
      content: content.trim(),
      variant: variant ? {
        size: variant.size,
        color: variant.color,
        sku: variant.sku,
      } : undefined,
      detailedRatings: detailedRatings ? {
        comfort: detailedRatings.comfort ? parseInt(detailedRatings.comfort) : undefined,
        quality: detailedRatings.quality ? parseInt(detailedRatings.quality) : undefined,
        sizing: detailedRatings.sizing ? parseInt(detailedRatings.sizing) : undefined,
        style: detailedRatings.style ? parseInt(detailedRatings.style) : undefined,
        value: detailedRatings.value ? parseInt(detailedRatings.value) : undefined,
      } : undefined,
      pros: pros ? (Array.isArray(pros) ? pros : [pros]) : [],
      cons: cons ? (Array.isArray(cons) ? cons : [cons]) : [],
      wouldRecommend: wouldRecommend !== undefined ? wouldRecommend === "true" : true,
      images,
      moderationStatus: "pending", // Reviews need approval
    })

    await review.save()

    // Populate user info for response
    await review.populate("user", "profile.firstName profile.lastName")

    res.status(201).json({
      status: "success",
      message: "Review submitted successfully and is pending approval",
      data: { review },
    })
  } catch (error) {
    console.error("Create review error:", error)
    
    // Clean up uploaded images on error
    if (req.uploadedImages) {
      for (const image of req.uploadedImages) {
        try {
          await deleteImage(image.public_id)
        } catch (deleteError) {
          console.error("Error deleting image:", deleteError)
        }
      }
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create review",
    })
  }
})

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (Review owner only)
 */
router.put("/:id", authenticate, validateObjectId, upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params
    const {
      rating,
      title,
      content,
      detailedRatings,
      pros,
      cons,
      wouldRecommend,
      removeImages,
    } = req.body

    const review = await Review.findOne({
      _id: id,
      user: req.user._id,
    })

    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found or you don't have permission to edit it",
      })
    }

    // Only allow editing if review is pending or approved
    if (!["pending", "approved"].includes(review.moderationStatus)) {
      return res.status(400).json({
        status: "error",
        message: "Cannot edit this review",
      })
    }

    // Update fields
    if (rating) review.rating = parseInt(rating)
    if (title) review.title = title.trim()
    if (content) review.content = content.trim()
    if (wouldRecommend !== undefined) review.wouldRecommend = wouldRecommend === "true"

    if (detailedRatings) {
      review.detailedRatings = {
        comfort: detailedRatings.comfort ? parseInt(detailedRatings.comfort) : review.detailedRatings?.comfort,
        quality: detailedRatings.quality ? parseInt(detailedRatings.quality) : review.detailedRatings?.quality,
        sizing: detailedRatings.sizing ? parseInt(detailedRatings.sizing) : review.detailedRatings?.sizing,
        style: detailedRatings.style ? parseInt(detailedRatings.style) : review.detailedRatings?.style,
        value: detailedRatings.value ? parseInt(detailedRatings.value) : review.detailedRatings?.value,
      }
    }

    if (pros) review.pros = Array.isArray(pros) ? pros : [pros]
    if (cons) review.cons = Array.isArray(cons) ? cons : [cons]

    // Handle image removal
    if (removeImages && Array.isArray(removeImages)) {
      for (const imageId of removeImages) {
        const imageIndex = review.images.findIndex(img => img.public_id === imageId)
        if (imageIndex > -1) {
          try {
            await deleteImage(imageId)
            review.images.splice(imageIndex, 1)
          } catch (deleteError) {
            console.error("Error deleting image:", deleteError)
          }
        }
      }
    }

    // Add new images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadImage(file.buffer, "reviews")
          review.images.push({
            public_id: result.public_id,
            url: result.url,
            alt: `Review image for ${review.title}`,
          })
        } catch (uploadError) {
          console.error("Image upload error:", uploadError)
        }
      }
    }

    // Reset moderation status if review was approved (needs re-approval)
    if (review.moderationStatus === "approved") {
      review.moderationStatus = "pending"
    }

    await review.save()
    await review.populate("user", "profile.firstName profile.lastName")

    res.json({
      status: "success",
      message: "Review updated successfully",
      data: { review },
    })
  } catch (error) {
    console.error("Update review error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update review",
    })
  }
})

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Review owner only)
 */
router.delete("/:id", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const review = await Review.findOne({
      _id: id,
      user: req.user._id,
    })

    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found or you don't have permission to delete it",
      })
    }

    // Delete associated images
    for (const image of review.images) {
      try {
        await deleteImage(image.public_id)
      } catch (deleteError) {
        console.error("Error deleting image:", deleteError)
      }
    }

    await review.remove()

    res.json({
      status: "success",
      message: "Review deleted successfully",
    })
  } catch (error) {
    console.error("Delete review error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to delete review",
    })
  }
})

/**
 * @desc    Add helpful vote to review
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
router.post("/:id/helpful", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { helpful } = req.body // true for helpful, false for not helpful

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      })
    }

    // Check if user already voted
    const existingVote = review.helpfulVotes.find(
      vote => vote.user.toString() === req.user._id.toString()
    )

    if (existingVote) {
      // Update existing vote
      existingVote.helpful = helpful === true
    } else {
      // Add new vote
      review.helpfulVotes.push({
        user: req.user._id,
        helpful: helpful === true,
      })
    }

    await review.save()

    res.json({
      status: "success",
      message: "Vote recorded successfully",
      data: {
        helpfulCount: review.helpfulVotes.filter(v => v.helpful).length,
        notHelpfulCount: review.helpfulVotes.filter(v => !v.helpful).length,
      },
    })
  } catch (error) {
    console.error("Add helpful vote error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to record vote",
    })
  }
})

/**
 * @desc    Flag/Report a review
 * @route   POST /api/reviews/:id/flag
 * @access  Private
 */
router.post("/:id/flag", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { reason, details } = req.body

    if (!reason) {
      return res.status(400).json({
        status: "error",
        message: "Reason for flagging is required",
      })
    }

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      })
    }

    // Check if user already flagged this review
    const existingFlag = review.flags.find(
      flag => flag.flaggedBy.toString() === req.user._id.toString()
    )

    if (existingFlag) {
      return res.status(400).json({
        status: "error",
        message: "You have already flagged this review",
      })
    }

    // Add flag
    review.flags.push({
      flaggedBy: req.user._id,
      reason,
      details: details || "",
    })

    await review.save()

    res.json({
      status: "success",
      message: "Review flagged successfully. Our team will review it.",
    })
  } catch (error) {
    console.error("Flag review error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to flag review",
    })
  }
})

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
router.get("/my-reviews", authenticate, validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    const filter = { user: req.user._id }

    if (status) {
      filter.moderationStatus = status
    }

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const reviews = await Review.find(filter)
      .populate("product", "name brand images")
      .populate("order", "orderNumber")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

    const total = await Review.countDocuments(filter)

    res.json({
      status: "success",
      data: {
        reviews,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  } catch (error) {
    console.error("Get user reviews error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get reviews",
    })
  }
})

/**
 * @desc    Moderate review (Admin/Staff only)
 * @route   PUT /api/reviews/:id/moderate
 * @access  Private (Admin/Staff)
 */
router.put("/:id/moderate", authenticate, requireRole(["admin", "staff"]), validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { status, response } = req.body

    if (!["approved", "rejected", "flagged"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid moderation status",
      })
    }

    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({
        status: "error",
        message: "Review not found",
      })
    }

    review.moderationStatus = status
    review.moderatedAt = new Date()
    review.moderatedBy = req.user._id

    if (response) {
      review.response = {
        content: response.trim(),
        respondedBy: req.user._id,
        respondedAt: new Date(),
      }
    }

    await review.save()
    await review.populate("user", "profile.firstName profile.lastName")
    await review.populate("moderatedBy", "profile.firstName profile.lastName role")

    res.json({
      status: "success",
      message: `Review ${status} successfully`,
      data: { review },
    })
  } catch (error) {
    console.error("Moderate review error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to moderate review",
    })
  }
})

/**
 * @desc    Get reviews for moderation (Admin/Staff only)
 * @route   GET /api/reviews/moderation
 * @access  Private (Admin/Staff)
 */
router.get("/moderation", authenticate, requireRole(["admin", "staff"]), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "pending",
      sortBy = "createdAt",
      sortOrder = "asc",
    } = req.query

    const filter = {}

    if (status === "flagged") {
      filter.$or = [
        { moderationStatus: "flagged" },
        { "flags.0": { $exists: true } }, // Has at least one flag
      ]
    } else {
      filter.moderationStatus = status
    }

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const reviews = await Review.find(filter)
      .populate("user", "profile.firstName profile.lastName email")
      .populate("product", "name brand")
      .populate("moderatedBy", "profile.firstName profile.lastName role")
      .populate("flags.flaggedBy", "profile.firstName profile.lastName")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

    const total = await Review.countDocuments(filter)

    // Get moderation statistics
    const stats = await Review.aggregate([
      {
        $group: {
          _id: "$moderationStatus",
          count: { $sum: 1 },
        },
      },
    ])

    const moderationStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count
      return acc
    }, {})

    res.json({
      status: "success",
      data: {
        reviews,
        stats: moderationStats,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  } catch (error) {
    console.error("Get reviews for moderation error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get reviews for moderation",
    })
  }
})

module.exports = router
