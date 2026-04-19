// routes/driverRoutes.js
const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driverController");

router.post("/register", driverController.registerDriver);
router.get("/", driverController.getOnlineDrivers);
router.get("/:driverId", driverController.getDriverById);
router.put("/:driverId/status", driverController.setDriverStatus);
router.put("/:driverId/seats", driverController.updateSeats);

module.exports = router;
