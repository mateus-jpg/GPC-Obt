'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser } from '@/utils/server-auth';
import { computeGroupChanges } from '@/utils/anagraficaUtils';

const adminDb = admin.firestore();

/**
 * Migration Script: Split Anagrafica Data
 * Iterates through all anagrafica documents and creates corresponding structure-specific documents.
 * 
 * Usage: Call this action from a secure admin endpoint or run manually.
 */
export async function migrateAnagraficaStructure(limit = 100, dryRun = true) {
    try {
        const { userUid } = await requireUser();
        // Ideally check for SUPER ADMIN role here.

        console.log(`[MIGRATION] Starting migration execution. DryRun: ${dryRun}`);

        const snapshot = await adminDb.collection('anagrafica')
            .where('deleted', '==', false) // Only active ones
            // .where('migrationStatus', '!=', 'completed') // Uncomment if we track status
            .limit(limit)
            .get();

        if (snapshot.empty) {
            return { success: true, message: "No documents found to migrate." };
        }

        let stats = {
            processed: 0,
            migrated: 0,
            skipped: 0,
            errors: 0
        };

        const batchSize = 500; // Firestore batch limit required if using batch, but we might do individual due to complexity

        // Structure fields to move
        const STRUCTURE_FIELDS = [
            'nucleoFamiliare',
            'legaleAbitativa',
            'lavoroFormazione',
            'vulnerabilita',
            'referral',
            'notes', // assuming it exists
            // 'status' might be new
        ];

        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                const anagraficaId = doc.id;
                const structures = data.canBeAccessedBy || [];

                if (structures.length === 0) {
                    stats.skipped++;
                    continue;
                }

                // Prepare structure data payload
                const structurePayload = {};
                let hasStructureData = false;

                STRUCTURE_FIELDS.forEach(field => {
                    if (data[field] !== undefined) {
                        structurePayload[field] = data[field];
                        hasStructureData = true;
                    }
                });

                // If no structure data to migrate (pure identity?), just skip creation or create empty?
                // Better to create empty context to avoid "missing details" UI states if app expects them.
                // But if `hasStructureData` is false, it's just name/surname. 
                // Let's create it anyway so they have a state record.

                if (!dryRun) {
                    // For each structure that has access, create a data record
                    // Since currently all structures see the SAME data, we copy the SAME data to all of them.

                    await Promise.all(structures.map(async (structureId) => {
                        // Check if already exists
                        const q = await adminDb.collection('anagrafica_data')
                            .where('anagraficaId', '==', anagraficaId)
                            .where('structureId', '==', structureId)
                            .limit(1)
                            .get();

                        if (!q.empty) {
                            // Already exists, skip or update?
                            // Skip to avoid overwriting newer data if script matches again
                            return;
                        }

                        await adminDb.collection('anagrafica_data').add({
                            anagraficaId,
                            structureId,
                            ...structurePayload,
                            migratedAt: new Date(),
                            migratedBy: userUid,
                            updatedAt: data.updatedAt || new Date(), // Keep original timestamp if possible
                            status: 'Active'
                        });
                    }));

                    // Optional: Mark main doc as migrated
                    // await doc.ref.update({ migrationStatus: 'completed' });
                }

                stats.migrated++;
                stats.processed++;

            } catch (err) {
                console.error(`[MIGRATION] Error migrating doc ${doc.id}:`, err);
                stats.errors++;
            }
        }

        return {
            success: true,
            stats,
            message: `Migration run completed. Processed: ${stats.processed}, Migrated (docs): ${stats.migrated}`
        };

    } catch (error) {
        console.error("[MIGRATION] Fatal error:", error);
        return { success: false, error: error.message };
    }
}
