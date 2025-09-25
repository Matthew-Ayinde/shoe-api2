const express = require("express")
const Coupon = require("../models/Coupon")
const Product = require("../models/Product")
const { authenticate } = require("../middleware/auth")
const { isStaffOrAdmin, isAdmin } = require("../middleware/roles")
const { validateCoupon, validatePagination, validateObjectId } = require("../middleware/validation")
const { getPaginationInfo } = require("../utils/helpers")

const router = express.Router()

// @desc    Validate coupon code
// @route   POST /api/coupons/validate
// @access  Private
router.post("/validate", authenticate, async (req, res) => {
  try {
    const { code, cartItems, userId } = req.body

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Coupon code is required",
      })
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).populate("applicableProducts excludedProducts")

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Invalid coupon code",
      })
    }

    // Check if coupon is currently valid
    if (!coupon.isCurrentlyValid) {
      let message = "Coupon is not valid"
      const now = new Date()

      if (now < coupon.validFrom) {
        message = `Coupon is not yet active. Valid from ${coupon.validFrom.toLocaleDateString()}`
      } else if (now > coupon.validTo) {
        message = "Coupon has expired"
      } else if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        message = "Coupon usage limit reached"
      }

      return res.status(400).json({
        status: "error",
        message,
      })
    }

    // Check user usage limit
    if (userId && coupon.userUsageLimit) {
      const Order = require("../models/Order")
      const userUsageCount = await Order.countDocuments({
        user: userId,
        "discounts.couponCode": coupon.code,
        status: { $nin: ["cancelled"] },
      })

      if (userUsageCount >= coupon.userUsageLimit) {
        return res.status(400).json({
          status: "error",
          message: "You have reached the usage limit for this coupon",
        })
      }
    }

    // Validate cart items if provided
    const applicableItems = []
    let totalApplicableAmount = 0

    if (cartItems && cartItems.length > 0) {
      const productIds = cartItems.map((item) => item.productId)
      const products = await Product.find({ _id: { $in: productIds } })

      for (const item of cartItems) {
        const product = products.find((p) => p._id.toString() === item.productId.toString())

        if (product && coupon.isApplicableToProducts([product])) {
          applicableItems.push({
            ...item,
            product,
          })
          totalApplicableAmount += item.price * item.quantity
        }
      }

      if (applicableItems.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Coupon is not applicable to any items in your cart",
        })
      }

      if (totalApplicableAmount < coupon.minOrderAmount) {
        return res.status(400).json({
          status: "error",
          message: `Minimum order amount of $${coupon.minOrderAmount} required for this coupon`,
        })
      }
    }

    // Calculate discount
    const discountAmount = coupon.calculateDiscount(totalApplicableAmount || 0)

    res.json({
      status: "success",
      message: "Coupon is valid",
      data: {
        coupon: {
          code: coupon.code,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscount: coupon.maxDiscount,
        },
        discountAmount,
        applicableItems,
        totalApplicableAmount,
      },
    })
  } catch (error) {
    console.error("Validate coupon error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to validate coupon",
    })
  }
})

// @desc    Get all coupons (Admin/Staff)
// @route   GET /api/coupons
// @access  Private (Staff/Admin)
router.get("/", authenticate, isStaffOrAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query

    const filter = {}

    if (status === "active") {
      filter.isActive = true
      filter.validFrom = { $lte: new Date() }
      filter.validTo = { $gte: new Date() }
    } else if (status === "inactive") {
      filter.isActive = false
    } else if (status === "expired") {
      filter.validTo = { $lt: new Date() }
    }

    if (search) {
      filter.$or = [{ code: new RegExp(search, "i") }, { description: new RegExp(search, "i") }]
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("createdBy", "profile.firstName profile.lastName")
      .populate("applicableProducts", "name brand")
      .select("-__v")

    const total = await Coupon.countDocuments(filter)
    const pagination = getPaginationInfo(Number.parseInt(page), Number.parseInt(limit), total)

    res.json({
      status: "success",
      data: {
        coupons,
        pagination,
      },
    })
  } catch (error) {
    console.error("Get coupons error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch coupons",
    })
  }
})

