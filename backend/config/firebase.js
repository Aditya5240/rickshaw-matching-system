// config/firebase.js
// Initializes Firebase Admin SDK and exports the Realtime Database reference

const admin = require("firebase-admin");

let db;

const initFirebase = () => {
  if (admin.apps.length > 0) return; // Prevent re-initialization

  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
};

const getDb = () => {
  if (!db) {
    initFirebase();
    db = admin.database();
  }
  return db;
};

module.exports = { getDb, initFirebase };
