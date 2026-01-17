import { headers } from 'next/headers';
import admin from '@/lib/firebase/firebaseAdmin';

const adminDb = admin.firestore();

/**
 * Extracts the user UID from headers.
 * Throws an error if not found.
 */
export async function requireUser() {
    const hdr = await headers();
    const userUid = hdr.get('x-user-uid');
    if (!userUid) {
        throw new Error('Unauthorized: Missing x-user-uid header');
    }
    return { userUid, headers: hdr };
}

/**
 * Verifies that the user (operator) exists and has access to the given structure/anagrafica.
 * Returns the operator data.
 */
export async function verifyUserPermissions({ userUid, structureId, allowedStructures = [] }) {
    let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
    if (!operatorDoc.exists) {
        operatorDoc = await adminDb.collection('users').doc(userUid).get();
    }

    if (!operatorDoc.exists) {
        throw new Error(`User ${userUid} not found in operators or users`);
    }

    const operatorData = operatorDoc.data();
    const userStructures = operatorData.structureIds || operatorData.structureId || [];

    // 1. If structureId is provided, check if user has access to this specific structure
    if (structureId && !userStructures.includes(structureId)) {
        throw new Error(`Forbidden: User does not have access to structure ${structureId}`);
    }

    // 2. If allowedStructures is provided (e.g. from an existing Anagrafica), check intersection
    if (allowedStructures.length > 0) {
        const hasAccess = allowedStructures.some(s => userStructures.includes(s));
        if (!hasAccess) {
            throw new Error('Forbidden: User does not have permission to access this resource');
        }
    }

    return { operatorData, userStructures };
}

/**
 * Helper to check intersection of two arrays
 */
export function arraysIntersect(a = [], b = []) {
    const set = new Set(a || []);
    return (b || []).some(x => set.has(x));
}
