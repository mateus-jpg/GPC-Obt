/**
 * Migration Script: Split Anagrafica into Global + Structure Data
 *
 * Old format (single 'anagrafica' document with everything flat):
 *   { nome, cognome, sesso, ..., nucleoFamiliare: {...}, legaleAbitativa: {...}, ..., canBeAccessedBy: [...] }
 *
 * New format (split into two collections, personal info nested):
 *   anagrafica/{id}:        { anagrafica: { nome, cognome, sesso, ... }, canBeAccessedBy: [...] }
 *   anagrafica_data/{auto}: { anagraficaId, structureId, nucleoFamiliare: {...}, legaleAbitativa: {...}, ... }
 *
 * What this script does:
 *   1. Finds all 'anagrafica' docs that have personal or structure fields flat at root level
 *   2. Nests personal fields under an 'anagrafica' key in the document
 *   3. For each structure in canBeAccessedBy, creates an 'anagrafica_data' doc (if not already present)
 *   4. Removes the old flat fields from the 'anagrafica' doc
 *
 * Usage:
 *   DRY RUN (preview only, no changes):
 *     node -r dotenv/config src/scripts/migrateAnagraficaSplit.js
 *
 *   EXECUTE (actually write to Firestore):
 *     node -r dotenv/config src/scripts/migrateAnagraficaSplit.js --execute
 *
 *   With limit:
 *     node -r dotenv/config src/scripts/migrateAnagraficaSplit.js --execute --limit=50
 */

import admin from '../lib/firebase/firebaseAdmin.js';

const db = admin.firestore();

// Personal fields that should be nested under 'anagrafica' key
const PERSONAL_FIELDS = [
  'nome', 'cognome', 'sesso', 'dataDiNascita', 'luogoDiNascita',
  'codiceFiscale', 'cittadinanza', 'comuneDiDomicilio', 'telefono', 'email',
];

// Structure-specific field groups that should live in anagrafica_data
const STRUCTURE_FIELDS = [
  'nucleoFamiliare',
  'legaleAbitativa',
  'lavoroFormazione',
  'vulnerabilita',
  'referral',
  'notes',
];

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

