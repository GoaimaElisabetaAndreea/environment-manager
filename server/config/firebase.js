require('dotenv').config();
const admin = require("firebase-admin");

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const buffer = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64');
    serviceAccount = JSON.parse(buffer.toString('utf-8'));
  } 
  else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  } else {
    throw new Error("Firebase credentials missing in .env");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });

} catch (error) {
  console.error("Firebase Initialization Error:", error.message);
  process.exit(1);
}

const db = admin.firestore();

module.exports = { admin, db };