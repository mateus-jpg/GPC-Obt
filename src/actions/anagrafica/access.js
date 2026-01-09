'use server';

import { headers } from 'next/headers';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import { stripHtml } from '@/utils/htmlSanitizer';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

/**
 * Helper: controlla se due array hanno intersezione
 */
function arraysIntersect(a = [], b = []) {
  const set = new Set(a || []);
  return (b || []).some(x => set.has(x));
}

async function createAccessInternal({ anagraficaId, services, structureId, userUid, structureIds }) {
  const accessRef = adminDb.collection('accessi').doc();
  const accessId = accessRef.id;

  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const uploadedFiles = [];

    if (svc.files && svc.files.length > 0) {
      for (const fileItem of svc.files) {
        // Handle both raw File objects (legacy) and new object structure with metadata
        let file = fileItem;
        let metadata = {
          nome: null,
          dataCreazione: null,
          dataScadenza: null
        };

        if (fileItem.file && typeof fileItem.file.arrayBuffer === 'function') {
          // New structure: { file, name, creationDate, expirationDate }
          file = fileItem.file;
          metadata = {
            nome: fileItem.name,
            dataCreazione: fileItem.creationDate,
            dataScadenza: fileItem.expirationDate
          };
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Use a unique name for storage to avoid collisions, but keep original name in metadata
        const fileNameSanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${randomUUID()}_${fileNameSanitized}`;

        const fileRef = adminStorage.bucket().file(storagePath);
        await fileRef.save(buffer, { contentType: file.type, resumable: false });

        uploadedFiles.push({
          nome: metadata.nome || file.name,
          nomeOriginale: file.name,
          tipo: file.type,
          dimensione: file.size,
          path: storagePath,
          dataCreazione: metadata.dataCreazione ? new Date(metadata.dataCreazione).toISOString() : new Date().toISOString(),
          dataScadenza: metadata.dataScadenza ? new Date(metadata.dataScadenza).toISOString() : null,
        });
      }
    }

    let reminderId = null;
    if (svc.reminderDate) {
      const reminderRef = adminDb.collection('reminders').doc();
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

export async function createAccessAction(payload) {
  const hdr = await headers();
  const userUid = hdr.get('x-user-uid');
  const userEmail = hdr.get('x-user-email');
  if (!userUid) throw new Error('Unauthorized');

  const {
    anagraficaId,
    services = [], // Array of { tipoAccesso, sottoCategorie, altro, note, files, classificazione, enteRiferimento }
    structureId,
  } = payload;

  console.log('createAccessAction payload:', payload);
  if (!anagraficaId || services.length === 0) throw new Error('Missing required fields');


  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];


  let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
  if (!operatorDoc.exists) {
    operatorDoc = await adminDb.collection('users').doc(userUid).get();
  }
  if (!operatorDoc.exists) throw new Error('Operator not found');

  const operatorData = operatorDoc.data() || {};
  const operatorStructures = operatorData.structureIds || operatorData.structureId || [];


  if (!arraysIntersect(operatorStructures, allowedStructures)) {
    throw new Error('Forbidden: operator not allowed for this anagrafica');
  }
  if (structureId && !allowedStructures.includes(structureId)) {
    throw new Error('Forbidden: structureId not allowed for this anagrafica');
  }

  const { accessId, accessData } = await createAccessInternal({
    anagraficaId,
    services,
    structureId,
    userUid,
    structureIds: allowedStructures,
  });

  return { success: true, accessId, accessData };
}

export async function getAccessAction(anagraficaId) {
  const hdr = await headers();
  const userUid = hdr.get('x-user-uid');
  if (!userUid) throw new Error('Unauthorized');

  if (!anagraficaId) throw new Error('Missing anagraficaId');


  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures =
    anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];


  let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
  if (!operatorDoc.exists) {
    operatorDoc = await adminDb.collection('users').doc(userUid).get();
  }
  if (!operatorDoc.exists) throw new Error('Operator not found');

  const operatorData = operatorDoc.data() || {};
  const operatorStructures =
    operatorData.structureIds || operatorData.structureId || [];


  if (!arraysIntersect(operatorStructures, allowedStructures)) {
    throw new Error('Forbidden: operator not allowed for this anagrafica');
  }


  const snap = await adminDb
    .collection('accessi')
    .where('anagraficaId', '==', anagraficaId)
    .orderBy('createdAt', 'desc')
    .get();

  const accessi = [];
  snap.forEach(doc => {
    const data = doc.data();

    // Check if it's new structure (services) or old structure (flat)
    if (data.services && Array.isArray(data.services)) {
      // New structure
      accessi.push({
        id: doc.id,
        ...data,
        services: data.services.map(s => ({
          ...s,
          sanitizedNote: stripHtml(s.note || '')
        }))
      });
    } else {
      // Compatibility with old structure: Wrap it in a 'services' array for consistent frontend handling
      // OR return as is and let frontend handle it.
      // Let's normalize it to the new structure for the frontend if possible, 
      // but since we want to be safe, let's keep it as is and let AccessInfo handle it.
      // Actually, normalizing here is better.

      accessi.push({
        id: doc.id,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        createdByEmail: data.createdByEmail,
        services: [{
          tipoAccesso: data.tipoAccesso,
          sottoCategorie: data.sottoCategorie,
          altro: data.altro,
          note: data.note,
          sanitizedNote: stripHtml(data.note || ''),
          classificazione: data.classificazione,
          enteRiferimento: data.enteRiferimento,
          files: data.files
        }]
      });
    }
  });

  return {
    success: true,
    count: accessi.length,
    accessi,
  };
}