async function migrateAnagraficaSplit() {
  console.log('='.repeat(60));
  console.log('  Anagrafica Split Migration');
  console.log('='.repeat(60));
  console.log(`  Mode:  ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'EXECUTE (writing to Firestore)'}`);
  console.log(`  Limit: ${LIMIT || 'none (all documents)'}`);
  console.log('='.repeat(60));
  console.log();

  const stats = {
    total: 0,
    needsMigration: 0,
    alreadyMigrated: 0,
    personalFieldsNested: 0,
    dataDocsCreated: 0,
    dataDocsSkipped: 0,
    errors: 0,
  };

  try {
    let query = db.collection('anagrafica');
    if (LIMIT > 0) {
      query = query.limit(LIMIT);
    }

    const snapshot = await query.get();
    stats.total = snapshot.size;

    console.log(`Found ${stats.total} anagrafica documents to inspect.\n`);

    if (snapshot.empty) {
      console.log('No documents found. Nothing to do.');
      return stats;
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const anagraficaId = doc.id;

      // Detect flat personal fields at root (= old format, needs nesting)
      const flatPersonalFields = PERSONAL_FIELDS.filter(f => data[f] !== undefined);
      // Detect structure fields at root (= needs moving to anagrafica_data)
      const structureFieldsPresent = STRUCTURE_FIELDS.filter(f => data[f] !== undefined);

      // Already has nested 'anagrafica' key and no flat fields -> already migrated
      if (flatPersonalFields.length === 0 && structureFieldsPresent.length === 0) {
        stats.alreadyMigrated++;
        continue;
      }

      stats.needsMigration++;
      const structures = data.canBeAccessedBy || data.structureIds || [];
      const displayName = data.nome || data.anagrafica?.nome || '?';
      const displaySurname = data.cognome || data.anagrafica?.cognome || '?';

      console.log(`[${anagraficaId}] ${displayName} ${displaySurname}`);

      // --- Step A: Nest personal fields under 'anagrafica' key ---
      if (flatPersonalFields.length > 0) {
        console.log(`  Flat personal fields: ${flatPersonalFields.join(', ')}`);

        const anagraficaNested = data.anagrafica || {};
        for (const field of flatPersonalFields) {
          anagraficaNested[field] = data[field];
        }

        // Build update: set nested 'anagrafica' + delete flat fields
        const updatePayload = { anagrafica: anagraficaNested };
        for (const field of flatPersonalFields) {
          updatePayload[field] = admin.firestore.FieldValue.delete();
        }

        if (!DRY_RUN) {
          try {
            await doc.ref.update(updatePayload);
            console.log(`  Nested ${flatPersonalFields.length} personal fields under 'anagrafica'`);
          } catch (err) {
            console.error(`  ERROR nesting personal fields:`, err.message);
            stats.errors++;
          }
        } else {
          console.log(`  Would nest ${flatPersonalFields.length} fields under 'anagrafica' and remove from root`);
        }
        stats.personalFieldsNested++;
      }

      // --- Step B: Move structure fields to anagrafica_data ---
      if (structureFieldsPresent.length > 0) {
        console.log(`  Structure fields: ${structureFieldsPresent.join(', ')}`);
        console.log(`  Structures: ${structures.length > 0 ? structures.join(', ') : '(none)'}`);

        const structurePayload = {};
        for (const field of structureFieldsPresent) {
          structurePayload[field] = data[field];
        }

        // Create anagrafica_data for each structure
        for (const structureId of structures) {
          try {
            const existing = await db.collection('anagrafica_data')
              .where('anagraficaId', '==', anagraficaId)
              .where('structureId', '==', structureId)
              .limit(1)
              .get();

            if (!existing.empty) {
              console.log(`  [${structureId}] anagrafica_data already exists -> skip`);
              stats.dataDocsSkipped++;
              continue;
            }

            const newDoc = {
              anagraficaId,
              structureId,
              ...structurePayload,
              status: 'Active',
              updatedAt: data.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
              updatedBy: data.registeredBy || 'migration-script',
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
              createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            };

            if (!DRY_RUN) {
              const ref = await db.collection('anagrafica_data').add(newDoc);
              console.log(`  [${structureId}] Created anagrafica_data: ${ref.id}`);
            } else {
              console.log(`  [${structureId}] Would create anagrafica_data with ${Object.keys(structurePayload).length} groups`);
            }
            stats.dataDocsCreated++;
          } catch (err) {
            console.error(`  [${structureId}] ERROR creating anagrafica_data:`, err.message);
            stats.errors++;
          }
        }

        // Delete structure fields from anagrafica doc
        const fieldsToDelete = {};
        for (const field of structureFieldsPresent) {
          fieldsToDelete[field] = admin.firestore.FieldValue.delete();
        }

        if (!DRY_RUN) {
          try {
            await doc.ref.update(fieldsToDelete);
            console.log(`  Removed ${structureFieldsPresent.length} structure fields from anagrafica doc`);
          } catch (err) {
            console.error(`  ERROR removing structure fields:`, err.message);
            stats.errors++;
          }
        } else {
          console.log(`  Would remove structure fields: ${structureFieldsPresent.join(', ')}`);
        }
      }

      console.log();
    }
  } catch (error) {
    console.error('Fatal error during migration:', error);
    stats.errors++;
  }

  return stats;
}

// Run
migrateAnagraficaSplit()
  .then((stats) => {
    console.log('='.repeat(60));
    console.log('  Migration Summary');
    console.log('='.repeat(60));
    console.log(`  Total documents inspected:     ${stats.total}`);
    console.log(`  Already migrated (no-op):      ${stats.alreadyMigrated}`);
    console.log(`  Needed migration:              ${stats.needsMigration}`);
    console.log(`  Personal fields nested:        ${stats.personalFieldsNested}`);
    console.log(`  anagrafica_data created:       ${stats.dataDocsCreated}`);
    console.log(`  anagrafica_data skipped:       ${stats.dataDocsSkipped}`);
    console.log(`  Errors:                        ${stats.errors}`);
    console.log('='.repeat(60));

    if (DRY_RUN && stats.needsMigration > 0) {
      console.log('\n  This was a DRY RUN. To execute, re-run with --execute');
      console.log('  Example: node -r dotenv/config src/scripts/migrateAnagraficaSplit.js --execute\n');
    }

    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
