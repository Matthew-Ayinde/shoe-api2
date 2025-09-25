const express = require("express")
const Cart = require("../models/Cart")
const Product = require("../models/Product")
const { authenticate } = require("../middleware/auth")
const { validateObjectId } = require("../middleware/validation")

const router = express.Router()

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
router.get("/", authenticate, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "items.product",
      select: "name brand images slug isActive variants",
    })

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] })
      await cart.save()
    }

    // Filter out inactive products and validate variants
    const validItems = []
    let cartUpdated = false

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        cartUpdated = true
        continue
      }

      // Check if variant still exists and is active
      const variant = item.product.getVariant(item.variant.size, item.variant.color)
      if (!variant || !variant.isActive) {
        cartUpdated = true
        continue
      }

      // Update price if it has changed
      if (item.variant.price !== variant.price) {
        item.variant.price = variant.price
        cartUpdated = true
      }

      // Adjust quantity if stock is insufficient
      if (item.quantity > variant.stock) {
        item.quantity = variant.stock
        cartUpdated = true
      }

      if (item.quantity > 0) {
        validItems.push(item)
      }
    }

    if (cartUpdated) {
      cart.items = validItems
      await cart.save()
    }

    res.json({
      status: "success",
      data: {
        cart,
      },
    })
  } catch (error) {
    console.error("Get cart error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch cart",
    })
  }
})

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
router.post("/items", authenticate, async (req, res) => {
  try {
    const { productId, size, color, quantity = 1 } = req.body

    if (!productId || !size || !color) {
      return res.status(400).json({
        status: "error",
        message: "Product ID, size, and color are required",
      })
    }

    if (quantity < 1) {
      return res.status(400).json({
        status: "error",
        message: "Quantity must be at least 1",
      })
    }

    // Find product and validate variant
    const product = await Product.findById(productId)

    if (!product || !product.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    const variant = product.getVariant(size, color)

    if (!variant || !variant.isActive) {
      return res.status(400).json({
        status: "error",
        message: "Selected variant is not available",
      })
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        status: "error",
        message: `Only ${variant.stock} items available in stock`,
      })
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] })
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId.toString() && item.variant.size === size && item.variant.color === color,
    )

    if (existingItemIndex > -1) {
      // Update existing item
      const newQuantity = cart.items[existingItemIndex].quantity + quantity

      if (newQuantity > variant.stock) {
        return res.status(400).json({
          status: "error",
          message: `Cannot add ${quantity} more items. Only ${variant.stock - cart.items[existingItemIndex].quantity} more available`,
        })
      }

      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].variant.price = variant.price // Update price
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        variant: {
          size,
          color,
          sku: variant.sku,
          price: variant.price,
        },
        quantity,
      })
    }

    await cart.save()

    // Populate cart for response
    await cart.populate({
      path: "items.product",
      select: "name brand images slug",
    })

    res.status(201).json({
      status: "success",
      message: "Item added to cart successfully",
      data: {
        cart,
      },
    })
  } catch (error) {
    console.error("Add to cart error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to add item to cart",
    })
  }
})

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
router.put("/items/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params
    const { quantity } = req.body

    if (quantity < 0) {
      return res.status(400).json({
        status: "error",
        message: "Quantity cannot be negative",
      })
    }

    const cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      })
    }

    const item = cart.items.id(itemId)

    if (!item) {
      return res.status(404).json({
        status: "error",
        message: "Item not found in cart",
      })
    }

    if (quantity === 0) {
      // Remove item from cart
      cart.items.pull(itemId)
    } else {
      // Validate stock availability
      const product = await Product.findById(item.product)
      const variant = product.getVariant(item.variant.size, item.variant.color)

      if (!variant || variant.stock < quantity) {
        return res.status(400).json({
          status: "error",
          message: `Only ${variant ? variant.stock : 0} items available in stock`,
        })
      }

      item.quantity = quantity
      item.variant.price = variant.price // Update price
    }

    await cart.save()

    // Populate cart for response
    await cart.populate({
      path: "items.product",
      select: "name brand images slug",
    })

    res.json({
      status: "success",
      message: "Cart updated successfully",
      data: {
        cart,
      },
    })
  } catch (error) {
    console.error("Update cart error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update cart",
    })
  }
})

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
router.delete("/items/:itemId", authenticate, async (req, res) => {
  try {
    const { itemId } = req.params

    const cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      })
    }

    const item = cart.items.id(itemId)

    if (!item) {
      return res.status(404).json({
        status: "error",
        message: "Item not found in cart",
      })
    }

    cart.items.pull(itemId)
    await cart.save()

    // Populate cart for response
    await cart.populate({
      path: "items.product",
      select: "name brand images slug",
    })

    res.json({
      status: "success",
      message: "Item removed from cart successfully",
      data: {
        cart,
      },
    })
  } catch (error) {
    console.error("Remove from cart error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to remove item from cart",
    })
  }
})

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private
router.delete("/", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      return res.status(404).json({
        status: "error",
        message: "Cart not found",
      })
    }

    cart.items = []
    await cart.save()

    res.json({
      status: "success",
      message: "Cart cleared successfully",
      data: {
        cart,
      },
    })
  } catch (error) {
    console.error("Clear cart error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to clear cart",
    })
  }
})

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
router.get("/summary", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      return res.json({
        status: "success",
        data: {
          totalItems: 0,
          totalAmount: 0,
          itemCount: 0,
        },
      })
    }

    res.json({
      status: "success",
      data: {
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        itemCount: cart.items.length,
      },
    })
  } catch (error) {
    console.error("Get cart summary error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch cart summary",
    })
  }
})

// @desc    Validate cart before checkout
// @route   POST /api/cart/validate
// @access  Private
router.post("/validate", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate({
      path: "items.product",
      select: "name brand variants isActive",
    })

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Cart is empty",
      })
    }

    const issues = []
    const validItems = []

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        issues.push({
          itemId: item._id,
          issue: "Product is no longer available",
          action: "remove",
        })
        continue
      }

      const variant = item.product.getVariant(item.variant.size, item.variant.color)

      if (!variant || !variant.isActive) {
        issues.push({
          itemId: item._id,
          issue: "Selected variant is no longer available",
          action: "remove",
        })
        continue
      }

      if (variant.stock < item.quantity) {
        issues.push({
          itemId: item._id,
          issue: `Only ${variant.stock} items available, but ${item.quantity} requested`,
          action: "reduce_quantity",
          maxQuantity: variant.stock,
        })

        if (variant.stock > 0) {
          item.quantity = variant.stock
          validItems.push(item)
        }
      } else {
        // Check for price changes
        if (item.variant.price !== variant.price) {
          issues.push({
            itemId: item._id,
            issue: `Price changed from $${item.variant.price} to $${variant.price}`,
            action: "price_update",
            oldPrice: item.variant.price,
            newPrice: variant.price,
          })
          item.variant.price = variant.price
        }
        validItems.push(item)
      }
    }

    // Update cart if there were changes
    if (issues.length > 0) {
      cart.items = validItems
      await cart.save()
    }

    res.json({
      status: issues.length > 0 ? "warning" : "success",
      message: issues.length > 0 ? "Cart validation found issues" : "Cart is valid",
      data: {
        cart,
        issues,
        isValid: issues.length === 0,
      },
    })
  } catch (error) {
    console.error("Validate cart error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to validate cart",
    })
  }
})

module.exports = router
