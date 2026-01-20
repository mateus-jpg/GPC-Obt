'use server';

import { requireUser, verifyUserPermissions, verifyStructureAdmin } from '@/utils/server-auth';
import { collections, serializeFirestoreDoc } from '@/utils/database';
import { logger } from '@/utils/logger';
import { logResourceModification } from '@/utils/audit';
import { serializeFirestoreData } from '@/lib/utils';

/**
 * Retrieves structure information.
 * Requires the user to have permission (either Structure Admin or Super Admin).
 * 
 * @param {string} structureId - ID of the structure to retrieve
 * @returns {Promise<Object>} Structure data
 * @throws {Error} If user lacks permissions or structure not found
 */
export async function getStructure(structureId) {
    try {
        const { userUid } = await requireUser();

        // Verify user has access to this structure
        await verifyUserPermissions({ userUid, structureId });

        const docRef = collections.structures().doc(structureId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            logger.warn('Structure not found', { structureId, userUid });
            throw new Error('Structure not found');
        }

        const data = docSnap.data();
        if (data.createdAt) delete data.createdAt; // Temporary safety if serialize fails

        return serializeFirestoreData({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        logger.error('Error fetching structure', error, { structureId });
        throw new Error('Failed to fetch structure');
    }
}

/**
 * Updates structure information.
 * Requires the user to be a Structure Administrator or Super Admin.
 * 
 * @param {string} structureId - ID of the structure to update
 * @param {Object} data - Data to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStructure(structureId, data) {
    try {
        const { userUid } = await requireUser();

        // Verify user has access to this structure
        await verifyUserPermissions({ userUid, structureId });

        // Validate data (basic validation)
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data provided');
        }

        // Update Firestore
        await collections.structures().doc(structureId).update({
            ...data,
            updatedAt: new Date(),
            updatedBy: userUid,
        });

        // Log the modification
        await logResourceModification({
            actorUid: userUid,
            resourceType: 'structure',
            resourceId: structureId,
            action: 'update',
            details: { updatedFields: Object.keys(data) }
        });

        logger.info('Structure updated', { structureId, userUid });

        return { success: true };
    } catch (error) {
        logger.error('Error updating structure', error, { structureId });
        return { success: false, error: error.message };
    }
}

/**
 * Retrieves users who have access to a specific structure.
 * Returns their basic info and whether they are an admin of that structure.
 * 
 * @param {string} structureId - ID of the structure
 * @returns {Promise<Array>} List of users with access to the structure
 * @throws {Error} If user lacks permissions or structure not found
 */
export async function getUsersByStructure(structureId) {
    try {
        const { userUid } = await requireUser();

        // Verify the requester is allowed to view this structure's users
        await verifyStructureAdmin({ userUid, structureId });

        // 1. Get the Structure to check who is an admin
        const structureRef = collections.structures().doc(structureId);
        const structureSnap = await structureRef.get();

        if (!structureSnap.exists) {
            logger.warn('Structure not found', { structureId });
            throw new Error("Structure not found");
        }

        const structureData = structureSnap.data();
        const structureAdmins = structureData.admins || [];

        // 2. Query users (operators) who have this structureId in their list
        const usersQuery = collections.users()
            .where('structureIds', 'array-contains', structureId);

        const usersSnap = await usersQuery.get();

        // Also check 'operators' collection
        const operatorsQuery = collections.operators()
            .where('structureIds', 'array-contains', structureId);
        const operatorsSnap = await operatorsQuery.get();

        // Map and deduplicate users
        const userMap = new Map();

        const processSnapshot = (snap) => {
            snap.forEach(doc => {
                const data = doc.data();
                userMap.set(doc.id, {
                    uid: doc.id,
                    email: data.email,
                    displayName: data.displayName,
                    role: data.role || 'user',
                    isStructureAdmin: structureAdmins.includes(doc.id),
                    structureIds: data.structureIds || []
                });
            });
        };

        processSnapshot(usersSnap);
        processSnapshot(operatorsSnap);

        const users = Array.from(userMap.values());
        logger.info('Retrieved structure users', { structureId, userCount: users.length });

        return serializeFirestoreData(users);

    } catch (error) {
        logger.error('Error fetching structure users', error, { structureId });
        throw new Error('Failed to fetch users for structure.');
    }
}

/**
 * Toggles a user's admin status for a specific structure.
 * 
 * @param {string} structureId - ID of the structure
 * @param {string} targetUid - UID of user to toggle admin status for
 * @param {boolean} shouldBeAdmin - Whether user should be an admin
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function toggleStructureAdminStatus(structureId, targetUid, shouldBeAdmin) {
    try {
        const { userUid } = await requireUser();

        // Verify the requester is allowed to modify structure admins
        await verifyStructureAdmin({ userUid, structureId });

        const structureRef = collections.structures().doc(structureId);
        const structureSnap = await structureRef.get();

        if (!structureSnap.exists) {
            logger.warn('Structure not found', { structureId });
            throw new Error("Structure not found");
        }

        const structureData = structureSnap.data();
        const currentAdmins = structureData.admins || [];

        let newAdmins = [...currentAdmins];

        if (shouldBeAdmin) {
            if (!newAdmins.includes(targetUid)) {
                newAdmins.push(targetUid);
            }
        } else {
            newAdmins = newAdmins.filter(id => id !== targetUid);
        }

        await structureRef.update({
            admins: newAdmins,
            updatedAt: new Date(),
            updatedBy: userUid
        });

        // Log the permission change
        await logResourceModification({
            actorUid: userUid,
            resourceType: 'structure',
            resourceId: structureId,
            action: shouldBeAdmin ? 'add_admin' : 'remove_admin',
            details: { targetUid, newAdmins }
        });

        logger.info('Toggled structure admin status', {
            structureId,
            targetUid,
            shouldBeAdmin,
            actorUid: userUid
        });

        return { success: true };

    } catch (error) {
        logger.error('Error toggling structure admin', error, { structureId, targetUid });
        return { success: false, error: error.message };
    }
}
