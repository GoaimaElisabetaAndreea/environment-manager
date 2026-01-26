require('dotenv').config();
const admin = require("firebase-admin");

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
    serviceAccount = JSON.parse(buffer.toString('utf-8'));
  } 
  else {
    throw new Error("Firebase credentials missing in .env");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET // for the storage of files in share secret
  });

} catch (error) {
  console.error("Firebase Initialization Error:", error.message);
  process.exit(1);
}

const db = admin.firestore();

module.exports = { admin, db };