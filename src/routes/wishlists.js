/**
 * Wishlist Routes
 * 
 * Handles all wishlist-related operations including:
 * - Creating and managing wishlists
 * - Adding/removing items from wishlists
 * - Sharing wishlists
 * - Public wishlist discovery
 * - Wishlist analytics and insights
 */

const express = require("express")
const Wishlist = require("../models/Wishlist")
const Product = require("../models/Product")
const { authenticate, optionalAuth } = require("../middleware/auth")
const { validatePagination, validateObjectId } = require("../middleware/validation")
const { getPaginationInfo } = require("../utils/helpers")
const { sendBackInStockNotification, sendPriceDropNotification } = require("../services/notificationService")

const router = express.Router()

/**
 * @desc    Get user's wishlists
 * @route   GET /api/wishlists
 * @access  Private
 */
router.get("/", authenticate, validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      sortBy = "lastActivityAt",
      sortOrder = "desc",
    } = req.query

    const filter = { user: req.user._id, isActive: true }
    
    if (category && category !== "all") {
      filter.category = category
    }

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const wishlists = await Wishlist.find(filter)
      .populate("items.product", "name brand images priceRange")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

    const total = await Wishlist.countDocuments(filter)

    // Add computed fields
    const enrichedWishlists = wishlists.map(wishlist => ({
      ...wishlist,
      totalItems: wishlist.items.length,
      totalValue: wishlist.items.reduce((sum, item) => sum + item.priceWhenAdded, 0),
    }))

    res.json({
      status: "success",
      data: {
        wishlists: enrichedWishlists,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  } catch (error) {
    console.error("Get wishlists error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get wishlists",
    })
  }
})

/**
 * @desc    Create a new wishlist
 * @route   POST /api/wishlists
 * @access  Private
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      category = "general",
      isPublic = false,
      eventDate,
    } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Wishlist name is required",
      })
    }

    // Check if user already has a wishlist with this name
    const existingWishlist = await Wishlist.findOne({
      user: req.user._id,
      name: name.trim(),
      isActive: true,
    })

    if (existingWishlist) {
      return res.status(400).json({
        status: "error",
        message: "You already have a wishlist with this name",
      })
    }

    const wishlist = new Wishlist({
      user: req.user._id,
      name: name.trim(),
      description: description?.trim(),
      category,
      isPublic,
      eventDate: eventDate ? new Date(eventDate) : undefined,
    })

    await wishlist.save()

    res.status(201).json({
      status: "success",
      message: "Wishlist created successfully",
      data: { wishlist },
    })
  } catch (error) {
    console.error("Create wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to create wishlist",
    })
  }
})

/**
 * @desc    Get a specific wishlist
 * @route   GET /api/wishlists/:id
 * @access  Private (owner) or Public (if shared/public)
 */
router.get("/:id", validateObjectId, optionalAuth, async (req, res) => {
  try {
    const { id } = req.params

    let wishlist = await Wishlist.findById(id)
      .populate("user", "profile.firstName profile.lastName")
      .populate("items.product", "name brand images variants priceRange ratings")

    if (!wishlist || !wishlist.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found",
      })
    }

    // Check access permissions
    const isOwner = req.user && wishlist.user._id.toString() === req.user._id.toString()
    const isSharedWith = req.user && wishlist.sharing.sharedWith.some(
      share => share.email === req.user.email
    )

    if (!isOwner && !wishlist.isPublic && !isSharedWith) {
      return res.status(403).json({
        status: "error",
        message: "You don't have permission to view this wishlist",
      })
    }

    // Increment view count if not owner
    if (!isOwner) {
      wishlist.viewCount += 1
      await wishlist.save()
    }

    // Get sorted items
    const sortedItems = wishlist.getSortedItems()

    // Check for price drops and stock availability
    const enrichedItems = await Promise.all(
      sortedItems.map(async (item) => {
        const product = item.product
        const currentPrice = product.priceRange.min
        const priceDrop = item.priceWhenAdded > currentPrice
        const priceDropPercentage = priceDrop 
          ? Math.round(((item.priceWhenAdded - currentPrice) / item.priceWhenAdded) * 100)
          : 0

        // Check stock availability for preferred variant
        let inStock = true
        let availableStock = 0
        
        if (item.preferredVariant && item.preferredVariant.size && item.preferredVariant.color) {
          const variant = product.variants.find(v => 
            v.size === item.preferredVariant.size && 
            v.color === item.preferredVariant.color
          )
          inStock = variant ? variant.stock > 0 : false
          availableStock = variant ? variant.stock : 0
        } else {
          availableStock = product.totalStock
          inStock = availableStock > 0
        }

        return {
          ...item.toObject(),
          currentPrice,
          priceDrop,
          priceDropPercentage,
          inStock,
          availableStock,
        }
      })
    )

    const wishlistData = {
      ...wishlist.toObject(),
      items: enrichedItems,
      totalItems: enrichedItems.length,
      totalValue: enrichedItems.reduce((sum, item) => sum + item.priceWhenAdded, 0),
      currentValue: enrichedItems.reduce((sum, item) => sum + item.currentPrice, 0),
      isOwner,
      canEdit: isOwner || (isSharedWith && wishlist.sharing.sharedWith.find(s => s.email === req.user?.email)?.canEdit),
    }

    res.json({
      status: "success",
      data: { wishlist: wishlistData },
    })
  } catch (error) {
    console.error("Get wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get wishlist",
    })
  }
})

