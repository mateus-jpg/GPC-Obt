'use server';

import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, REVALIDATE } from '@/lib/cache';

/**
 * Fetches anagrafica list for a structure with caching
 * Permission checks are performed at the page/component level
 */
async function fetchAnagraficaListFromDb(structureId) {
  const admin = (await import("@/lib/firebase/firebaseAdmin")).default;
  const snap = await admin
    .firestore()
    .collection("anagrafica")
    .where("canBeAccessedBy", "array-contains", structureId)
    .where("deleted", "!=", true)
    .get();

  const snapshot = snap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      ...JSON.parse(JSON.stringify(d)),
    };
  });
  return snapshot;
}

/**
 * Gets cached anagrafica list for a structure
 * Cache is automatically invalidated when anagrafica records are mutated
 * @param {string} structure - The structure ID to fetch records for
 */
export async function getData(structure) {
  const getCachedData = unstable_cache(
    async () => fetchAnagraficaListFromDb(structure),
    [`anagrafica-list`, structure],
    {
      tags: [CACHE_TAGS.anagraficaList(structure)],
      revalidate: REVALIDATE.anagraficaList,
    }
  );

  const data = await getCachedData();
  return JSON.stringify(data);
}
