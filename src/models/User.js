/**
 * User Model
 *
 * Comprehensive user management system supporting:
 * - Email/password authentication
 * - Google OAuth integration
 * - Role-based access control (customer, staff, admin)
 * - Multiple shipping addresses
 * - User preferences and notifications
 * - Push notification subscriptions
 * - Account verification and password reset
 *
 * Security Features:
 * - Password hashing with bcrypt (12 salt rounds)
 * - Email verification tokens
 * - Password reset tokens with expiration
 * - Sensitive data filtering in JSON responses
 *
 * Best Practices Implemented:
 * - Compound indexes for performance
 * - Pre-save middleware for password hashing
 * - Instance methods for common operations
 * - Proper validation and constraints
 */

const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

/**
 * Address Schema
 *
 * Supports multiple shipping addresses per user with:
 * - Address type classification (home, work, other)
 * - Complete address information
 * - Default address designation
 * - International support (country field)
 */
const addressSchema = new mongoose.Schema({
  // Address type for easy categorization
  type: {
    type: String,
    enum: ["home", "work", "other"],
    default: "home",
  },

  // Complete address fields - all required for shipping
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  country: { type: String, default: "US", trim: true },

  // Default address flag - only one address can be default per user
  isDefault: { type: Boolean, default: false },
})

/**
 * Main User Schema
 *
 * Comprehensive user model supporting multiple authentication methods,
 * role-based access control, and extensive user preferences.
 */
const userSchema = new mongoose.Schema(
  {
    // Authentication Fields
    // Primary email - used for login and communications
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Automatically convert to lowercase
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },

    // Password for email/password authentication
    // select: false means password won't be included in queries by default
    password: {
      type: String,
      select: false,
      minlength: [6, 'Password must be at least 6 characters'],
    },

    // Google OAuth ID for social login
    // sparse: true allows multiple null values (for non-Google users)
    googleId: {
      type: String,
      sparse: true,
    },

    // Role-based Access Control
    // customer: regular users who can place orders
    // staff: employees who can manage orders and products
    // admin: full system access
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
    },

    // User Profile Information
    profile: {
      firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
      },
      phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
      },
      avatar: String, // URL to profile image (Cloudinary)
      dateOfBirth: Date,
    },

    // Multiple shipping addresses support
    addresses: [addressSchema],

    // User Notification Preferences
    preferences: {
      newsletter: { type: Boolean, default: true }, // Marketing emails
      pushNotifications: { type: Boolean, default: true }, // Browser push notifications
      smsNotifications: { type: Boolean, default: false }, // SMS alerts
    },

    // Web Push Notification Subscription
    // Stores browser push subscription details for real-time notifications
    pushSubscription: {
      endpoint: String, // Push service endpoint
      keys: {
        p256dh: String, // Public key for encryption
        auth: String,   // Authentication secret
      },
    },

    // Account Verification and Security
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String, // Token sent via email for verification
    passwordResetToken: String,     // Token for password reset
    passwordResetExpires: Date,     // Password reset token expiration

    // Activity Tracking
    lastLogin: Date, // Track user engagement
    isActive: { type: Boolean, default: true }, // Soft delete capability
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  },
)

/**
 * Database Indexes for Performance Optimization
 *
 * These indexes significantly improve query performance for common operations:
 * - Email lookup for authentication (most frequent operation)
 * - Google ID lookup for OAuth authentication
 * - Role-based queries for admin operations
 */
userSchema.index({ email: 1 })     // Unique index for fast email lookups
userSchema.index({ googleId: 1 })  // Sparse index for Google OAuth users
userSchema.index({ role: 1 })      // Index for role-based access control queries

/**
 * Pre-save Middleware for Password Hashing
 *
 * Automatically hashes passwords before saving to database using bcrypt.
 * - Only hashes if password is modified (prevents re-hashing on updates)
 * - Uses salt rounds of 12 for strong security
 * - Handles both new users and password changes
 */
userSchema.pre("save", async function (next) {
  // Skip if password hasn't been modified
  if (!this.isModified("password")) return next()

  // Hash password with bcrypt (12 salt rounds for security)
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12)
  }
  next()
})

/**
 * Instance Method: Compare Password
 *
 * Securely compares a plain text password with the hashed password.
 * Used during authentication to verify user credentials.
 *
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

/**
 * Virtual Property: Full Name
 *
 * Combines first and last name for display purposes.
 * Virtual properties are not stored in the database but computed on-the-fly.
 */
userSchema.virtual("fullName").get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`
})

/**
 * Instance Method: Custom JSON Transformation
 *
 * Removes sensitive information from JSON responses to protect user data.
 * This method is automatically called when the user object is serialized.
 *
 * Security measures:
 * - Removes password hash
 * - Removes email verification token
 * - Removes password reset tokens
 * - Keeps all other user data for frontend use
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject()

  // Remove sensitive fields from JSON output
  delete user.password
  delete user.emailVerificationToken
  delete user.passwordResetToken
  delete user.passwordResetExpires

  return user
}

/**
 * Export User Model
 *
 * Uses mongoose.models.User to prevent re-compilation errors in development.
 * This pattern ensures the model is only compiled once even with hot reloading.
 */
module.exports = mongoose.models.User || mongoose.model("User", userSchema)
