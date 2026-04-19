// routes/rideRoutes.js
const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");

// Middleware to inject Socket.IO instance into req object
const injectSocket = (io) => (req, res, next) => {
  req.io = io;
  next();
};

module.exports = (io) => {
  router.get("/pending", rideController.getPendingRides);
  router.get("/:rideId", rideController.getRideById);
  router.post("/", injectSocket(io), rideController.requestRide);
  router.put("/:rideId/accept", injectSocket(io), rideController.acceptRide);
  router.put("/:rideId/cancel", injectSocket(io), rideController.cancelRide);

  return router;
};
