// lib/firebaseAdmin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

export const auth = admin.auth();
export default admin;