'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { createAccessInternal } from './access';
import { headers } from 'next/headers';

const adminDb = admin.firestore();

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
 * Recupera l’anagrafica
 */
export async function getAnagrafica(anagraficaId) {
  const { userUid } = await requireUser();

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = { id: anagraficaSnap.id, ...anagraficaSnap.data() };
  const allowedStructures = anagraficaData.canBeAccessedBy || [];

  // Check access
  await verifyUserPermissions({
    userUid,
    allowedStructures
  });

  return JSON.stringify(anagraficaData);
}


export async function updateAnagrafica(anagraficaId, body, structureId) {
  const { userUid, headers: hdr } = await requireUser();
  const userMail = hdr.get('x-user-mail');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data();
  const allowedStructures = anagraficaData.canBeAccessedBy || [];

  // Check access
  await verifyUserPermissions({
    userUid,
    allowedStructures
  });

  await anagraficaRef.update({
    ...body,
    updatedAt: new Date(),
    updatedBy: userUid,
    updatedByMail: userMail,
    updatedByStructure: structureId
  });

  const updatedSnap = await anagraficaRef.get();
  return JSON.stringify({ id: updatedSnap.id, ...updatedSnap.data() });
}

/**
 * Soft delete dell’anagrafica
 */
export async function deleteAnagrafica(anagraficaId) {
  const { userUid } = await requireUser();

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data();
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

  return { success: true, message: 'Scheda eliminata con successo' };
}