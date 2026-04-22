// services/matchingService.js
// Core ride-matching logic: broadcasting requests and assigning drivers

const { getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

/**
 * Creates a new ride request in Firebase under /rideRequests
 * @param {object} rideData - { passengerId, passengerName, pickupStop, destinationStop, seats }
 * @returns {object} - The created ride request
 */
const createRideRequest = async (rideData) => {
  const db = getDb();
  const rideId = uuidv4();

  const rideRequest = {
    id: rideId,
    passengerId: rideData.passengerId,
    passengerName: rideData.passengerName,
    pickupStop: rideData.pickupStop,
    destinationStop: rideData.destinationStop,
    seats: rideData.seats || 1,
    status: "pending", // pending | accepted | completed | cancelled
    createdAt: Date.now(),
    driverId: null,
    driverName: null,
    eta: null,
  };

  await db.ref(`rideRequests/${rideId}`).set(rideRequest);
  return rideRequest;
};

/**
 * Assigns a driver to a ride request.
 * Updates ride status to "accepted" and records driver details.
 * @param {string} rideId - ID of the ride request
 * @param {object} driverData - { driverId, driverName, availableSeats, vehicleNumber }
 * @returns {object} - Updated ride request
 */
const acceptRideRequest = async (rideId, driverData) => {
  const db = getDb();
  const rideRef = db.ref(`rideRequests/${rideId}`);

  const snapshot = await rideRef.once("value");
  if (!snapshot.exists()) {
    throw new Error("Ride request not found");
  }

  const ride = snapshot.val();
  if (ride.status !== "pending") {
    throw new Error("Ride request is no longer available");
  }

  // Use a Transaction to atomically reduce driver's available seats, preventing race conditions
  const driverRef = db.ref(`drivers/${driverData.driverId}`);
  
  const { committed, snapshot: postSnap } = await driverRef.transaction((driver) => {
    if (driver) {
      const currentSeats = driver.availableSeats || 0;
      if (ride.seats > currentSeats) {
        return; // Abort transaction
      }
      driver.availableSeats = currentSeats - ride.seats;
    }
    return driver;
  });

  if (!committed) {
    throw new Error("Not enough available seats");
  }

  // Mock ETA: random between 2 and 10 minutes
  const eta = Math.floor(Math.random() * 9) + 2;

  const updates = {
    status: "accepted",
    driverId: driverData.driverId,
    driverName: driverData.driverName,
    vehicleNumber: driverData.vehicleNumber || "N/A",
    eta: `${eta} min`,
    acceptedAt: Date.now(),
  };

  await rideRef.update(updates);

  return { ...ride, ...updates };
};

/**
 * Cancels a pending ride request.
 */
const cancelRideRequest = async (rideId) => {
  const db = getDb();
  const rideRef = db.ref(`rideRequests/${rideId}`);

  const snapshot = await rideRef.once("value");
  if (!snapshot.exists()) throw new Error("Ride request not found");

  await rideRef.update({ status: "cancelled", cancelledAt: Date.now() });
  return { id: rideId, status: "cancelled" };
};

/**
 * Fetches all pending ride requests.
 */
const getPendingRideRequests = async () => {
  const db = getDb();
  const snapshot = await db.ref("rideRequests").orderByChild("status").equalTo("pending").once("value");
  const data = snapshot.val() || {};
  return Object.values(data);
};

/**
 * Fetches a single ride request by ID.
 */
const getRideById = async (rideId) => {
  const db = getDb();
  const snapshot = await db.ref(`rideRequests/${rideId}`).once("value");
  if (!snapshot.exists()) throw new Error("Ride request not found");
  return snapshot.val();
};

/**
 * Completes an accepted ride request.
 * Updates ride status to "completed" and restores available seats.
 */
const completeRideRequest = async (rideId, driverId) => {
  const db = getDb();
  const rideRef = db.ref(`rideRequests/${rideId}`);

  const snapshot = await rideRef.once("value");
  if (!snapshot.exists()) throw new Error("Ride request not found");

  const ride = snapshot.val();
  if (ride.status !== "accepted") throw new Error("Ride request is not in progress");
  if (ride.driverId !== driverId) throw new Error("Not authorized to complete this ride");

  await rideRef.update({ status: "completed", completedAt: Date.now() });

  // Use Transaction to atomically restore driver's available seats
  const driverRef = db.ref(`drivers/${driverId}`);
  await driverRef.transaction((driver) => {
    if (driver) {
      const currentSeats = driver.availableSeats || 0;
      const totalSeats = driver.totalSeats || 3;
      driver.availableSeats = Math.min(totalSeats, currentSeats + ride.seats);
    }
    return driver;
  });

  return { id: rideId, status: "completed" };
};

/**
 * Fetches all accepted (active) rides for a specific driver.
 */
const getActiveRidesForDriver = async (driverId) => {
  const db = getDb();
  const snapshot = await db.ref("rideRequests").orderByChild("driverId").equalTo(driverId).once("value");
  const data = snapshot.val() || {};
  return Object.values(data).filter(r => r.status === "accepted");
};

/**
 * Fetches the active or recently completed ride for a passenger.
 */
const getActiveRideForPassenger = async (passengerId) => {
  const db = getDb();
  const snapshot = await db.ref("rideRequests").orderByChild("passengerId").equalTo(passengerId).once("value");
  const data = snapshot.val() || {};
  const activeRides = Object.values(data).filter(
    r => r.status === "pending" || r.status === "accepted"
  );
  
  if (activeRides.length === 0) return null;
  // Sort by newest first
  activeRides.sort((a, b) => b.createdAt - a.createdAt);
  return activeRides[0];
};

module.exports = {
  createRideRequest,
  acceptRideRequest,
  cancelRideRequest,
  completeRideRequest,
  getPendingRideRequests,
  getRideById,
  getActiveRidesForDriver,
  getActiveRideForPassenger,
};
