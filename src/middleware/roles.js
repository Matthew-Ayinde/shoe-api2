const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Insufficient permissions.",
      })
    }

    next()
  }
}

const isAdmin = authorize("admin")
const isStaffOrAdmin = authorize("staff", "admin")
const isCustomer = authorize("customer", "staff", "admin")

module.exports = {
  authorize,
  isAdmin,
  isStaffOrAdmin,
  isCustomer,
}
