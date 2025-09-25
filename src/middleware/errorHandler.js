// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors || [],
    })
  }

  // 404 not found
  if (err.statusCode === 404) {
    return res.status(404).json({
      status: "error",
      message: err.message || "Route not found",
    })
  }

  // 405 method not allowed
  if (err.statusCode === 405) {
    return res.status(405).json({
      status: "error",
      message: err.message || "Method not allowed",
    })
  }

  // Default
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  })
}

module.exports = errorHandler
