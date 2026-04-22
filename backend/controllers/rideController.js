// controllers/rideController.js
// Handles HTTP requests for ride lifecycle

const matchingService = require("../services/matchingService");
const { createError } = require("../middleware/errorHandler");

/**
 * POST /api/rides
 * Passenger creates a new ride request.
 */
const requestRide = async (req, res, next) => {
  try {
    const { passengerId, passengerName, pickupStop, destinationStop, seats } = req.body;

    if (!passengerId || !passengerName || !pickupStop || !destinationStop) {
      return next(createError("Missing required fields: passengerId, passengerName, pickupStop, destinationStop", 400));
    }

    if (pickupStop === destinationStop) {
      return next(createError("Pickup and destination stops must be different", 400));
    }

    const ride = await matchingService.createRideRequest({
      passengerId,
      passengerName,
      pickupStop,
      destinationStop,
      seats: seats || 1,
    });

    // Emit to all connected drivers via socket (injected on req)
    if (req.io) {
      req.io.emit("ride_request_broadcast", ride);
    }

    res.status(201).json({ success: true, data: ride });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/rides/:rideId/accept
 * Driver accepts a ride request.
 */
const acceptRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { driverId, driverName, vehicleNumber } = req.body;

    if (!driverId || !driverName) {
      return next(createError("Missing required fields: driverId, driverName", 400));
    }

    const updatedRide = await matchingService.acceptRideRequest(rideId, {
      driverId,
      driverName,
      vehicleNumber,
    });

    // Notify the specific passenger and all drivers about the update
    if (req.io) {
      req.io.emit("ride_update", updatedRide);
      req.io.emit("driver_accept", {
        rideId,
        passengerId: updatedRide.passengerId,
        driverName,
        vehicleNumber,
        eta: updatedRide.eta,
      });
    }

    res.status(200).json({ success: true, data: updatedRide });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/rides/:rideId/cancel
 * Passenger cancels a ride request.
 */
const cancelRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const result = await matchingService.cancelRideRequest(rideId);

    if (req.io) {
      req.io.emit("ride_update", { id: rideId, status: "cancelled" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/rides/:rideId/complete
 * Driver completes a ride request.
 */
const completeRide = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return next(createError("Missing required fields: driverId", 400));
    }

    const result = await matchingService.completeRideRequest(rideId, driverId);

    if (req.io) {
      req.io.emit("ride_update", { id: rideId, status: "completed" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rides/pending
 * Returns all pending ride requests (for drivers dashboard).
 */
const getPendingRides = async (req, res, next) => {
  try {
    const rides = await matchingService.getPendingRideRequests();
    res.status(200).json({ success: true, data: rides });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rides/:rideId
 * Returns a single ride request by ID.
 */
const getRideById = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const ride = await matchingService.getRideById(rideId);
    res.status(200).json({ success: true, data: ride });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rides/driver/:driverId/active
 * Returns all active (accepted) rides for a driver.
 */
const getActiveDriverRides = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const rides = await matchingService.getActiveRidesForDriver(driverId);
    res.status(200).json({ success: true, data: rides });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rides/passenger/:passengerId/active
 * Returns an active ride (pending/accepted/completed) for a passenger.
 */
const getActivePassengerRide = async (req, res, next) => {
  try {
    const { passengerId } = req.params;
    const ride = await matchingService.getActiveRideForPassenger(passengerId);
    res.status(200).json({ success: true, data: ride });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  requestRide, 
  acceptRide, 
  cancelRide, 
  completeRide, 
  getPendingRides, 
  getRideById,
  getActiveDriverRides,
  getActivePassengerRide
};
