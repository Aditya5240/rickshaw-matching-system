// src/services/socket.js
// Singleton Socket.IO client — shared across the entire app

import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

let socket = null;

/**
 * Returns (or creates) the singleton socket instance.
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });
  }
  return socket;
};

/**
 * Disconnects and clears the socket instance.
 * Call on logout or unmount of root component.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ── Socket event name constants (prevents typos) ──────────────────────────
export const SOCKET_EVENTS = {
  CONNECTED: "connected",
  JOINED: "joined",
  JOIN_AS_DRIVER: "join_as_driver",
  JOIN_AS_PASSENGER: "join_as_passenger",
  DRIVER_GOING_OFFLINE: "driver_going_offline",
  RIDE_REQUEST_BROADCAST: "ride_request_broadcast",
  DRIVER_ACCEPT: "driver_accept",
  RIDE_UPDATE: "ride_update",
};
