'use server';

import { requireUser, verifyUserPermissions, verifyStructureAdmin, verifySuperAdmin } from '@/utils/server-auth';
import { collections, serializeFirestoreDoc } from '@/utils/database';
import { logger } from '@/utils/logger';
import { logResourceModification, logAdminAction } from '@/utils/audit';
import { serializeFirestoreData } from '@/lib/utils';
import { AccessTypes as DefaultAccessTypes } from '@/components/Anagrafica/AccessDialog/AccessTypes';

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

/**
 * Get categories for a structure, with fallback to defaults.
 * Any user with access to the structure can view categories.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<Array>} Array of category objects
 */
export async function getStructureCategories(structureId) {
    try {
        const { userUid } = await requireUser();

        // Verify user has access to this structure
        await verifyUserPermissions({ userUid, structureId });

        const docRef = collections.structures().doc(structureId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            logger.warn('Structure not found for categories', { structureId });
            // Return defaults if structure doesn't exist
            return serializeFirestoreData(DefaultAccessTypes);
        }

        const data = docSnap.data();

        // Return structure's custom categories or fall back to defaults
        if (data.accessCategories && Array.isArray(data.accessCategories) && data.accessCategories.length > 0) {
            return serializeFirestoreData(data.accessCategories);
        }

        return serializeFirestoreData(DefaultAccessTypes);
    } catch (error) {
        logger.error('Error fetching structure categories', error, { structureId });
        // Return defaults on error to avoid breaking the UI
        return serializeFirestoreData(DefaultAccessTypes);
    }
}

