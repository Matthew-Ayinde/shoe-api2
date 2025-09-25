// User roles
const USER_ROLES = {
  CUSTOMER: "customer",
  STAFF: "staff",
  ADMIN: "admin",
}

// Order statuses
const ORDER_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
}

// Payment statuses
const PAYMENT_STATUSES = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
}

// Payment methods
const PAYMENT_METHODS = {
  STRIPE: "stripe",
  DUMMY: "dummy",
}

// Shipping methods
const SHIPPING_METHODS = {
  STANDARD: "standard",
  EXPRESS: "express",
  OVERNIGHT: "overnight",
}

// Product categories
const PRODUCT_CATEGORIES = {
  RUNNING: "running",
  CASUAL: "casual",
  FORMAL: "formal",
  SPORTS: "sports",
  BOOTS: "boots",
  SANDALS: "sandals",
  SNEAKERS: "sneakers",
}

// Gender options
const GENDER_OPTIONS = {
  MEN: "men",
  WOMEN: "women",
  UNISEX: "unisex",
  KIDS: "kids",
}

// Shoe sizes
const SHOE_SIZES = [
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
]

// Coupon types
const COUPON_TYPES = {
  PERCENTAGE: "percentage",
  FIXED: "fixed",
}

// Address types
const ADDRESS_TYPES = {
  HOME: "home",
  WORK: "work",
  OTHER: "other",
}

// Notification types
const NOTIFICATION_TYPES = {
  ORDER_CONFIRMATION: "order_confirmation",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  FLASH_SALE_ALERT: "flash_sale_alert",
  LOW_STOCK_ALERT: "low_stock_alert",
  WELCOME: "welcome",
  PASSWORD_RESET: "password_reset",
}

// API response messages
const RESPONSE_MESSAGES = {
  SUCCESS: "Operation completed successfully",
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  NOT_FOUND: "Resource not found",
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "Access denied",
  VALIDATION_ERROR: "Validation failed",
  SERVER_ERROR: "Internal server error",
  DUPLICATE_ERROR: "Resource already exists",
}

// Pagination defaults
const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
}

// File upload limits
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES: 10,
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
}

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  PRODUCTS: 300, // 5 minutes
  CATEGORIES: 3600, // 1 hour
  FLASH_SALES: 60, // 1 minute
  USER_PROFILE: 900, // 15 minutes
}

// Rate limiting
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // requests per window
  },
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // requests per window
  },
}

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: "welcome",
  ORDER_CONFIRMATION: "order_confirmation",
  PASSWORD_RESET: "password_reset",
  SHIPPING_NOTIFICATION: "shipping_notification",
}

// Socket events
const SOCKET_EVENTS = {
  INVENTORY_UPDATE: "inventory_update",
  FLASH_SALE_START: "flash_sale_start",
  FLASH_SALE_END: "flash_sale_end",
  ORDER_STATUS_UPDATE: "order_status_update",
  NEW_ORDER: "new_order",
}

module.exports = {
  USER_ROLES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
  PRODUCT_CATEGORIES,
  GENDER_OPTIONS,
  SHOE_SIZES,
  COUPON_TYPES,
  ADDRESS_TYPES,
  NOTIFICATION_TYPES,
  RESPONSE_MESSAGES,
  PAGINATION_DEFAULTS,
  UPLOAD_LIMITS,
  CACHE_DURATIONS,
  RATE_LIMITS,
  EMAIL_TEMPLATES,
  SOCKET_EVENTS,
}
