const express = require("express")
const multer = require("multer")
const Product = require("../models/Product")
const { authenticate, optionalAuth } = require("../middleware/auth")
const { isStaffOrAdmin } = require("../middleware/roles")
const { validateProduct, validatePagination, validateObjectId } = require("../middleware/validation")
const { uploadImage, deleteImage } = require("../config/cloudinary")
const { getPaginationInfo, generateSKU } = require("../utils/helpers")
const { trackProductViews, trackUserActivity, emitInventoryUpdates } = require("../middleware/realtime")

const router = express.Router()

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// @desc    Get all products with filtering and pagination
// @route   GET /api/products
// @access  Public
router.get("/", validatePagination, optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      gender,
      minPrice,
      maxPrice,
      size,
      color,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      featured,
    } = req.query

    // Build filter object
    const filter = { isActive: true }

    if (category) filter.category = category
    if (brand) filter.brand = new RegExp(brand, "i")
    if (gender) filter.gender = gender
    if (featured !== undefined) filter.isFeatured = featured === "true"

    // Price range filter
    if (minPrice || maxPrice) {
      filter["variants.price"] = {}
      if (minPrice) filter["variants.price"].$gte = Number.parseFloat(minPrice)
      if (maxPrice) filter["variants.price"].$lte = Number.parseFloat(maxPrice)
    }

    // Size and color filters
    if (size) filter["variants.size"] = size
    if (color) filter["variants.color"] = new RegExp(color, "i")

    // Text search
    if (search) {
      filter.$text = { $search: search }
    }

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    // Execute query with pagination
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const products = await Product.find(filter).sort(sort).skip(skip).limit(Number.parseInt(limit)).select("-__v")

    const total = await Product.countDocuments(filter)
    const pagination = getPaginationInfo(Number.parseInt(page), Number.parseInt(limit), total)

    res.json({
      status: "success",
      data: {
        products,
        pagination,
      },
    })
  } catch (error) {
    console.error("Get products error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch products",
    })
  }
})

// @desc    Get single product by ID or slug
// @route   GET /api/products/:identifier
// @access  Public
router.get("/:identifier", optionalAuth, trackProductViews(), async (req, res) => {
  try {
    const { identifier } = req.params

    // Try to find by ID first, then by slug
    let product = await Product.findById(identifier).select("-__v")

    if (!product) {
      product = await Product.findOne({ slug: identifier, isActive: true }).select("-__v")
    }

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    // Check if product is active (unless user is staff/admin)
    if (!product.isActive && (!req.user || !["staff", "admin"].includes(req.user.role))) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    res.json({
      status: "success",
      data: {
        product,
      },
    })
  } catch (error) {
    console.error("Get product error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch product",
    })
  }
})


// @desc    Create new product
// @route   POST /api/products
// @access  Private (Staff/Admin)
router.post("/", authenticate, isStaffOrAdmin, upload.array("images", 10), validateProduct, async (req, res) => {
  try {
    const {
      name,
      description,
      shortDescription,
      brand,
      category,
      subcategory,
      gender,
      variants,
      features,
      materials,
      tags,
      seo,
    } = req.body

    // Parse variants if it's a string (from form data)
    let parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants

    // Generate SKUs for variants that don't have them
    parsedVariants = parsedVariants.map((variant) => ({
      ...variant,
      sku: variant.sku || generateSKU(brand, category, variant.size, variant.color),
    }))

    // Upload images if provided
    const uploadedImages = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
        const uploadResult = await uploadImage(base64, "products")
        uploadedImages.push({
          public_id: uploadResult.public_id,
          url: uploadResult.url,
          alt: `${name} - ${brand}`,
          isPrimary: uploadedImages.length === 0, // First image is primary
        })
      }
    }

    const product = new Product({
      name,
      description,
      shortDescription,
      brand,
      category,
      subcategory,
      gender,
      variants: parsedVariants,
      features: features ? (typeof features === "string" ? JSON.parse(features) : features) : [],
      materials: materials ? (typeof materials === "string" ? JSON.parse(materials) : materials) : [],
      tags: tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [],
      images: uploadedImages,
      seo: seo ? (typeof seo === "string" ? JSON.parse(seo) : seo) : {},
    })

    await product.save()

    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: {
        product,
      },
    })
  } catch (error) {
    console.error("Create product error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to create product",
    })
  }
})

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Staff/Admin)
router.put("/:id", authenticate, isStaffOrAdmin, validateObjectId, upload.array("images", 10), async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    // Parse JSON strings if they exist
    if (updateData.variants && typeof updateData.variants === "string") {
      updateData.variants = JSON.parse(updateData.variants)
    }
    if (updateData.features && typeof updateData.features === "string") {
      updateData.features = JSON.parse(updateData.features)
    }
    if (updateData.materials && typeof updateData.materials === "string") {
      updateData.materials = JSON.parse(updateData.materials)
    }
    if (updateData.tags && typeof updateData.tags === "string") {
      updateData.tags = JSON.parse(updateData.tags)
    }
    if (updateData.seo && typeof updateData.seo === "string") {
      updateData.seo = JSON.parse(updateData.seo)
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = []
      for (const file of req.files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
        const uploadResult = await uploadImage(base64, "products")
        newImages.push({
          public_id: uploadResult.public_id,
          url: uploadResult.url,
          alt: `${updateData.name || product.name} - ${updateData.brand || product.brand}`,
          isPrimary: product.images.length === 0 && newImages.length === 0,
        })
      }
      updateData.images = [...product.images, ...newImages]
    }

    // Generate SKUs for new variants
    if (updateData.variants) {
      updateData.variants = updateData.variants.map((variant) => ({
        ...variant,
        sku:
          variant.sku ||
          generateSKU(
            updateData.brand || product.brand,
            updateData.category || product.category,
            variant.size,
            variant.color,
          ),
      }))
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })

    res.json({
      status: "success",
      message: "Product updated successfully",
      data: {
        product: updatedProduct,
      },
    })
  } catch (error) {
    console.error("Update product error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update product",
    })
  }
})