/**
 * Update all categories for a structure.
 * Requires Structure Admin or Super Admin.
 *
 * @param {string} structureId - ID of the structure
 * @param {Array} categories - Array of category objects
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStructureCategories(structureId, categories) {
    try {
        const { userUid } = await requireUser();

        // Verify user is admin of this structure
        await verifyStructureAdmin({ userUid, structureId });

        // Validate categories structure
        if (!Array.isArray(categories)) {
            throw new Error('Categories must be an array');
        }

        for (const cat of categories) {
            if (!cat.value || !cat.label) {
                throw new Error('Each category must have a value and label');
            }
            if (!Array.isArray(cat.subCategories)) {
                throw new Error('Each category must have a subCategories array');
            }
        }

        // Update Firestore
        await collections.structures().doc(structureId).update({
            accessCategories: categories,
            updatedAt: new Date(),
            updatedBy: userUid,
        });

        // Log the modification
        await logResourceModification({
            actorUid: userUid,
            resourceType: 'structure',
            resourceId: structureId,
            action: 'update_categories',
            details: { categoryCount: categories.length }
        });

        logger.info('Structure categories updated', { structureId, userUid, categoryCount: categories.length });

        return { success: true };
    } catch (error) {
        logger.error('Error updating structure categories', error, { structureId });
        return { success: false, error: error.message };
    }
}

/**
 * Add a single subcategory to a structure's category.
 * This is used when users add a new subcategory via "Altro".
 * Any user with access to the structure can add subcategories.
 *
 * @param {string} structureId - ID of the structure
 * @param {string} categoryValue - The value of the category to add to
 * @param {string} newSubcategory - The new subcategory to add
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addSubcategoryToStructure(structureId, categoryValue, newSubcategory) {
    try {
        const { userUid } = await requireUser();

        // Verify user has access to this structure
        await verifyUserPermissions({ userUid, structureId });

        if (!newSubcategory || typeof newSubcategory !== 'string' || !newSubcategory.trim()) {
            throw new Error('Invalid subcategory');
        }

        const trimmedSubcategory = newSubcategory.trim();

        const docRef = collections.structures().doc(structureId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            throw new Error('Structure not found');
        }

        const data = docSnap.data();

        // Get current categories or initialize from defaults
        let categories = data.accessCategories;
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            // Deep clone defaults
            categories = JSON.parse(JSON.stringify(DefaultAccessTypes));
        }

        // Find the category and add the subcategory
        const categoryIndex = categories.findIndex(cat => cat.value === categoryValue);
        if (categoryIndex === -1) {
            throw new Error(`Category "${categoryValue}" not found`);
        }

        // Check if subcategory already exists (case-insensitive)
        const existingSubcats = categories[categoryIndex].subCategories || [];
        const alreadyExists = existingSubcats.some(
            sub => sub.toLowerCase() === trimmedSubcategory.toLowerCase()
        );

        if (alreadyExists) {
            // Not an error, just return success
            return { success: true, alreadyExists: true };
        }

        // Add the new subcategory (before "Altro" if it exists)
        const altroIndex = existingSubcats.findIndex(sub => sub === 'Altro');
        if (altroIndex !== -1) {
            existingSubcats.splice(altroIndex, 0, trimmedSubcategory);
        } else {
            existingSubcats.push(trimmedSubcategory);
        }

        categories[categoryIndex].subCategories = existingSubcats;

        // Update Firestore
        await docRef.update({
            accessCategories: categories,
            updatedAt: new Date(),
            updatedBy: userUid,
        });

        logger.info('Subcategory added to structure', {
            structureId,
            categoryValue,
            newSubcategory: trimmedSubcategory,
            userUid
        });

        return { success: true, subcategory: trimmedSubcategory };
    } catch (error) {
        logger.error('Error adding subcategory to structure', error, {
            structureId,
            categoryValue,
            newSubcategory
        });
        return { success: false, error: error.message };
    }
}

/**
 * Reset structure categories to defaults.
 * Requires Structure Admin or Super Admin.
 *
 * @param {string} structureId - ID of the structure
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetStructureCategoriesToDefaults(structureId) {
    try {
        const { userUid } = await requireUser();

        // Verify user is admin of this structure
        await verifyStructureAdmin({ userUid, structureId });

        // Deep clone defaults
        const defaultCategories = JSON.parse(JSON.stringify(DefaultAccessTypes));

        // Update Firestore
        await collections.structures().doc(structureId).update({
            accessCategories: defaultCategories,
            updatedAt: new Date(),
            updatedBy: userUid,
        });

        // Log the modification
        await logResourceModification({
            actorUid: userUid,
            resourceType: 'structure',
            resourceId: structureId,
            action: 'reset_categories',
            details: { resetToDefaults: true }
        });

        logger.info('Structure categories reset to defaults', { structureId, userUid });

        return { success: true };
    } catch (error) {
        logger.error('Error resetting structure categories', error, { structureId });
        return { success: false, error: error.message };
    }
}

/**
 * Creates a new structure.
 * Requires Super Admin privileges.
 *
 * @param {Object} data - Structure data
 * @param {string} data.name - Structure name (required)
 * @param {string} [data.email] - Structure email
 * @param {string} [data.address] - Structure address
 * @param {string} [data.city] - Structure city
 * @param {string} [data.phone] - Structure phone
 * @param {string} [data.description] - Structure description
 * @returns {Promise<{success: boolean, structureId?: string, error?: string}>}
 */
export async function createStructure(data) {
    try {
        const { userUid } = await requireUser();

        // Only super admins can create structures
        await verifySuperAdmin({ userUid });

        // Validate required fields
        if (!data || !data.name || typeof data.name !== 'string' || !data.name.trim()) {
            return { success: false, error: 'Structure name is required' };
        }

        const structureData = {
            name: data.name.trim(),
            email: data.email?.trim() || '',
            address: data.address?.trim() || '',
            city: data.city?.trim() || '',
            phone: data.phone?.trim() || '',
            description: data.description?.trim() || '',
            admins: [],
            accessCategories: JSON.parse(JSON.stringify(DefaultAccessTypes)),
            createdAt: new Date(),
            createdBy: userUid,
            updatedAt: new Date(),
            updatedBy: userUid,
        };

        // Create the structure document
        const docRef = await collections.structures().add(structureData);

        // Log the action
        await logAdminAction({
            action: 'create_structure',
            actorUid: userUid,
            details: { structureId: docRef.id, name: structureData.name }
        });

        logger.info('Created new structure', { actorUid: userUid, structureId: docRef.id, name: structureData.name });

        return { success: true, structureId: docRef.id };
    } catch (error) {
        logger.error('Error creating structure', error);
        return { success: false, error: error.message };
    }
}
