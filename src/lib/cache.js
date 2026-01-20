/**
 * Cache configuration and utilities for GPC application
 * Uses Next.js unstable_cache for server-side data caching
 */

import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';

/**
 * Cache tag generators for consistent cache key naming
 * Tags are used for targeted cache invalidation
 */
export const CACHE_TAGS = {
  // Anagrafica
  anagrafica: (id) => `anagrafica-${id}`,
  anagraficaList: (structureId) => `anagrafica-list-${structureId}`,

  // Structures
  structure: (id) => `structure-${id}`,

  // User/Operator profiles
  userProfile: (uid) => `user-${uid}`,

  // Access records (services)
  accessi: (anagraficaId) => `accessi-${anagraficaId}`,

  // Events
  eventi: (anagraficaId) => `eventi-${anagraficaId}`,
};

/**
 * Revalidation times in seconds
 * Short TTLs ensure data freshness while reducing Firestore queries
 */
export const REVALIDATE = {
  userProfile: 300,      // 5 minutes
  structure: 600,        // 10 minutes
  anagraficaList: 60,    // 1 minute
  anagraficaDetail: 120, // 2 minutes
  accessi: 60,           // 1 minute
  eventi: 60,            // 1 minute
};

/**
 * Helper to invalidate all cache tags related to an anagrafica record
 * Call this after any mutation to ensure data consistency
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string[]} structureIds - Array of structure IDs that can access this record
 */
export function invalidateAnagraficaCaches(anagraficaId, structureIds = []) {
  // Invalidate the specific anagrafica detail cache
  revalidateTag(CACHE_TAGS.anagrafica(anagraficaId));

  // Invalidate accessi and eventi caches for this anagrafica
  revalidateTag(CACHE_TAGS.accessi(anagraficaId));
  revalidateTag(CACHE_TAGS.eventi(anagraficaId));

  // Invalidate all affected structure list caches
  for (const structureId of structureIds) {
    revalidateTag(CACHE_TAGS.anagraficaList(structureId));
  }
}

/**
 * Helper to invalidate access-related caches
 * @param {string} anagraficaId - The anagrafica document ID
 */
export function invalidateAccessiCache(anagraficaId) {
  revalidateTag(CACHE_TAGS.accessi(anagraficaId));
}

/**
 * Helper to invalidate event-related caches
 * @param {string} anagraficaId - The anagrafica document ID
 */
export function invalidateEventiCache(anagraficaId) {
  revalidateTag(CACHE_TAGS.eventi(anagraficaId));
}

/**
 * Creates a cached version of a data fetching function
 * Wrapper around unstable_cache with consistent error handling
 * @param {Function} fn - The data fetching function to cache
 * @param {string[]} keyParts - Cache key parts for unique identification
 * @param {Object} options - Cache options (tags, revalidate)
 */
export function createCachedFetcher(fn, keyParts, options = {}) {
  return unstable_cache(
    fn,
    keyParts,
    {
      revalidate: options.revalidate || 60,
      tags: options.tags || [],
    }
  );
}
