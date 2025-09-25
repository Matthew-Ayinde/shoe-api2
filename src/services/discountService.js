const Coupon = require("../models/Coupon")
const FlashSale = require("../models/FlashSale")
const Product = require("../models/Product")

// Apply discounts to order
const applyDiscounts = async (orderData, userId = null) => {
  try {
    const { items, couponCode } = orderData
    let totalDiscount = 0
    const appliedDiscounts = {
      couponCode: null,
      couponDiscount: 0,
      flashSaleId: null,
      flashSaleDiscount: 0,
    }

    // Get product details for items
    const productIds = items.map((item) => item.product)
    const products = await Product.find({ _id: { $in: productIds } })

    // Apply flash sale discounts first
    const flashSaleResult = await applyFlashSaleDiscounts(items, products)
    if (flashSaleResult.success) {
      appliedDiscounts.flashSaleId = flashSaleResult.flashSaleId
      appliedDiscounts.flashSaleDiscount = flashSaleResult.discount
      totalDiscount += flashSaleResult.discount
    }

    // Apply coupon discount
    if (couponCode) {
      const couponResult = await applyCouponDiscount(couponCode, items, products, userId)
      if (couponResult.success) {
        appliedDiscounts.couponCode = couponCode
        appliedDiscounts.couponDiscount = couponResult.discount
        totalDiscount += couponResult.discount
      } else {
        return {
          success: false,
          error: couponResult.error,
        }
      }
    }

    return {
      success: true,
      totalDiscount,
      appliedDiscounts,
      updatedItems: flashSaleResult.updatedItems || items,
    }
  } catch (error) {
    console.error("Apply discounts error:", error)
    return {
      success: false,
      error: "Failed to apply discounts",
    }
  }
}

// Apply flash sale discounts
const applyFlashSaleDiscounts = async (items, products) => {
  try {
    const now = new Date()

    // Get active flash sales
    const activeFlashSales = await FlashSale.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    }).sort({ priority: -1 })

    if (activeFlashSales.length === 0) {
      return { success: false }
    }

    let bestDiscount = 0
    let bestFlashSale = null
    let updatedItems = [...items]

    // Find the best flash sale discount
    for (const flashSale of activeFlashSales) {
      let saleDiscount = 0
      const saleUpdatedItems = [...items]

      for (let i = 0; i < saleUpdatedItems.length; i++) {
        const item = saleUpdatedItems[i]
        const product = products.find((p) => p._id.toString() === item.product.toString())

        if (!product) continue

        const productSale = flashSale.getProductSale(product._id, item.variant?.size, item.variant?.color)

        if (productSale && productSale.availableQuantity >= item.quantity) {
          const originalPrice = item.price || item.variant?.price || product.priceRange.min
          const discount = (originalPrice - productSale.salePrice) * item.quantity

          if (discount > 0) {
            saleDiscount += discount
            saleUpdatedItems[i] = {
              ...item,
              originalPrice,
              salePrice: productSale.salePrice,
              flashSaleDiscount: discount,
            }
          }
        }
      }

      if (saleDiscount > bestDiscount) {
        bestDiscount = saleDiscount
        bestFlashSale = flashSale
        updatedItems = saleUpdatedItems
      }
    }

    if (bestDiscount > 0) {
      return {
        success: true,
        discount: bestDiscount,
        flashSaleId: bestFlashSale._id,
        updatedItems,
      }
    }

    return { success: false }
  } catch (error) {
    console.error("Apply flash sale discounts error:", error)
    return { success: false, error: error.message }
  }
}

// Apply coupon discount
const applyCouponDiscount = async (couponCode, items, products, userId = null) => {
  try {
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
    })

    if (!coupon) {
      return { success: false, error: "Invalid coupon code" }
    }

    // Check if coupon is currently valid
    if (!coupon.isCurrentlyValid) {
      return { success: false, error: "Coupon is not valid or has expired" }
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
        return { success: false, error: "You have reached the usage limit for this coupon" }
      }
    }

    // Check if coupon is applicable to products
    if (!coupon.isApplicableToProducts(products)) {
      return { success: false, error: "Coupon is not applicable to any items in your order" }
    }

    // Calculate applicable amount
    let applicableAmount = 0
    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.product.toString())
      if (product && coupon.isApplicableToProducts([product])) {
        applicableAmount += (item.price || item.variant?.price || product.priceRange.min) * item.quantity
      }
    }

    if (applicableAmount < coupon.minOrderAmount) {
      return {
        success: false,
        error: `Minimum order amount of $${coupon.minOrderAmount} required for this coupon`,
      }
    }

    const discount = coupon.calculateDiscount(applicableAmount)

    return {
      success: true,
      discount,
      applicableAmount,
    }
  } catch (error) {
    console.error("Apply coupon discount error:", error)
    return { success: false, error: error.message }
  }
}

// Update coupon usage count
const updateCouponUsage = async (couponCode) => {
  try {
    await Coupon.findOneAndUpdate({ code: couponCode.toUpperCase() }, { $inc: { usedCount: 1 } })
  } catch (error) {
    console.error("Update coupon usage error:", error)
  }
}

// Update flash sale sold quantities
const updateFlashSaleSoldQuantities = async (flashSaleId, items) => {
  try {
    const flashSale = await FlashSale.findById(flashSaleId)
    if (!flashSale) return

    for (const item of items) {
      if (item.flashSaleDiscount && item.flashSaleDiscount > 0) {
        flashSale.updateSoldQuantity(item.product, item.quantity, item.variant?.size, item.variant?.color)
      }
    }

    await flashSale.save()
  } catch (error) {
    console.error("Update flash sale sold quantities error:", error)
  }
}

// Get best available discount for product
const getBestProductDiscount = async (productId, size = null, color = null) => {
  try {
    const product = await Product.findById(productId)
    if (!product) return null

    const now = new Date()

    // Check flash sales
    const activeFlashSales = await FlashSale.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
      "products.product": productId,
    }).sort({ priority: -1 })

    let bestDiscount = null

    for (const flashSale of activeFlashSales) {
      const productSale = flashSale.getProductSale(productId, size, color)

      if (productSale && (productSale.availableQuantity === null || productSale.availableQuantity > 0)) {
        const originalPrice = product.priceRange.min
        const discountAmount = originalPrice - productSale.salePrice
        const discountPercentage = (discountAmount / originalPrice) * 100

        if (!bestDiscount || discountPercentage > bestDiscount.percentage) {
          bestDiscount = {
            type: "flash_sale",
            flashSaleId: flashSale._id,
            flashSaleName: flashSale.name,
            originalPrice,
            salePrice: productSale.salePrice,
            discountAmount,
            percentage: discountPercentage,
            availableQuantity: productSale.availableQuantity,
            endTime: flashSale.endTime,
          }
        }
      }
    }

    return bestDiscount
  } catch (error) {
    console.error("Get best product discount error:", error)
    return null
  }
}

// Validate discount combination
const validateDiscountCombination = (discounts) => {
  // Add business rules for discount combinations
  // For now, allow both coupon and flash sale discounts

  return {
    valid: true,
    totalDiscount: (discounts.couponDiscount || 0) + (discounts.flashSaleDiscount || 0),
  }
}

module.exports = {
  applyDiscounts,
  applyFlashSaleDiscounts,
  applyCouponDiscount,
  updateCouponUsage,
  updateFlashSaleSoldQuantities,
  getBestProductDiscount,
  validateDiscountCombination,
}
