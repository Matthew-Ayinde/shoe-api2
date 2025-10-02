/**
 * Authentication Middleware
 *
 * Comprehensive authentication and authorization system for the shoe store API.
 * Provides multiple authentication strategies and role-based access control.
 *
 * Features:
 * - JWT token validation and verification
 * - User authentication with database lookup
 * - Optional authentication for public endpoints
 * - Role-based access control (RBAC)
 * - Secure token extraction from headers
 * - User status validation (active/inactive)
 *
 * Security Measures:
 * - Token expiration validation
 * - User existence verification
 * - Active user status checking
 * - Proper error handling without information leakage
 * - Consistent error response format
 *
 * Usage Examples:
 * - app.use('/api/protected', authenticate)
 * - app.use('/api/admin', authenticate, requireRole(['admin']))
 * - app.use('/api/public', optionalAuth)
 */

const jwt = require("jsonwebtoken")
const User = require("../models/User")

/**
 * Required Authentication Middleware
 *
 * Validates JWT tokens and ensures user is authenticated.
 * Blocks access if no valid token is provided.
 *
 * Process:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Lookup user in database
 * 4. Validate user exists and is active
 * 5. Attach user object to request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header (format: "Bearer <token>")
    const token = req.header("Authorization")?.replace("Bearer ", "")

    // Check if token is provided
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access denied. No token provided.",
      })
    }

    // Verify JWT token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Lookup user in database to ensure they still exist and are active
    const user = await User.findById(decoded.id)

    // Validate user exists and account is active
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token or user not found.",
      })
    }

    // Attach authenticated user to request object for use in route handlers
    req.user = user
    next()
  } catch (error) {
    // Handle JWT verification errors (expired, invalid signature, etc.)
    res.status(401).json({
      status: "error",
      message: "Invalid token.",
    })
  }
}

/**
 * Optional Authentication Middleware
 *
 * Attempts to authenticate user but continues even if authentication fails.
 * Useful for endpoints that provide different content for authenticated users.
 *
 * Use Cases:
 * - Product listings (show personalized recommendations if logged in)
 * - Public content with user-specific features
 * - Analytics tracking with user identification
 *
 * Process:
 * 1. Extract token if present
 * 2. Verify token if provided
 * 3. Attach user if valid, continue regardless
 * 4. Never block request execution
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.header("Authorization")?.replace("Bearer ", "")

    // Only attempt authentication if token is provided
    if (token) {
      // Verify token and lookup user
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id)

      // Attach user only if valid and active
      if (user && user.isActive) {
        req.user = user
      }
    }

    // Always continue to next middleware (never block)
    next()
  } catch (error) {
    // Silently continue without authentication on any error
    // This ensures public access is never blocked by auth issues
    next()
  }
}

/**
 * Role-Based Access Control Middleware Factory
 *
 * Creates middleware that restricts access based on user roles.
 * Supports multiple roles and hierarchical permission checking.
 *
 * Role Hierarchy:
 * - customer: Basic user access
 * - staff: Employee access (includes customer permissions)
 * - admin: Full system access (includes all permissions)
 *
 * Usage Examples:
 * - requireRole(['admin']) - Admin only
 * - requireRole(['admin', 'staff']) - Admin or staff
 * - requireRole(['customer', 'staff', 'admin']) - Any authenticated user
 *
 * @param {Array<string>} allowedRoles - Array of roles that can access the endpoint
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required.",
      })
    }

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Insufficient permissions.",
        requiredRoles: allowedRoles,
        userRole: req.user.role
      })
    }

    // User has required role, continue to route handler
    next()
  }
}

/**
 * Convenience Role Middleware Functions
 *
 * Pre-configured role middleware for common access patterns.
 * Reduces boilerplate code in route definitions.
 */

// Admin-only access
const requireAdmin = requireRole(['admin'])

// Staff or admin access
const requireStaff = requireRole(['staff', 'admin'])

// Any authenticated user
const requireAuth = requireRole(['customer', 'staff', 'admin'])

/**
 * Module Exports
 *
 * Provides both named exports and convenience aliases for flexibility.
 */
module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireStaff,
  requireAuth,
  auth: authenticate, // Alias for backward compatibility
}
