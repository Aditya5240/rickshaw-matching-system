// services/authService.js
const { getDb } = require("../config/firebase");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const driverService = require("./driverService");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_change_me_in_production";
const JWT_EXPIRES_IN = "7d";

const registerUser = async (userData) => {
  const db = getDb();
  const { email, password, role, name, vehicleNumber, totalSeats } = userData;

  // Check if user already exists
  const usersRef = db.ref("users");
  const snapshot = await usersRef.orderByChild("email").equalTo(email).once("value");
  
  if (snapshot.exists()) {
    throw new Error("Email already in use");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const id = uuidv4();

  const userObj = {
    id,
    email,
    passwordHash,
    role,
    name,
    createdAt: Date.now()
  };

  if (role === "driver") {
    userObj.vehicleNumber = vehicleNumber;
    userObj.totalSeats = totalSeats;
    
    // Also register in drivers node for real-time tracking
    await driverService.registerDriver({
      id,
      name,
      vehicleNumber,
      totalSeats: Number(totalSeats)
    });
  }

  await db.ref(`users/${id}`).set(userObj);

  // Return user without password
  const { passwordHash: _, ...userSafe } = userObj;
  return userSafe;
};

const loginUser = async (email, password) => {
  const db = getDb();
  const usersRef = db.ref("users");
  const snapshot = await usersRef.orderByChild("email").equalTo(email).once("value");
  
  if (!snapshot.exists()) {
    throw new Error("Invalid credentials");
  }

  const usersData = snapshot.val();
  // Since email is unique, there will be only one key
  const id = Object.keys(usersData)[0];
  const user = usersData[id];

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const { passwordHash: _, ...userSafe } = user;
  
  // If driver, ensure they have a node in drivers db (could be cleared out)
  if (user.role === "driver") {
    try {
      await driverService.getDriverById(user.id);
    } catch {
      await driverService.registerDriver({
        id: user.id,
        name: user.name,
        vehicleNumber: user.vehicleNumber,
        totalSeats: user.totalSeats || 3
      });
    }
  }

  return { token, user: userSafe };
};

const getUserById = async (id) => {
  const db = getDb();
  const snapshot = await db.ref(`users/${id}`).once("value");
  if (!snapshot.exists()) {
    throw new Error("User not found");
  }
  const user = snapshot.val();
  const { passwordHash: _, ...userSafe } = user;
  return userSafe;
};

const updateProfile = async (id, updateData) => {
  const db = getDb();
  const userRef = db.ref(`users/${id}`);
  const snapshot = await userRef.once("value");
  
  if (!snapshot.exists()) {
    throw new Error("User not found");
  }

  const currentUser = snapshot.val();
  const newObj = { ...currentUser };

  if (updateData.name) newObj.name = updateData.name;
  
  if (currentUser.role === "driver") {
    if (updateData.vehicleNumber) newObj.vehicleNumber = updateData.vehicleNumber;
    if (updateData.totalSeats !== undefined) newObj.totalSeats = Number(updateData.totalSeats);
    
    // Update drivers DB
    const driverRef = db.ref(`drivers/${id}`);
    const driverSnap = await driverRef.once("value");
    if (driverSnap.exists()) {
      await driverRef.update({
        name: newObj.name,
        vehicleNumber: newObj.vehicleNumber,
        totalSeats: newObj.totalSeats
      });
    }
  }

  if (updateData.password) {
    const salt = await bcrypt.genSalt(10);
    newObj.passwordHash = await bcrypt.hash(updateData.password, salt);
  }

  await userRef.update(newObj);
  
  const { passwordHash: _, ...userSafe } = newObj;
  return userSafe;
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  JWT_SECRET
};
