// services/driverService.js
// Handles driver registration, status, and seat management

const { getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

/**
 * Registers or updates a driver profile.
 * @param {object} driverData - { name, vehicleNumber, totalSeats }
 */
const registerDriver = async (driverData) => {
  const db = getDb();
  const driverId = driverData.id || uuidv4();

  const driver = {
    id: driverId,
    name: driverData.name,
    vehicleNumber: driverData.vehicleNumber,
    totalSeats: driverData.totalSeats || 3,
    availableSeats: driverData.totalSeats || 3,
    isOnline: true,
    registeredAt: Date.now(),
  };

  await db.ref(`drivers/${driverId}`).set(driver);
  return driver;
};

/**
 * Fetches all online drivers.
 */
const getOnlineDrivers = async () => {
  const db = getDb();
  const snapshot = await db.ref("drivers").orderByChild("isOnline").equalTo(true).once("value");
  const data = snapshot.val() || {};
  return Object.values(data);
};

/**
 * Updates driver online/offline status.
 */
const setDriverStatus = async (driverId, isOnline) => {
  const db = getDb();
  const driverRef = db.ref(`drivers/${driverId}`);
  const snapshot = await driverRef.once("value");
  if (!snapshot.exists()) throw new Error("Driver not found");

  await driverRef.update({ isOnline });
  return { driverId, isOnline };
};

/**
 * Updates a driver's available seats.
 */
const updateAvailableSeats = async (driverId, seats) => {
  const db = getDb();
  await db.ref(`drivers/${driverId}`).update({ availableSeats: seats });
  return { driverId, availableSeats: seats };
};

/**
 * Gets a driver by ID.
 */
const getDriverById = async (driverId) => {
  const db = getDb();
  const snapshot = await db.ref(`drivers/${driverId}`).once("value");
  if (!snapshot.exists()) throw new Error("Driver not found");
  return snapshot.val();
};

module.exports = {
  registerDriver,
  getOnlineDrivers,
  setDriverStatus,
  updateAvailableSeats,
  getDriverById,
};
