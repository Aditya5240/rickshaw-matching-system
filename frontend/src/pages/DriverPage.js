// src/pages/DriverPage.js
// Driver: sees live incoming ride requests, accepts them, manages seat count

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { fetchPendingRides, acceptRide, completeRide, setDriverStatus, fetchActiveRidesForDriver } from "../services/api";
import { getSocket, SOCKET_EVENTS } from "../services/socket";
import EditProfileModal from "../components/EditProfileModal";

const DriverPage = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const [pendingRides, setPendingRides] = useState([]);
  const [acceptedRides, setAcceptedRides] = useState([]);
  const [availableSeats, setAvailableSeats] = useState(user.totalSeats || 3);
  const [isOnline, setIsOnline]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [acceptingId, setAcceptingId]   = useState(null); // which ride is being accepted
  const [error, setError]               = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ── Load initial pending rides and active rides ───────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [rides, activeRides] = await Promise.all([
        fetchPendingRides(),
        fetchActiveRidesForDriver(user.id)
      ]);
      setPendingRides(rides);
      setAcceptedRides(activeRides);
      
      // Calculate remaining available seats
      const consumedSeats = activeRides.reduce((sum, r) => sum + r.seats, 0);
      setAvailableSeats(Math.max(0, (user.totalSeats || 3) - consumedSeats));
    } catch {
      setError("Failed to load initial data.");
    }
  }, [user.id, user.totalSeats]);

  useEffect(() => { loadData(); }, [loadData]);

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
      if (data.status === "accepted" || data.status === "cancelled" || data.status === "completed") {
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
    const rideToAccept = pendingRides.find(r => r.id === rideId);
    if (rideToAccept && rideToAccept.seats > availableSeats) {
      setError(`Cannot accept. Ride requires ${rideToAccept.seats} seats but you only have ${availableSeats}.`);
      return;
    }

    setAcceptingId(rideId);
    setError("");
    try {
      const updated = await acceptRide(rideId, {
        driverId: user.id,
        driverName: user.name,
        vehicleNumber: user.vehicleNumber,
      });
      setAcceptedRides((prev) => [updated, ...prev]);
      setAvailableSeats((prev) => prev - updated.seats);
      setPendingRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (err) {
      setError(err.response?.data?.error || "Could not accept ride. It may already be taken or you lack seats.");
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Complete a ride ─────────────────────────────────────────────────────────
  const handleComplete = async (rideId) => {
    try {
      await completeRide(rideId, { driverId: user.id });
      const completedRide = acceptedRides.find(r => r.id === rideId);
      if (completedRide) {
        setAvailableSeats((prev) => Math.min(user.totalSeats, prev + completedRide.seats));
      }
      setAcceptedRides((prev) => prev.filter((r) => r.id !== rideId));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete ride.");
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
                💺 {availableSeats} / {user.totalSeats} seat(s) available
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
        {acceptedRides.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--success)' }}>
            <div className="card-title" style={{ margin: 0, padding: 0, border: 'none', color: 'var(--success)', marginBottom: '1rem' }}>
              Currently Active Rides
            </div>
            {acceptedRides.map(ride => (
              <div className="alert alert-success" style={{ margin: '0.5rem 0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }} key={ride.id}>
                <div>
                  ✅ <strong>{ride.passengerName}</strong>
                  &nbsp;({ride.seats} 💺) | {ride.pickupStop} → {ride.destinationStop}
                </div>
                <button
                  className="btn btn-success btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => handleComplete(ride.id)}
                >
                  Complete Ride
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Pending ride requests list ────────────────────────────── */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <div className="card-title" style={{ margin: 0, border: "none", padding: 0 }}>
              Incoming Requests
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => loadData()}>
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
                  disabled={acceptingId !== null}
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

        <div style={{display: 'flex', gap: '10px', marginTop: '1rem'}}>
          <button className="btn btn-ghost btn-full" onClick={() => setIsEditModalOpen(true)}>
            ✏️ Edit Profile
          </button>
          <button className="btn btn-ghost btn-full" onClick={handleLogout}>
            ← Logout
          </button>
        </div>
      </div>
      <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
    </div>
  );
};

export default DriverPage;
