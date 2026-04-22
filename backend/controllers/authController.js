// controllers/authController.js

const authService = require("../services/authService");
const { createError } = require("../middleware/errorHandler");

const register = async (req, res, next) => {
  try {
    const { email, password, role, name, vehicleNumber, totalSeats } = req.body;

    if (!email || !password || !role || !name) {
      return next(createError("Email, password, role, and name are required", 400));
    }
    if (role === "driver" && !vehicleNumber) {
      return next(createError("Vehicle number is required for drivers", 400));
    }

    const user = await authService.registerUser(req.body);
    // Auto-login after registration
    const { token, user: loggedInUser } = await authService.loginUser(email, password);

    res.status(201).json({ success: true, data: { token, user: loggedInUser } });
  } catch (err) {
    if (err.message === "Email already in use") {
      return next(createError(err.message, 400));
    }
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(createError("Email and password are required", 400));
    }

    const { token, user } = await authService.loginUser(email, password);
    res.status(200).json({ success: true, data: { token, user } });
  } catch (err) {
    if (err.message === "Invalid credentials") {
      return next(createError(err.message, 401));
    }
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
