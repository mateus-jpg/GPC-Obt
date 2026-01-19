/**
 * Unified database access utilities
 * Provides consistent patterns for accessing Firestore collections
 */

import admin from '@/lib/firebase/firebaseAdmin';

const db = admin.firestore();

/**
 * Gets a user document, checking operators collection first, then users collection as fallback
 * This standardizes the dual-collection pattern used throughout the application
 * 
 * @param {string} userId - The UID of the user to fetch
 * @returns {Promise<{exists: boolean, data: Object|null, collection: string|null}>}
 */
export async function getUserDocument(userId) {
    if (!userId) {
        throw new Error('userId is required');
    }

    // Check operators collection first (primary)
    let userDoc = await db.collection('operators').doc(userId).get();

    if (userDoc.exists) {
        return {
            exists: true,
            data: { uid: userId, ...userDoc.data() },
            collection: 'operators'
        };
    }

    // Fallback to users collection
    userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
        return {
            exists: true,
            data: { uid: userId, ...userDoc.data() },
            collection: 'users'
        };
    }

    return {
        exists: false,
        data: null,
        collection: null
    };
}

/**
 * Checks if two arrays have any common elements
 * Useful for permission checking with structure IDs
 * 
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {boolean} True if arrays have at least one common element
 */
export function arraysIntersect(a = [], b = []) {
    const set = new Set(a || []);
    return (b || []).some(x => set.has(x));
}

/**
 * Safely serializes Firestore document data
 * Converts Timestamps and other Firestore types to plain JavaScript
 * 
 * @param {Object} data - Data to serialize
 * @returns {Object} Serialized data safe for JSON stringification
 */
export function serializeFirestoreDoc(data) {
    if (!data) return null;

    const serialized = {};

    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            serialized[key] = value;
        } else if (value instanceof admin.firestore.Timestamp) {
            serialized[key] = value.toDate().toISOString();
        } else if (Array.isArray(value)) {
            serialized[key] = value.map(item =>
                item instanceof admin.firestore.Timestamp
                    ? item.toDate().toISOString()
                    : item
            );
        } else if (typeof value === 'object' && value.constructor === Object) {
            serialized[key] = serializeFirestoreDoc(value);
        } else {
            serialized[key] = value;
        }
    }

    return serialized;
}

/**
 * Gets a Firestore collection reference
 * Centralizes collection name management
 */
export const collections = {
    operators: () => db.collection('operators'),
    users: () => db.collection('users'),
    structures: () => db.collection('structures'),
    anagrafica: () => db.collection('anagrafica'),
    auditLogs: () => db.collection('audit_logs'),
};
