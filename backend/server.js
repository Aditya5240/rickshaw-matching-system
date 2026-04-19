// server.js
// Entry point: sets up Express, Socket.IO, Firebase, and registers all routes

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const { initFirebase } = require("./config/firebase");
const { errorHandler } = require("./middleware/errorHandler");
const socketHandler = require("./sockets/socketHandler");

const stopRoutes = require("./routes/stopRoutes");
const driverRoutes = require("./routes/driverRoutes");
// rideRoutes is a factory function — needs io injected
const rideRoutesFactory = require("./routes/rideRoutes");

// Initialize Firebase before anything else
initFirebase();

const app = express();
const httpServer = http.createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────
app.use("/api/stops", stopRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/rides", rideRoutesFactory(io)); // inject io for real-time events

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────
socketHandler(io);

// ─── Error Handler (must be last) ─────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

// Export for testing
module.exports = { app, httpServer, io };
