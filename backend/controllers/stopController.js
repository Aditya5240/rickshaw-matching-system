// controllers/stopController.js
// Admin-facing stop management

const stopService = require("../services/stopService");
const { createError } = require("../middleware/errorHandler");

/**
 * GET /api/stops
 * Returns all available stops.
 */
const getStops = async (req, res, next) => {
  try {
    const stops = await stopService.getAllStops();
    res.status(200).json({ success: true, data: stops });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/stops
 * Admin adds a new stop.
 */
const addStop = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      return next(createError("Stop name is required", 400));
    }

    const stop = await stopService.addStop({ name, description });
    res.status(201).json({ success: true, data: stop });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/stops/:stopId
 * Admin removes a stop.
 */
const removeStop = async (req, res, next) => {
  try {
    const { stopId } = req.params;
    const result = await stopService.removeStop(stopId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStops, addStop, removeStop };