/**
 * @desc    Update a wishlist
 * @route   PUT /api/wishlists/:id
 * @access  Private (owner only)
 */
router.put("/:id", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      category,
      isPublic,
      eventDate,
      displaySettings,
    } = req.body

    const wishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found or you don't have permission to edit it",
      })
    }

    // Update fields
    if (name) wishlist.name = name.trim()
    if (description !== undefined) wishlist.description = description?.trim()
    if (category) wishlist.category = category
    if (isPublic !== undefined) wishlist.isPublic = isPublic
    if (eventDate) wishlist.eventDate = new Date(eventDate)
    
    if (displaySettings) {
      wishlist.displaySettings = {
        ...wishlist.displaySettings,
        ...displaySettings,
      }
    }

    await wishlist.save()

    res.json({
      status: "success",
      message: "Wishlist updated successfully",
      data: { wishlist },
    })
  } catch (error) {
    console.error("Update wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update wishlist",
    })
  }
})

/**
 * @desc    Delete a wishlist
 * @route   DELETE /api/wishlists/:id
 * @access  Private (owner only)
 */
router.delete("/:id", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const wishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found or you don't have permission to delete it",
      })
    }

    // Soft delete
    wishlist.isActive = false
    await wishlist.save()

    res.json({
      status: "success",
      message: "Wishlist deleted successfully",
    })
  } catch (error) {
    console.error("Delete wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to delete wishlist",
    })
  }
})

/**
 * @desc    Add item to wishlist
 * @route   POST /api/wishlists/:id/items
 * @access  Private
 */
router.post("/:id/items", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const {
      productId,
      preferredVariant,
      priority = 1,
      notes,
      notifications,
    } = req.body

    if (!productId) {
      return res.status(400).json({
        status: "error",
        message: "Product ID is required",
      })
    }

    const wishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found or you don't have permission to edit it",
      })
    }

    const product = await Product.findById(productId)
    if (!product || !product.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Product not found or not available",
      })
    }

    // Get current price
    const currentPrice = preferredVariant?.price || product.priceRange.min

    await wishlist.addItem(productId, preferredVariant, currentPrice, {
      priority,
      notes,
      notifications,
    })

    await wishlist.populate("items.product", "name brand images")

    res.json({
      status: "success",
      message: "Item added to wishlist successfully",
      data: { wishlist },
    })
  } catch (error) {
    console.error("Add item to wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to add item to wishlist",
    })
  }
})

/**
 * @desc    Remove item from wishlist
 * @route   DELETE /api/wishlists/:id/items/:productId
 * @access  Private
 */
router.delete("/:id/items/:productId", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id, productId } = req.params
    const { size, color } = req.query

    const wishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found or you don't have permission to edit it",
      })
    }

    const preferredVariant = size && color ? { size, color } : null
    await wishlist.removeItem(productId, preferredVariant)

    res.json({
      status: "success",
      message: "Item removed from wishlist successfully",
    })
  } catch (error) {
    console.error("Remove item from wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to remove item from wishlist",
    })
  }
})

/**
 * @desc    Update wishlist item
 * @route   PUT /api/wishlists/:id/items/:productId
 * @access  Private
 */