// @desc    Get single coupon
// @route   GET /api/coupons/:id
// @access  Private (Staff/Admin)
router.get("/:id", authenticate, isStaffOrAdmin, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const coupon = await Coupon.findById(id)
      .populate("createdBy", "profile.firstName profile.lastName")
      .populate("applicableProducts", "name brand images")
      .populate("excludedProducts", "name brand images")

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      })
    }

    res.json({
      status: "success",
      data: {
        coupon,
      },
    })
  } catch (error) {
    console.error("Get coupon error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch coupon",
    })
  }
})

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private (Admin)
router.post("/", authenticate, isAdmin, validateCoupon, async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      userUsageLimit,
      validFrom,
      validTo,
      applicableProducts,
      applicableCategories,
      applicableBrands,
      excludedProducts,
    } = req.body

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() })
    if (existingCoupon) {
      return res.status(400).json({
        status: "error",
        message: "Coupon code already exists",
      })
    }

    // Validate dates
    if (new Date(validFrom) >= new Date(validTo)) {
      return res.status(400).json({
        status: "error",
        message: "Valid from date must be before valid to date",
      })
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      type,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount,
      usageLimit,
      userUsageLimit: userUsageLimit || 1,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      applicableBrands: applicableBrands || [],
      excludedProducts: excludedProducts || [],
      createdBy: req.user._id,
    })

    await coupon.save()

    await coupon.populate("createdBy", "profile.firstName profile.lastName")

    res.status(201).json({
      status: "success",
      message: "Coupon created successfully",
      data: {
        coupon,
      },
    })
  } catch (error) {
    console.error("Create coupon error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to create coupon",
    })
  }
})

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (Admin)
router.put("/:id", authenticate, isAdmin, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    const coupon = await Coupon.findById(id)

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      })
    }

    // Don't allow updating code if coupon has been used
    if (updateData.code && coupon.usedCount > 0) {
      return res.status(400).json({
        status: "error",
        message: "Cannot change coupon code after it has been used",
      })
    }

    // Validate dates if provided
    const validFrom = updateData.validFrom ? new Date(updateData.validFrom) : coupon.validFrom
    const validTo = updateData.validTo ? new Date(updateData.validTo) : coupon.validTo

    if (validFrom >= validTo) {
      return res.status(400).json({
        status: "error",
        message: "Valid from date must be before valid to date",
      })
    }

    // Update coupon
    Object.assign(coupon, updateData)
    if (updateData.code) {
      coupon.code = updateData.code.toUpperCase()
    }

    await coupon.save()

    await coupon.populate("createdBy", "profile.firstName profile.lastName")

    res.json({
      status: "success",
      message: "Coupon updated successfully",
      data: {
        coupon,
      },
    })
  } catch (error) {
    console.error("Update coupon error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update coupon",
    })
  }
})

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
router.delete("/:id", authenticate, isAdmin, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const coupon = await Coupon.findById(id)

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      })
    }

    // Check if coupon has been used
    if (coupon.usedCount > 0) {
      // Soft delete by deactivating
      coupon.isActive = false
      await coupon.save()

      return res.json({
        status: "success",
        message: "Coupon deactivated successfully (cannot delete used coupons)",
      })
    }

    await Coupon.findByIdAndDelete(id)

    res.json({
      status: "success",
      message: "Coupon deleted successfully",
    })
  } catch (error) {
    console.error("Delete coupon error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to delete coupon",
    })
  }
})

// @desc    Get coupon usage statistics
// @route   GET /api/coupons/:id/stats
// @access  Private (Admin)
router.get("/:id/stats", authenticate, isAdmin, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const coupon = await Coupon.findById(id)

    if (!coupon) {
      return res.status(404).json({
        status: "error",
        message: "Coupon not found",
      })
    }

    const Order = require("../models/Order")

    // Get usage statistics
    const usageStats = await Order.aggregate([
      {
        $match: {
          "discounts.couponCode": coupon.code,
          status: { $nin: ["cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          totalUses: { $sum: 1 },
          totalDiscount: { $sum: "$discounts.couponDiscount" },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
    ])

    // Get daily usage
    const dailyUsage = await Order.aggregate([
      {
        $match: {
          "discounts.couponCode": coupon.code,
          status: { $nin: ["cancelled"] },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          uses: { $sum: 1 },
          discount: { $sum: "$discounts.couponDiscount" },
          revenue: { $sum: "$totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    const stats = usageStats[0] || {
      totalUses: 0,
      totalDiscount: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    }

    res.json({
      status: "success",
      data: {
        coupon: {
          code: coupon.code,
          description: coupon.description,
          usedCount: coupon.usedCount,
          usageLimit: coupon.usageLimit,
        },
        stats,
        dailyUsage,
      },
    })
  } catch (error) {
    console.error("Get coupon stats error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch coupon statistics",
    })
  }
})

module.exports = router
