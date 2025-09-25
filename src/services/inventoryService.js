const Product = require("../models/Product")
const { getSocketIO } = require("./socketService")

// Update product stock
const updateStock = async (productId, size, color, quantity, operation = "decrease") => {
  try {
    const product = await Product.findById(productId)

    if (!product) {
      throw new Error("Product not found")
    }

    const variant = product.variants.find((v) => v.size === size && v.color === color)

    if (!variant) {
      throw new Error("Variant not found")
    }

    if (operation === "decrease") {
      if (variant.stock < quantity) {
        throw new Error("Insufficient stock")
      }
      variant.stock -= quantity
    } else if (operation === "increase") {
      variant.stock += quantity
    }

    await product.save()

    // Emit real-time inventory update
    const io = getSocketIO()
    if (io) {
      io.emit("inventory_update", {
        productId,
        variant: {
          size,
          color,
          sku: variant.sku,
          stock: variant.stock,
        },
        timestamp: new Date(),
      })

      // Check for low stock alert
      if (variant.stock <= variant.lowStockThreshold) {
        io.to("admin").emit("low_stock_alert", {
          productId,
          productName: product.name,
          variant: {
            size,
            color,
            sku: variant.sku,
            stock: variant.stock,
            threshold: variant.lowStockThreshold,
          },
          timestamp: new Date(),
        })
      }
    }

    return { success: true, newStock: variant.stock }
  } catch (error) {
    console.error("Update stock error:", error)
    return { success: false, error: error.message }
  }
}

// Reserve stock for order
const reserveStock = async (items) => {
  const reservations = []

  try {
    for (const item of items) {
      const result = await updateStock(item.product, item.variant.size, item.variant.color, item.quantity, "decrease")

      if (!result.success) {
        // Rollback previous reservations
        for (const reservation of reservations) {
          await updateStock(reservation.product, reservation.size, reservation.color, reservation.quantity, "increase")
        }
        throw new Error(`Failed to reserve stock for ${item.variant.sku}: ${result.error}`)
      }

      reservations.push({
        product: item.product,
        size: item.variant.size,
        color: item.variant.color,
        quantity: item.quantity,
      })
    }

    return { success: true, reservations }
  } catch (error) {
    console.error("Reserve stock error:", error)
    return { success: false, error: error.message }
  }
}

// Release reserved stock (in case of order cancellation)
const releaseStock = async (items) => {
  try {
    for (const item of items) {
      await updateStock(item.product, item.variant.size, item.variant.color, item.quantity, "increase")
    }
    return { success: true }
  } catch (error) {
    console.error("Release stock error:", error)
    return { success: false, error: error.message }
  }
}

// Get low stock products
const getLowStockProducts = async () => {
  try {
    const products = await Product.find({ isActive: true })
    const lowStockItems = []

    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.stock <= variant.lowStockThreshold && variant.isActive) {
          lowStockItems.push({
            productId: product._id,
            productName: product.name,
            brand: product.brand,
            variant: {
              size: variant.size,
              color: variant.color,
              sku: variant.sku,
              stock: variant.stock,
              threshold: variant.lowStockThreshold,
            },
          })
        }
      }
    }

    return lowStockItems
  } catch (error) {
    console.error("Get low stock products error:", error)
    return []
  }
}

// Bulk update stock
const bulkUpdateStock = async (updates) => {
  const results = []

  for (const update of updates) {
    const result = await updateStock(update.productId, update.size, update.color, update.quantity, update.operation)
    results.push({
      ...update,
      ...result,
    })
  }

  return results
}

// Check stock availability for multiple items
const checkStockAvailability = async (items) => {
  const availability = []

  for (const item of items) {
    try {
      const product = await Product.findById(item.productId)

      if (!product || !product.isActive) {
        availability.push({
          productId: item.productId,
          available: false,
          reason: "Product not found or inactive",
        })
        continue
      }

      const variant = product.getVariant(item.size, item.color)

      if (!variant || !variant.isActive) {
        availability.push({
          productId: item.productId,
          available: false,
          reason: "Variant not found or inactive",
        })
        continue
      }

      availability.push({
        productId: item.productId,
        variant: {
          size: item.size,
          color: item.color,
          sku: variant.sku,
        },
        available: variant.stock >= item.quantity,
        currentStock: variant.stock,
        requestedQuantity: item.quantity,
        reason: variant.stock >= item.quantity ? null : "Insufficient stock",
      })
    } catch (error) {
      availability.push({
        productId: item.productId,
        available: false,
        reason: "Error checking availability",
        error: error.message,
      })
    }
  }

  return availability
}

module.exports = {
  updateStock,
  reserveStock,
  releaseStock,
  getLowStockProducts,
  bulkUpdateStock,
  checkStockAvailability,
}
