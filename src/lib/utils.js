import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Serializes Firestore data to plain JSON.
 * Converts Timestamps to ISO strings.
 */
export function serializeFirestoreData(data) {
  if (!data) return null;

  // Recursively handle objects and arrays
  if (Array.isArray(data)) {
    return data.map(serializeFirestoreData);
  }

  if (typeof data === 'object' && data !== null) {
    // Check if it's a Firestore Timestamp (has toMillis method or similar structure)
    // Firestore Admin SDK Timestamp: _seconds, _nanoseconds, toDate(), toMillis()
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString();
    }
    // Handle classic checking if 'toDate' isn't available but structure matches
    if ('_seconds' in data && '_nanoseconds' in data) {
      return new Date(data._seconds * 1000 + data._nanoseconds / 1000000).toISOString();
    }

    // Handle plain objects
    const plain = {};
    for (const key in data) {
      plain[key] = serializeFirestoreData(data[key]);
    }
    return plain;
  }

  return data;
}
