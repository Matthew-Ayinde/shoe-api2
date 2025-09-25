const jwt = require("jsonwebtoken")
const User = require("../models/User")

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access denied. No token provided.",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token or user not found.",
      })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: "Invalid token.",
    })
  }
}

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id)

      if (user && user.isActive) {
        req.user = user
      }
    }

    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
}

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required.",
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Insufficient permissions.",
      })
    }

    next()
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  auth: authenticate,
}
