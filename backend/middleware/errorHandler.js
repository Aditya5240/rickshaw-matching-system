// middleware/errorHandler.js
// Centralized error handling middleware for Express

/**
 * Global error handler.
 * Catches errors forwarded via next(err) and returns structured JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(`[ERROR] ${err.message}`, err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

/**
 * Creates an error with a custom status code.
 * @param {string} message - Error description
 * @param {number} statusCode - HTTP status code
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { errorHandler, createError };
