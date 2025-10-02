/**
 * Winston Logger Configuration
 * 
 * This module sets up Winston logger with different transports and formats
 * for development and production environments.
 * 
 * Features:
 * - Console logging with colors for development
 * - File logging for production
 * - Error logging to separate file
 * - JSON format for production logs
 * - Custom log levels and formats
 */

const winston = require("winston")
const path = require("path")

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
}

// Tell winston that you want to link the colors
winston.addColors(colors)

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development"
  const isDevelopment = env === "development"
  return isDevelopment ? "debug" : "warn"
}

// Define different formats for different environments
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
)

// Define different transports based on environment
const transports = []

// Always add console transport
transports.push(
  new winston.transports.Console({
    format: format,
  })
)

// Add file transports for production
if (process.env.NODE_ENV === "production") {
  // Ensure logs directory exists
  const fs = require("fs")
  const logsDir = path.join(process.cwd(), "logs")
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  // Add file transport for all logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "all.log"),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  )

  // Add separate file transport for errors
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  )
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
})

// Create a stream object with a 'write' function that will be used by Morgan
logger.stream = {
  write: (message) => {
    // Use the 'info' log level so the output will be picked up by both transports
    logger.info(message.trim())
  },
}

module.exports = logger
