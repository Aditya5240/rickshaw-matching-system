// controllers/driverController.js
// Driver registration, status, and seat management

const driverService = require("../services/driverService");
const { createError } = require("../middleware/errorHandler");

/**
 * POST /api/drivers/register
 * Registers a new driver or re-registers.
 */
const registerDriver = async (req, res, next) => {
  try {
    const { name, vehicleNumber, totalSeats } = req.body;

    if (!name || !vehicleNumber) {
      return next(createError("name and vehicleNumber are required", 400));
    }

    const driver = await driverService.registerDriver({ name, vehicleNumber, totalSeats });
    res.status(201).json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers
 * Returns all online drivers.
 */
const getOnlineDrivers = async (req, res, next) => {
  try {
    const drivers = await driverService.getOnlineDrivers();
    res.status(200).json({ success: true, data: drivers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers/:driverId
 * Returns a specific driver profile.
 */
const getDriverById = async (req, res, next) => {
  try {
    const driver = await driverService.getDriverById(req.params.driverId);
    res.status(200).json({ success: true, data: driver });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/drivers/:driverId/status
 * Driver goes online or offline.
 */
const setDriverStatus = async (req, res, next) => {
  try {
    const { isOnline } = req.body;
    if (typeof isOnline !== "boolean") {
      return next(createError("isOnline must be a boolean", 400));
    }

    const result = await driverService.setDriverStatus(req.params.driverId, isOnline);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/drivers/:driverId/seats
 * Manually update available seats.
 */
const updateSeats = async (req, res, next) => {
  try {
    const { seats } = req.body;
    if (seats === undefined || seats < 0) {
      return next(createError("seats must be a non-negative number", 400));
    }

    const result = await driverService.updateAvailableSeats(req.params.driverId, seats);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerDriver, getOnlineDrivers, getDriverById, setDriverStatus, updateSeats };
