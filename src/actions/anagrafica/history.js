'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { logger } from '@/utils/logger';

const adminDb = admin.firestore();

/**
 * Create a history entry for an anagrafica change
 * @param {Object} params - History entry parameters
 * @param {string} params.anagraficaId - The anagrafica document ID
 * @param {string} params.changeType - Type of change ('create', 'update', 'delete')
 * @param {string[]} params.changedGroups - Array of group names that changed
 * @param {Object} params.changes - Object with before/after for each changed group
 * @param {string} params.userUid - User who made the change
 * @param {string} params.userMail - Email of user who made the change
 * @param {string} params.structureId - Structure from which change was made
 */
export async function createHistoryEntry({
  anagraficaId,
  changeType,
  changedGroups,
  changes,
  userUid,
  userMail = null,
  structureId = null
}) {
  try {
    const historyRef = adminDb
      .collection('anagrafica')
      .doc(anagraficaId)
      .collection('history');

    const historyEntry = {
      changedAt: new Date(),
      changedBy: userUid,
      changedByMail: userMail,
      changedByStructure: structureId,
      changeType,
      changedGroups,
      changes
    };

    await historyRef.add(historyEntry);

    logger.info('History entry created', {
      anagraficaId,
      changeType,
      changedGroups,
      userUid
    });

  } catch (error) {
    // Don't let history creation failures break the main operation
    logger.error('Failed to create history entry', error, {
      anagraficaId,
      changeType,
      changedGroups
    });
  }
}

/**
 * Get history entries for an anagrafica record
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {number} limit - Maximum number of entries to return (default 50)
 * @param {string} startAfter - Document ID to start after for pagination
 * @returns {Promise<Object>} Object with entries array and pagination info
 */
export async function getAnagraficaHistory(anagraficaId, limit = 50, startAfter = null) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this anagrafica
    const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
    const anagraficaSnap = await anagraficaRef.get();

    if (!anagraficaSnap.exists) {
      throw new Error('Anagrafica not found');
    }

    const anagraficaData = anagraficaSnap.data();
    const allowedStructures = anagraficaData.canBeAccessedBy || [];

    await verifyUserPermissions({
      userUid,
      allowedStructures
    });

    // Build query
    let query = anagraficaRef
      .collection('history')
      .orderBy('changedAt', 'desc')
      .limit(limit + 1); // Get one extra to check if there are more

    if (startAfter) {
      const startDoc = await anagraficaRef.collection('history').doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const snapshot = await query.get();
    const entries = [];
    let hasMore = false;

    snapshot.forEach((doc, index) => {
      if (index < limit) {
        const data = doc.data();
        entries.push({
          id: doc.id,
          ...JSON.parse(JSON.stringify(data)),
          changedAt: data.changedAt?.toDate?.() || data.changedAt
        });
      } else {
        hasMore = true;
      }
    });

    return JSON.stringify({
      entries,
      hasMore,
      lastId: entries.length > 0 ? entries[entries.length - 1].id : null
    });

  } catch (error) {
    logger.error('Error fetching anagrafica history', error, { anagraficaId });
    throw error;
  }
}

/**
 * Get a single history entry with full details
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {string} historyId - The history entry ID
 * @returns {Promise<Object>} The history entry
 */
export async function getHistoryEntry(anagraficaId, historyId) {
  try {
    const { userUid } = await requireUser();

    // Verify user has access to this anagrafica
    const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
    const anagraficaSnap = await anagraficaRef.get();

    if (!anagraficaSnap.exists) {
      throw new Error('Anagrafica not found');
    }

    const anagraficaData = anagraficaSnap.data();
    const allowedStructures = anagraficaData.canBeAccessedBy || [];

    await verifyUserPermissions({
      userUid,
      allowedStructures
    });

    const historyRef = anagraficaRef.collection('history').doc(historyId);
    const historySnap = await historyRef.get();

    if (!historySnap.exists) {
      throw new Error('History entry not found');
    }

    const data = historySnap.data();
    return JSON.stringify({
      id: historySnap.id,
      ...JSON.parse(JSON.stringify(data)),
      changedAt: data.changedAt?.toDate?.() || data.changedAt
    });

  } catch (error) {
    logger.error('Error fetching history entry', error, { anagraficaId, historyId });
    throw error;
  }
}