router.put("/:id/items/:productId", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id, productId } = req.params
    const { size, color, priority, notes, notifications } = req.body

    const wishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found or you don't have permission to edit it",
      })
    }

    const preferredVariant = size && color ? { size, color } : null
    const updates = {}

    if (priority !== undefined) updates.priority = priority
    if (notes !== undefined) updates.notes = notes
    if (notifications !== undefined) updates.notifications = { ...updates.notifications, ...notifications }

    await wishlist.updateItem(productId, updates, preferredVariant)

    res.json({
      status: "success",
      message: "Wishlist item updated successfully",
    })
  } catch (error) {
    console.error("Update wishlist item error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update wishlist item",
    })
  }
})

/**
 * @desc    Share wishlist
 * @route   POST /api/wishlists/:id/share
 * @access  Private
 */
router.post("/:id/share", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { email, canEdit = false } = req.body

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      })
    }

    const wishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Wishlist not found or you don't have permission to share it",
      })
    }

    await wishlist.shareWith(email, canEdit)

    res.json({
      status: "success",
      message: "Wishlist shared successfully",
      data: {
        shareToken: wishlist.sharing.shareToken,
        shareUrl: `${process.env.CLIENT_URL}/wishlists/shared/${wishlist.sharing.shareToken}`,
      },
    })
  } catch (error) {
    console.error("Share wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to share wishlist",
    })
  }
})

/**
 * @desc    Get shared wishlist by token
 * @route   GET /api/wishlists/shared/:token
 * @access  Public
 */
router.get("/shared/:token", async (req, res) => {
  try {
    const { token } = req.params

    const wishlist = await Wishlist.findByShareToken(token)

    if (!wishlist) {
      return res.status(404).json({
        status: "error",
        message: "Shared wishlist not found or no longer available",
      })
    }

    // Increment view count
    wishlist.viewCount += 1
    await wishlist.save()

    // Get sorted items with current pricing
    const sortedItems = wishlist.getSortedItems()
    const enrichedItems = await Promise.all(
      sortedItems.map(async (item) => {
        const product = item.product
        const currentPrice = product.priceRange.min
        const priceDrop = item.priceWhenAdded > currentPrice

        return {
          ...item.toObject(),
          currentPrice,
          priceDrop,
          priceDropPercentage: priceDrop
            ? Math.round(((item.priceWhenAdded - currentPrice) / item.priceWhenAdded) * 100)
            : 0,
        }
      })
    )

    const wishlistData = {
      ...wishlist.toObject(),
      items: enrichedItems,
      totalItems: enrichedItems.length,
      totalValue: enrichedItems.reduce((sum, item) => sum + item.priceWhenAdded, 0),
      currentValue: enrichedItems.reduce((sum, item) => sum + item.currentPrice, 0),
    }

    res.json({
      status: "success",
      data: { wishlist: wishlistData },
    })
  } catch (error) {
    console.error("Get shared wishlist error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get shared wishlist",
    })
  }
})

/**
 * @desc    Get public wishlists
 * @route   GET /api/wishlists/public
 * @access  Public
 */
router.get("/public", validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      sortBy = "viewCount",
    } = req.query

    const wishlists = await Wishlist.findPublicWishlists(limit, (page - 1) * limit)

    const total = await Wishlist.countDocuments({
      isPublic: true,
      isActive: true,
      ...(category && category !== "all" ? { category } : {}),
    })

    res.json({
      status: "success",
      data: {
        wishlists,
        pagination: getPaginationInfo(page, limit, total),
      },
    })
  } catch (error) {
    console.error("Get public wishlists error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get public wishlists",
    })
  }
})

/**
 * @desc    Move item between wishlists
 * @route   POST /api/wishlists/:id/items/:productId/move
 * @access  Private
 */
router.post("/:id/items/:productId/move", authenticate, validateObjectId, async (req, res) => {
  try {
    const { id, productId } = req.params
    const { targetWishlistId, size, color } = req.body

    if (!targetWishlistId) {
      return res.status(400).json({
        status: "error",
        message: "Target wishlist ID is required",
      })
    }

    const sourceWishlist = await Wishlist.findOne({
      _id: id,
      user: req.user._id,
      isActive: true,
    })

    if (!sourceWishlist) {
      return res.status(404).json({
        status: "error",
        message: "Source wishlist not found or you don't have permission to edit it",
      })
    }

    const preferredVariant = size && color ? { size, color } : null
    const result = await sourceWishlist.moveItemTo(productId, targetWishlistId, preferredVariant)

    res.json({
      status: "success",
      message: "Item moved successfully",
      data: {
        sourceWishlist: result.source,
        targetWishlist: result.target,
      },
    })
  } catch (error) {
    console.error("Move wishlist item error:", error)
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to move item",
    })
  }
})

module.exports = router
