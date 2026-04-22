// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const { createError } = require("./errorHandler");
const { JWT_SECRET } = require("../services/authService");

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(createError("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, ... }
    next();
  } catch (err) {
    return next(createError("Not authorized to access this route", 401));
  }
};

/**
 * Optionally protect by role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError(`User role ${req.user.role} is not authorized to access this route`, 403)
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
