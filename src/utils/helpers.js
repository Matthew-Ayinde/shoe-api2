const crypto = require("crypto")

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString("hex")
}

// Generate SKU
const generateSKU = (brand, category, size, color) => {
  const brandCode = brand.substring(0, 3).toUpperCase()
  const categoryCode = category.substring(0, 3).toUpperCase()
  const sizeCode = size.replace(".", "")
  const colorCode = color.substring(0, 3).toUpperCase()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")

  return `${brandCode}-${categoryCode}-${sizeCode}-${colorCode}-${random}`
}

// Calculate shipping cost
const calculateShippingCost = (items, shippingMethod = "standard") => {
  const totalWeight = items.reduce((weight, item) => weight + item.quantity * 1, 0) // Assume 1 lb per shoe

  const rates = {
    standard: 5.99,
    express: 12.99,
    overnight: 24.99,
  }

  let baseCost = rates[shippingMethod] || rates.standard

  // Add weight-based cost
  if (totalWeight > 5) {
    baseCost += (totalWeight - 5) * 2
  }

  return Math.round(baseCost * 100) / 100 // Round to 2 decimal places
}

// Calculate tax
const calculateTax = (subtotal, taxRate = 0.08) => {
  return Math.round(subtotal * taxRate * 100) / 100
}

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Sanitize string for URL
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, "") // Trim - from end of text
}

// Generate pagination info
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  }
}

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}

// Remove sensitive fields from user object
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user
  delete userObj.password
  delete userObj.emailVerificationToken
  delete userObj.passwordResetToken
  delete userObj.passwordResetExpires
  return userObj
}

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `ORD-${timestamp}-${random}`
}

// Check if date is in range
const isDateInRange = (date, startDate, endDate) => {
  const checkDate = new Date(date)
  const start = new Date(startDate)
  const end = new Date(endDate)
  return checkDate >= start && checkDate <= end
}

// Format date
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  return new Date(date).toLocaleDateString("en-US", { ...defaultOptions, ...options })
}

// Calculate discount amount
const calculateDiscountAmount = (originalAmount, discountType, discountValue, maxDiscount = null) => {
  let discount = 0

  if (discountType === "percentage") {
    discount = (originalAmount * discountValue) / 100
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount
    }
  } else if (discountType === "fixed") {
    discount = discountValue
  }

  // Don't let discount exceed original amount
  return Math.min(discount, originalAmount)
}

module.exports = {
  generateRandomString,
  generateSKU,
  calculateShippingCost,
  calculateTax,
  formatCurrency,
  isValidEmail,
  slugify,
  getPaginationInfo,
  deepClone,
  sanitizeUser,
  generateOrderNumber,
  isDateInRange,
  formatDate,
  calculateDiscountAmount,
}
