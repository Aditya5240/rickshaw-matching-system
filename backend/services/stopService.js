// services/stopService.js
// Manages predefined stops (bus-stop-like locations)

const { getDb } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");

/**
 * Returns all stops from Firebase.
 */
const getAllStops = async () => {
  const db = getDb();
  const snapshot = await db.ref("stops").once("value");
  const data = snapshot.val() || {};
  return Object.values(data);
};

/**
 * Adds a new stop.
 * @param {object} stopData - { name, description }
 */
const addStop = async (stopData) => {
  const db = getDb();
  const stopId = uuidv4();

  const stop = {
    id: stopId,
    name: stopData.name.trim(),
    description: stopData.description || "",
    createdAt: Date.now(),
  };

  await db.ref(`stops/${stopId}`).set(stop);
  return stop;
};

/**
 * Removes a stop by ID.
 */
const removeStop = async (stopId) => {
  const db = getDb();
  const snapshot = await db.ref(`stops/${stopId}`).once("value");
  if (!snapshot.exists()) throw new Error("Stop not found");

  await db.ref(`stops/${stopId}`).remove();
  return { id: stopId, deleted: true };
};

module.exports = { getAllStops, addStop, removeStop };
