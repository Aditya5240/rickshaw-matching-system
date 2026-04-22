// src/services/api.js
// Centralized Axios instance for all REST API calls

import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: automatically logout user on 401
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Could also trigger a window route reload here if needed
    }
    return Promise.reject(error);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const registerAuth = (payload) => api.post("/api/auth/register", payload).then((r) => r.data.data);
export const loginAuth = (payload) => api.post("/api/auth/login", payload).then((r) => r.data.data);
export const fetchMyProfile = () => api.get("/api/auth/me").then((r) => r.data.data);
export const updateMyProfile = (payload) => api.put("/api/auth/profile", payload).then((r) => r.data.data);

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
export const completeRide = (rideId, driverPayload) =>
  api.put(`/api/rides/${rideId}/complete`, driverPayload).then((r) => r.data.data);
export const fetchRideById = (rideId) =>
  api.get(`/api/rides/${rideId}`).then((r) => r.data.data);
export const fetchActiveRidesForDriver = (driverId) =>
  api.get(`/api/rides/driver/${driverId}/active`).then((r) => r.data.data);
export const fetchActiveRideForPassenger = (passengerId) =>
  api.get(`/api/rides/passenger/${passengerId}/active`).then((r) => r.data.data);

// ── Drivers ───────────────────────────────────────────────────────────────
export const registerDriver = (payload) =>
  api.post("/api/drivers/register", payload).then((r) => r.data.data);
export const setDriverStatus = (driverId, isOnline) =>
  api.put(`/api/drivers/${driverId}/status`, { isOnline }).then((r) => r.data.data);
export const updateDriverSeats = (driverId, seats) =>
  api.put(`/api/drivers/${driverId}/seats`, { seats }).then((r) => r.data.data);

export default api;
