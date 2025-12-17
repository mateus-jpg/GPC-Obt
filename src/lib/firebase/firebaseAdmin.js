// lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: "gs://" +process.env.FIREBASE_PROJECT_ID +  ".firebasestorage.app",
    });
}

export const auth = admin.auth();
export const db = admin.firestore();
export default admin;