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

  // Reduce driver's available seats
  const driverRef = db.ref(`drivers/${driverData.driverId}`);
  const driverSnap = await driverRef.once("value");
  if (driverSnap.exists()) {
    const currentSeats = driverSnap.val().availableSeats || 0;
    const newSeats = Math.max(0, currentSeats - ride.seats);
    await driverRef.update({ availableSeats: newSeats });
  }

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

module.exports = {
  createRideRequest,
  acceptRideRequest,
  cancelRideRequest,
  getPendingRideRequests,
  getRideById,
};
