'use server';

import { unstable_cache } from 'next/cache';
import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { createAccessInternal } from './access';
import { CACHE_TAGS, REVALIDATE, invalidateAnagraficaCaches } from '@/lib/cache';

const adminDb = admin.firestore();

/**
 * Internal function to fetch anagrafica from database
 * Used by cached wrapper
 */
async function fetchAnagraficaFromDb(anagraficaId) {
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    return null;
  }

  const data = anagraficaSnap.data();
  return {
    id: anagraficaSnap.id,
    ...JSON.parse(JSON.stringify(data)),
  };
}

/**
 * Internal function to get anagrafica with caching
 * Can be called from both server actions and API routes
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} userUid - The user UID for permission check
 * @returns {Object} The anagrafica data
 * @throws {Error} If not found or access denied
 */
export async function getAnagraficaInternal(anagraficaId, userUid) {
  // Get cached data first (faster)
  const getCachedAnagrafica = unstable_cache(
    async () => fetchAnagraficaFromDb(anagraficaId),
    [`anagrafica`, anagraficaId],
    {
      tags: [CACHE_TAGS.anagrafica(anagraficaId)],
      revalidate: REVALIDATE.anagraficaDetail,
    }
  );
  
  const anagraficaData = await getCachedAnagrafica();

  if (!anagraficaData) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Check soft delete
  if (anagraficaData.deletedAt) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const allowedStructures = anagraficaData.canBeAccessedBy || [];

  // Permission check is NOT cached - always runs fresh for security
  await verifyUserPermissions({
    userUid,
    allowedStructures
  });

  return anagraficaData;
}

/**
 * Internal function to update anagrafica
 * Can be called from both server actions and API routes
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {Object} body - The update data (should be pre-validated)
 * @param {string} userUid - The user UID
 * @param {string} userMail - The user email (optional)
 * @param {string} structureId - The structure ID making the update (optional)
 * @returns {Object} The updated anagrafica data
 */
export async function updateAnagraficaInternal(anagraficaId, body, userUid, userMail = null, structureId = null) {
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const anagraficaData = anagraficaSnap.data();

  // Check soft delete
  if (anagraficaData.deletedAt) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const allowedStructures = anagraficaData.canBeAccessedBy || [];

  // Check access
  await verifyUserPermissions({
    userUid,
    allowedStructures
  });

  const updateData = {
    ...body,
    updatedAt: new Date(),
    updatedBy: userUid,
  };

  if (userMail) {
    updateData.updatedByMail = userMail;
  }
  if (structureId) {
    updateData.updatedByStructure = structureId;
  }

  await anagraficaRef.update(updateData);

  // Invalidate caches after successful update
  invalidateAnagraficaCaches(anagraficaId, allowedStructures);

  const updatedSnap = await anagraficaRef.get();
  return { id: updatedSnap.id, ...updatedSnap.data() };
}

/**
 * Internal function to soft delete anagrafica
 * Can be called from both server actions and API routes
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} userUid - The user UID
 * @returns {Object} Success result
 */
export async function deleteAnagraficaInternal(anagraficaId, userUid) {
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();

  if (!anagraficaSnap.exists) {
    const error = new Error('Anagrafica not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const anagraficaData = anagraficaSnap.data();

  // Already deleted
  if (anagraficaData.deletedAt) {
    const error = new Error('Anagrafica already deleted');
    error.code = 'ALREADY_DELETED';
    throw error;
  }

  const allowedStructures = anagraficaData.canBeAccessedBy || [];

  // Check access
  await verifyUserPermissions({
    userUid,
    allowedStructures
  });

  await anagraficaRef.update({
    deletedAt: new Date(),
    deletedBy: userUid,
    deleted: true,
  });

  // Invalidate caches after successful delete
  invalidateAnagraficaCaches(anagraficaId, allowedStructures);

  return { success: true, message: 'Scheda eliminata con successo' };
}

/**
 * Crea una nuova anagrafica (con eventuali accessi e file)
 */
export async function createAnagrafica(body, services = []) {
  try {
    // 1. AUTHENTICATION
    const { userUid } = await requireUser();

    // 2. PERMISSION CHECK (User must belong to the registering structure)
    await verifyUserPermissions({
      userUid,
      structureId: body.registeredByStructure
    });

    // 3. ANAGRAFICA DOCUMENT CREATION
    let anagraficaId;
    let docData;
    try {
      docData = {
        ...body,
        canBeAccessedBy: body.canBeAccessedBy || [body.registeredByStructure],
        structureIds: body.canBeAccessedBy || [body.registeredByStructure],
        registeredBy: userUid,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await adminDb.collection('anagrafica').add(docData);
      anagraficaId = docRef.id;
    } catch (createErr) {
      console.error('[DB ANAGRAFICA CREATION ERROR]:', createErr);
      throw new Error(`Failed to create Anagrafica record: ${createErr.message}`);
    }

    // 4. SERVICES & FILE PROCESSING
    if (services && services.length > 0) {
      try {
        await createAccessInternal({
          anagraficaId,
          services,
          structureId: body.registeredByStructure,
          userUid,
          structureIds: docData.structureIds,
        });
      } catch (Error) {
        console.error("Error creating Acesso", Error);
        return JSON.stringify({
          error: true,
          message: Error.message
        }, null, 2);
      }
    }

    // 5. INVALIDATE CACHES for all structures that can access this record
    invalidateAnagraficaCaches(anagraficaId, docData.canBeAccessedBy || []);

    return JSON.stringify({ id: anagraficaId });

  } catch (globalErr) {
    console.error('[CREATE_ANAGRAFICA FATAL]:', globalErr.stack);
    return JSON.stringify({
      error: true,
      message: globalErr.message
    }, null, 2);
  }
}

/**
 * Recupera l'anagrafica con caching (Server Action)
 * Permission check runs fresh on every call (not cached)
 */
export async function getAnagrafica(anagraficaId) {
  const { userUid } = await requireUser();
  const anagraficaData = await getAnagraficaInternal(anagraficaId, userUid);
  return JSON.stringify(anagraficaData);
}

/**
 * Update anagrafica (Server Action)
 */
export async function updateAnagrafica(anagraficaId, body, structureId) {
  const { userUid, headers: hdr } = await requireUser();
  const userMail = hdr.get('x-user-mail');
  const result = await updateAnagraficaInternal(anagraficaId, body, userUid, userMail, structureId);
  return JSON.stringify(result);
}

/**
 * Soft delete dell'anagrafica (Server Action)
 */
export async function deleteAnagrafica(anagraficaId) {
  const { userUid } = await requireUser();
  return await deleteAnagraficaInternal(anagraficaId, userUid);
}
