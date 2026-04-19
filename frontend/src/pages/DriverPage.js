// src/pages/DriverPage.js
// Driver: sees live incoming ride requests, accepts them, manages seat count

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fetchPendingRides, acceptRide, setDriverStatus } from "../services/api";
import { getSocket, SOCKET_EVENTS } from "../services/socket";

const DriverPage = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const [pendingRides, setPendingRides] = useState([]);
  const [acceptedRide, setAcceptedRide] = useState(null);
  const [isOnline, setIsOnline]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [acceptingId, setAcceptingId]   = useState(null); // which ride is being accepted
  const [error, setError]               = useState("");

  // ── Load initial pending rides ───────────────────────────────────────────
  const loadPendingRides = useCallback(async () => {
    try {
      const rides = await fetchPendingRides();
      setPendingRides(rides);
    } catch {
      setError("Failed to load ride requests.");
    }
  }, []);

  useEffect(() => { loadPendingRides(); }, [loadPendingRides]);

  // ── Socket setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.JOIN_AS_DRIVER, { driverId: user.id, driverName: user.name });

    // New ride request broadcast → add to list
const onNewRide = (ride) => {
  setPendingRides((prev) => {
    const exists = prev.find((r) => r.id === ride.id);
    return exists ? prev : [ride, ...prev];
  });

  // Browser Push Notification
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification("🛺 New Ride Request!", {
        body: `${ride.pickupStop} → ${ride.destinationStop} | ${ride.seats} seat(s) | ${ride.passengerName}`,
        icon: "/favicon.ico",
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          new Notification("🛺 New Ride Request!", {
            body: `${ride.pickupStop} → ${ride.destinationStop} | ${ride.seats} seat(s) | ${ride.passengerName}`,
            icon: "/favicon.ico",
          });
        }
      });
    }
  }
};

    // Ride update (accepted/cancelled by someone else) → remove from list
    const onRideUpdate = (data) => {
      if (data.status === "accepted" || data.status === "cancelled") {
        setPendingRides((prev) => prev.filter((r) => r.id !== data.id));
      }
    };

    socket.on(SOCKET_EVENTS.RIDE_REQUEST_BROADCAST, onNewRide);
    socket.on(SOCKET_EVENTS.RIDE_UPDATE, onRideUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.RIDE_REQUEST_BROADCAST, onNewRide);
      socket.off(SOCKET_EVENTS.RIDE_UPDATE, onRideUpdate);
    };
  }, [user.id, user.name]);

  // ── Accept a ride ─────────────────────────────────────────────────────────
  const handleAccept = async (rideId) => {
    setAcceptingId(rideId);
    setError("");
    try {
      const updated = await acceptRide(rideId, {
        driverId: user.id,
        driverName: user.name,
        vehicleNumber: user.vehicleNumber,
      });
      setAcceptedRide(updated);
      setPendingRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (err) {
      setError(err.response?.data?.error || "Could not accept ride. It may already be taken.");
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Online / Offline toggle ───────────────────────────────────────────────
const handleToggleOnline = async () => {
  // Request notification permission when going online
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }

  const newStatus = !isOnline;
  try {
    await setDriverStatus(user.id, newStatus);
    setIsOnline(newStatus);
    if (!newStatus) {
      getSocket().emit(SOCKET_EVENTS.DRIVER_GOING_OFFLINE, { driverId: user.id });
    }
  } catch {
    setError("Failed to update status.");
  }
};

  const handleLogout = async () => {
    try { await setDriverStatus(user.id, false); } catch {}
    logout();
    navigate("/");
  };

  return (
    <div>
      <div className="page-header">
        <h1>🛺 Driver Dashboard</h1>
        <span>{user.name} · {user.vehicleNumber}</span>
      </div>

      <div className="container">
        {/* ── Status bar ────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex-between">
            <div>
              <strong>Status: </strong>
              <span style={{ color: isOnline ? "var(--success)" : "var(--text-muted)" }}>
                {isOnline ? "🟢 Online" : "⚫ Offline"}
              </span>
              <span className="text-muted" style={{ marginLeft: "1rem" }}>
                💺 {user.totalSeats} seat(s) total
              </span>
            </div>
            <button
              className={`btn btn-sm ${isOnline ? "btn-danger" : "btn-success"}`}
              onClick={handleToggleOnline}
            >
              {isOnline ? "Go Offline" : "Go Online"}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Accepted ride summary ─────────────────────────────────── */}
        {acceptedRide && (
          <div className="alert alert-success">
            ✅ You accepted: <strong>{acceptedRide.passengerName}</strong>
            &nbsp;| {acceptedRide.pickupStop} → {acceptedRide.destinationStop}
            &nbsp;| ETA: <strong>{acceptedRide.eta}</strong>
            &nbsp;
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={() => setAcceptedRide(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Pending ride requests list ────────────────────────────── */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <div className="card-title" style={{ margin: 0, border: "none", padding: 0 }}>
              Incoming Requests
            </div>
            <button className="btn btn-ghost btn-sm" onClick={loadPendingRides}>
              ↻ Refresh
            </button>
          </div>

          {!isOnline && (
            <div className="alert alert-info">You are offline. Go online to see and accept rides.</div>
          )}

          {isOnline && pendingRides.length === 0 && (
            <div className="empty-state">
              <p>No pending ride requests</p>
              <p className="text-muted mt-1">New requests will appear here in real-time</p>
            </div>
          )}

          {isOnline &&
            pendingRides.map((ride) => (
              <div className="ride-item" key={ride.id}>
                <div className="ride-item-header">
                  <div className="ride-route">
                    {ride.pickupStop}
                    <span className="arrow">→</span>
                    {ride.destinationStop}
                  </div>
                  <span className="badge badge-pending">Pending</span>
                </div>
                <div className="ride-meta">
                  <span>👤 {ride.passengerName}</span>
                  <span>💺 {ride.seats} seat(s)</span>
                  <span>🕐 {new Date(ride.createdAt).toLocaleTimeString()}</span>
                </div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleAccept(ride.id)}
                  disabled={acceptingId === ride.id}
                >
                  {acceptingId === ride.id ? (
                    <><span className="spinner" /> Accepting…</>
                  ) : (
                    "✓ Accept Ride"
                  )}
                </button>
              </div>
            ))}
        </div>

        <button className="btn btn-ghost btn-full" onClick={handleLogout}>
          ← Logout
        </button>
      </div>
    </div>
  );
};

export default DriverPage;
