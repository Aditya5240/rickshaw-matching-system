// src/services/api.js
// Centralized Axios instance for all REST API calls

import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ── Stops ──────────────────────────────────────────────────────────────────
export const fetchStops = () => api.get("/api/stops").then((r) => r.data.data);
export const addStop = (name, description) =>
  api.post("/api/stops", { name, description }).then((r) => r.data.data);
export const deleteStop = (stopId) =>
  api.delete(`/api/stops/${stopId}`).then((r) => r.data.data);

// ── Rides ─────────────────────────────────────────────────────────────────
export const createRideRequest = (payload) =>
  api.post("/api/rides", payload).then((r) => r.data.data);
export const fetchPendingRides = () =>
  api.get("/api/rides/pending").then((r) => r.data.data);
export const acceptRide = (rideId, driverPayload) =>
  api.put(`/api/rides/${rideId}/accept`, driverPayload).then((r) => r.data.data);
export const cancelRide = (rideId) =>
  api.put(`/api/rides/${rideId}/cancel`).then((r) => r.data.data);
export const fetchRideById = (rideId) =>
  api.get(`/api/rides/${rideId}`).then((r) => r.data.data);

// ── Drivers ───────────────────────────────────────────────────────────────
export const registerDriver = (payload) =>
  api.post("/api/drivers/register", payload).then((r) => r.data.data);
export const setDriverStatus = (driverId, isOnline) =>
  api.put(`/api/drivers/${driverId}/status`, { isOnline }).then((r) => r.data.data);
export const updateDriverSeats = (driverId, seats) =>
  api.put(`/api/drivers/${driverId}/seats`, { seats }).then((r) => r.data.data);

export default api;
