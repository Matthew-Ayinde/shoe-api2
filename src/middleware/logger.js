const morgan = require("morgan")
const logger = require("../utils/logger")

// Create a stream object with a 'write' function that will be used by `morgan`
const stream = {
  write: (message) => logger.http(message.trim()),
}

// Skip all the Morgan http log if the application is not running in development mode
const skip = () => {
  const env = process.env.NODE_ENV || "development"
  return env !== "development"
}

// Build the morgan middleware
const morganMiddleware = morgan(":method :url :status :res[content-length] - :response-time ms", { stream, skip })

module.exports = morganMiddleware
