// src/pages/PassengerPage.js
// Passenger: select stops, request ride, receive real-time acceptance notification

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { createRideRequest, cancelRide, fetchActiveRideForPassenger } from "../services/api";
import { getSocket, SOCKET_EVENTS } from "../services/socket";
import EditProfileModal from "../components/EditProfileModal";

const PassengerPage = () => {
  const { user, stops, stopsLoading, logout } = useApp();
  const navigate = useNavigate();

  const [pickupStop, setPickupStop]           = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [seats, setSeats]                     = useState(1);
  const [activeRide, setActiveRide]           = useState(null); // current ride request
  const [notification, setNotification]       = useState(null); // driver acceptance info
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    // Join passenger's personal room
    socket.emit(SOCKET_EVENTS.JOIN_AS_PASSENGER, { passengerId: user.id });

    // Listen for driver acceptance
    const onDriverAccept = (data) => {
      if (data.passengerId === user.id) {
        setNotification(data);
        setActiveRide((prev) => prev ? { ...prev, status: "accepted" } : prev);
      }
    };

    // Listen for any general ride update (e.g. cancelled by driver)
    const onRideUpdate = (data) => {
      if (activeRide && data.id === activeRide.id) {
        setActiveRide((prev) => ({ ...prev, ...data }));
      }
    };

    socket.on(SOCKET_EVENTS.DRIVER_ACCEPT, onDriverAccept);
    socket.on(SOCKET_EVENTS.RIDE_UPDATE, onRideUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.DRIVER_ACCEPT, onDriverAccept);
      socket.off(SOCKET_EVENTS.RIDE_UPDATE, onRideUpdate);
    };
  }, [user.id, activeRide?.id]);

  // ── Load active ride on start ─────────────────────────────────────────────
  useEffect(() => {
    const loadActiveRide = async () => {
      try {
        const ride = await fetchActiveRideForPassenger(user.id);
        if (ride) {
          setActiveRide(ride);
        }
      } catch (err) {
        console.error("Failed to recover active ride:", err);
      }
    };
    loadActiveRide();
  }, [user.id]);

  // ── Request ride ─────────────────────────────────────────────────────────
  const handleRequestRide = async (e) => {
    e.preventDefault();
    setError("");

    if (!pickupStop || !destinationStop) { setError("Please select both stops."); return; }
    if (pickupStop === destinationStop)  { setError("Pickup and destination must differ."); return; }

    setLoading(true);
    try {
      const ride = await createRideRequest({
        passengerId: user.id,
        passengerName: user.name,
        pickupStop,
        destinationStop,
        seats: Number(seats),
      });
      setActiveRide(ride);
      setNotification(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send ride request.");
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel ride ──────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!activeRide) return;
    try {
      await cancelRide(activeRide.id);
      setActiveRide(null);
      setNotification(null);
    } catch (err) {
      setError("Failed to cancel ride.");
    }
  };

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <div>
      <div className="page-header">
        <h1>🧍 Passenger Dashboard</h1>
        <span>{user.name}</span>
      </div>

      <div className="container">
        {/* ── Notification Banner ─────────────────────────────────── */}
        {notification && (
          <div className="alert alert-success">
            🛺 <strong>{notification.driverName}</strong> accepted your ride!
            &nbsp;Vehicle: <strong>{notification.vehicleNumber}</strong>
            &nbsp;· ETA: <strong>{notification.eta}</strong>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* ── Active Ride Card ────────────────────────────────────── */}
        {activeRide && (
          <div className="card">
            <div className="card-title">Your Active Ride</div>
            <div className="ride-item">
              <div className="ride-item-header">
                <div className="ride-route">
                  {activeRide.pickupStop}
                  <span className="arrow">→</span>
                  {activeRide.destinationStop}
                </div>
                <span className={`badge badge-${activeRide.status}`}>{activeRide.status}</span>
              </div>
              <div className="ride-meta">
                <span>👤 {activeRide.passengerName}</span>
                <span>💺 {activeRide.seats} seat(s)</span>
                {activeRide.driverName && <span>🛺 {activeRide.driverName}</span>}
                {activeRide.eta       && <span>⏱ ETA: {activeRide.eta}</span>}
              </div>
              {activeRide.status === "pending" && (
                <button className="btn btn-danger btn-sm" onClick={handleCancel}>
                  Cancel Ride
                </button>
              )}
              {(activeRide.status === "accepted" || activeRide.status === "completed") && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setActiveRide(null); setNotification(null); }}
                >
                  {activeRide.status === "completed" ? "Trip Ended — Book Another Ride" : "Dismiss (Hide Active Trip)"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Request Form ─────────────────────────────────────────── */}
        {!activeRide && (
          <div className="card">
            <div className="card-title">Request a Ride</div>
            {stopsLoading ? (
              <p className="text-muted">Loading stops...</p>
            ) : stops.length === 0 ? (
              <div className="alert alert-info">No stops available. Ask admin to add stops.</div>
            ) : (
              <form onSubmit={handleRequestRide}>
                <div className="form-group">
                  <label>Pickup Stop</label>
                  <select value={pickupStop} onChange={(e) => setPickupStop(e.target.value)}>
                    <option value="">-- Select pickup --</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Destination Stop</label>
                  <select value={destinationStop} onChange={(e) => setDestinationStop(e.target.value)}>
                    <option value="">-- Select destination --</option>
                    {stops
                      .filter((s) => s.name !== pickupStop)
                      .map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Number of Seats</label>
                  <select value={seats} onChange={(e) => setSeats(e.target.value)}>
                    {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                  {loading ? <><span className="spinner" /> &nbsp;Requesting…</> : "🛺 Request Ride"}
                </button>
              </form>
            )}
          </div>
        )}

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

export default PassengerPage;
