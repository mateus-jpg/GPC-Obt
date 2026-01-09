'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { headers } from 'next/headers';
import { randomUUID } from 'crypto';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

async function createAccessInternal({ anagraficaId, services, structureId, userUid, structureIds }) {
  const accessRef = adminDb.collection('accessi').doc();
  const accessId = accessRef.id;

  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const uploadedFiles = [];

    if (svc.files && svc.files.length > 0) {
      for (const a of svc.files) {
        const arrayBuffer = await a.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${a.filename}`;

        const fileRef = adminStorage.bucket().file(storagePath);
        await fileRef.save(buffer, { contentType: a.type, resumable: false });

        uploadedFiles.push({
          filename: a.filename,
          nome: a.name,
          tipo: a.type,
          dimensione: a.size,
          path: storagePath,
        });
      }
    }

    let reminderId = null;
    if (svc.reminderDate) {
      const reminderRef = adminDb.collection('eventi').doc();
      reminderId = reminderRef.id;

      await reminderRef.set({
        anagraficaId,
        structureId,
        accessId,
        serviceType: svc.tipoAccesso,
        date: svc.reminderDate,
        note: svc.note || '',
        createdBy: userUid,
        createdAt: new Date().toISOString(),
        status: 'pending',
        linkedToAccess: true
      });
    }

    return {
      tipoAccesso: svc.tipoAccesso || null,
      sottoCategorie: svc.sottoCategorie ?? null,
      altro: svc.altro ?? null,
      note: svc.note?.trim() || null,
      classificazione: svc.classificazione ?? null,
      enteRiferimento: svc.enteRiferimento ?? null,
      files: uploadedFiles || [],
      reminderDate: svc.reminderDate ?? null,
      reminderId: reminderId ?? null,
    };
  }));

  const accessData = {
    anagraficaId,
    services: processedServices,
    createdByStructure: structureId,
    createdBy: userUid,
    createdAt: new Date().toISOString(),
    structureIds,
  };

  await accessRef.set(accessData);
  return { accessId, accessData };
}

/**
 * Crea una nuova anagrafica (con eventuali accessi e file)
 */
export async function createAnagrafica(body, services = []) {
  try {
    // 1. AUTHENTICATION & HEADER CHECK
    let userUid;
    try {
      const hdr = await headers();
      userUid = hdr.get('x-user-uid');
      if (!userUid) throw new Error('Missing x-user-uid header');
    } catch (authErr) {
      console.error('[AUTH ERROR]:', authErr.message);
      throw new Error(`Unauthorized: ${authErr.message}`);
    }

    // 2. USER/OPERATOR VALIDATION
    let operatorData;
    try {
      let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
      if (!operatorDoc.exists) {
        operatorDoc = await adminDb.collection('users').doc(userUid).get();
      }
      if (!operatorDoc.exists) throw new Error(`User ${userUid} not found in operators or users`);

      operatorData = operatorDoc.data();
    } catch (dbErr) {
      console.error('[DB USER LOOKUP ERROR]:', dbErr.message);
      throw new Error(`User Verification Failed: ${dbErr.message}`);
    }

    // 3. PERMISSION CHECK
    const operatorStructures = operatorData.structureIds || operatorData.structureId || [];
    if (!body.registeredByStructure || !operatorStructures.includes(body.registeredByStructure)) {
      throw new Error(`Forbidden: Structure mismatch for user ${userUid}`);
    }

    // 4. ANAGRAFICA DOCUMENT CREATION
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

    // 5. SERVICES & FILE PROCESSING
    if (services && services.length > 0) {
      await createAccessInternal({
        anagraficaId,
        services,
        structureId: body.registeredByStructure,
        userUid,
        structureIds: docData.structureIds,
      });
    }

    return JSON.stringify({ id: anagraficaId });

  } catch (globalErr) {
    // This catches any unhandled errors and the re-thrown errors from above
    console.error('[CREATE_ANAGRAFICA FATAL]:', globalErr.stack);

    // Return a structured error for the frontend
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
  const hdr = headers();
  const userUid = hdr.get('x-user-uid');
  if (!userUid) throw new Error('Unauthorized');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = { id: anagraficaSnap.id, ...anagraficaSnap.data() };

  // Recupera le structure dell’utente
  let userDoc = await adminDb.collection('operators').doc(userUid).get();
  if (!userDoc.exists) {
    userDoc = await adminDb.collection('users').doc(userUid).get();
  }
  if (!userDoc.exists) throw new Error('User not found');

  const userData = userDoc.data();
  const userStructures = userData.structureIds || [];

  // Controllo accesso
  const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
  const hasAccess = canBeAccessedBy.some((s) => userStructures.includes(s));
  if (!hasAccess) throw new Error('Forbidden: no access to this anagrafica');

  return JSON.stringify(anagraficaData);
}


export async function updateAnagrafica(anagraficaId, body, structureId) {
  const hdr = headers();
  const userUid = hdr.get('x-user-uid');
  const userMail = hdr.get('x-user-mail');
  if (!userUid) throw new Error('Unauthorized');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data();

  let userDoc = await adminDb.collection('operators').doc(userUid).get();
  if (!userDoc.exists) throw new Error('User not found');
  const userStructures = userDoc.data().structureIds || [];
  const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
  if (!canBeAccessedBy.some((s) => userStructures.includes(s))) {
    throw new Error('Forbidden: no access to update this anagrafica');
  }

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
  const hdr = headers();
  const userUid = hdr.get('x-user-uid');
  if (!userUid) throw new Error('Unauthorized');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data();

  // Controllo accesso
  let userDoc = await adminDb.collection('users').doc(userUid).get();
  if (!userDoc.exists) throw new Error('User not found');
  const userStructures = userDoc.data().structureIds || [];
  const canBeAccessedBy = anagraficaData.canBeAccessedBy || [];
  if (!canBeAccessedBy.some((s) => userStructures.includes(s))) {
    throw new Error('Forbidden: no access to delete this anagrafica');
  }

  await anagraficaRef.update({
    deletedAt: new Date(),
    deletedBy: userUid,
    deleted: true,
  });

  return { success: true, message: 'Scheda eliminata con successo' };
}