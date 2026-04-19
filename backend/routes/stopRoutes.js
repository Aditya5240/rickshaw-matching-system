// routes/stopRoutes.js
const express = require("express");
const router = express.Router();
const stopController = require("../controllers/stopController");

router.get("/", stopController.getStops);
router.post("/", stopController.addStop);
router.delete("/:stopId", stopController.removeStop);

module.exports = router;