// @desc    Delete product image
// @route   DELETE /api/products/:id/images/:imageId
// @access  Private (Staff/Admin)
router.delete("/:id/images/:imageId", authenticate, isStaffOrAdmin, validateObjectId, async (req, res) => {
  try {
    const { id, imageId } = req.params

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    const imageIndex = product.images.findIndex((img) => img._id.toString() === imageId)

    if (imageIndex === -1) {
      return res.status(404).json({
        status: "error",
        message: "Image not found",
      })
    }

    const image = product.images[imageIndex]

    // Delete from Cloudinary
    if (image.public_id) {
      await deleteImage(image.public_id)
    }

    // Remove from product
    product.images.splice(imageIndex, 1)

    // If deleted image was primary, make first remaining image primary
    if (image.isPrimary && product.images.length > 0) {
      product.images[0].isPrimary = true
    }

    await product.save()

    res.json({
      status: "success",
      message: "Image deleted successfully",
      data: {
        product,
      },
    })
  } catch (error) {
    console.error("Delete product image error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to delete image",
    })
  }
})

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin)
router.delete("/:id", authenticate, isStaffOrAdmin, validateObjectId, async (req, res) => {
  try {
    const { id } = req.params

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    // Delete all images from Cloudinary
    for (const image of product.images) {
      if (image.public_id) {
        await deleteImage(image.public_id)
      }
    }

    // Soft delete by setting isActive to false
    product.isActive = false
    product.discontinuedDate = new Date()
    await product.save()

    res.json({
      status: "success",
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Delete product error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to delete product",
    })
  }
})

// @desc    Get product categories
// @route   GET /api/products/meta/categories
// @access  Public
router.get("/meta/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { isActive: true })
    const brands = await Product.distinct("brand", { isActive: true })
    const genders = await Product.distinct("gender", { isActive: true })

    // Get size and color options from variants
    const products = await Product.find({ isActive: true }, "variants")
    const sizes = [...new Set(products.flatMap((p) => p.variants.map((v) => v.size)))].sort()
    const colors = [...new Set(products.flatMap((p) => p.variants.map((v) => v.color)))]

    res.json({
      status: "success",
      data: {
        categories: categories.sort(),
        brands: brands.sort(),
        genders: genders.sort(),
        sizes,
        colors: colors.sort(),
      },
    })
  } catch (error) {
    console.error("Get categories error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch categories",
    })
  }
})

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
router.get("/featured", async (req, res) => {
  try {
    const { limit = 8 } = req.query

    const products = await Product.find({
      isActive: true,
      isFeatured: true,
    })
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))
      .select("-__v")

    res.json({
      status: "success",
      data: {
        products,
      },
    })
  } catch (error) {
    console.error("Get featured products error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch featured products",
    })
  }
})

// @desc    Get product recommendations
// @route   GET /api/products/:id/recommendations
// @access  Public
router.get("/:id/recommendations", validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { limit = 4 } = req.query

    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    // Find similar products based on category, brand, or gender
    const recommendations = await Product.find({
      _id: { $ne: id },
      isActive: true,
      $or: [{ category: product.category }, { brand: product.brand }, { gender: product.gender }],
    })
      .sort({ totalSold: -1, createdAt: -1 })
      .limit(Number.parseInt(limit))
      .select("-__v")

    res.json({
      status: "success",
      data: {
        recommendations,
      },
    })
  } catch (error) {
    console.error("Get recommendations error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to fetch recommendations",
    })
  }
})

// @desc    Check product availability
// @route   POST /api/products/:id/check-availability
// @access  Public
router.post("/:id/check-availability", validateObjectId, async (req, res) => {
  try {
    const { id } = req.params
    const { size, color, quantity = 1 } = req.body

    const product = await Product.findById(id)

    if (!product || !product.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      })
    }

    const variant = product.getVariant(size, color)

    if (!variant) {
      return res.status(400).json({
        status: "error",
        message: "Variant not found",
      })
    }

    const isAvailable = variant.stock >= quantity && variant.isActive
    const maxQuantity = variant.stock

    res.json({
      status: "success",
      data: {
        available: isAvailable,
        maxQuantity,
        currentStock: variant.stock,
        variant,
      },
    })
  } catch (error) {
    console.error("Check availability error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to check availability",
    })
  }
})

module.exports = router
