const { body, param, query, validationResult } = require("express-validator")

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: errors.array(),
    })
  }

  next()
}

// User validation rules
const validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("firstName").trim().isLength({ min: 1 }).withMessage("First name is required"),
  body("lastName").trim().isLength({ min: 1 }).withMessage("Last name is required"),
  handleValidationErrors,
]

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
]

// Product validation rules
const validateProduct = [
  body("name").trim().isLength({ min: 1 }).withMessage("Product name is required"),
  body("description").trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
  body("brand").trim().isLength({ min: 1 }).withMessage("Brand is required"),
  body("category")
    .isIn(["running", "casual", "formal", "sports", "boots", "sandals", "sneakers"])
    .withMessage("Invalid category"),
  body("gender").isIn(["men", "women", "unisex", "kids"]).withMessage("Invalid gender"),
  body("variants").isArray({ min: 1 }).withMessage("At least one variant is required"),
  body("variants.*.size")
    .isIn([
      "5",
      "5.5",
      "6",
      "6.5",
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
      "12.5",
      "13",
      "14",
      "15",
    ])
    .withMessage("Invalid size"),
  body("variants.*.color").trim().isLength({ min: 1 }).withMessage("Color is required"),
  body("variants.*.price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("variants.*.stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  handleValidationErrors,
]

// Order validation rules
const validateOrder = [
  body("items").isArray({ min: 1 }).withMessage("Order must contain at least one item"),
  body("shippingAddress.firstName").trim().isLength({ min: 1 }).withMessage("First name is required"),
  body("shippingAddress.lastName").trim().isLength({ min: 1 }).withMessage("Last name is required"),
  body("shippingAddress.street").trim().isLength({ min: 1 }).withMessage("Street address is required"),
  body("shippingAddress.city").trim().isLength({ min: 1 }).withMessage("City is required"),
  body("shippingAddress.state").trim().isLength({ min: 1 }).withMessage("State is required"),
  body("shippingAddress.zipCode").trim().isLength({ min: 5 }).withMessage("Valid zip code is required"),
  handleValidationErrors,
]

// Coupon validation rules
const validateCoupon = [
  body("code")
    .trim()
    .isLength({ min: 3 })
    .isAlphanumeric()
    .withMessage("Coupon code must be at least 3 alphanumeric characters"),
  body("description").trim().isLength({ min: 1 }).withMessage("Description is required"),
  body("type").isIn(["percentage", "fixed"]).withMessage("Type must be percentage or fixed"),
  body("value").isFloat({ min: 0 }).withMessage("Value must be a positive number"),
  body("validFrom").isISO8601().withMessage("Valid from date is required"),
  body("validTo").isISO8601().withMessage("Valid to date is required"),
  handleValidationErrors,
]

// Query validation
const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  handleValidationErrors,
]

const validateObjectId = [param("id").isMongoId().withMessage("Invalid ID format"), handleValidationErrors]

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProduct,
  validateOrder,
  validateCoupon,
  validatePagination,
  validateObjectId,
}
