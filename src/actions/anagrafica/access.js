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


  const accessId = randomUUID();

  // Process each service (upload files, sanitize notes)
  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const uploadedFiles = [];
    if (svc.files && svc.files.length > 0) {
      for (const a of svc.files) {
        const arrayBuffer = await a.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Use index/type to organize files folders if needed, or just unique paths
        const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${a.name}`;

        const fileRef = adminStorage.bucket().file(storagePath);
        await fileRef.save(buffer, {
          contentType: a.type,
          resumable: false,
        });

        uploadedFiles.push({
          nome: a.name,
          tipo: a.type,
          dimensione: a.size,
          path: storagePath,
        });
      }
    }

    return {
      tipoAccesso: svc.tipoAccesso,
      sottoCategorie: svc.sottoCategorie,
      altro: svc.altro,
      note: svc.note?.trim() || null,
      classificazione: svc.classificazione || null,
      enteRiferimento: svc.enteRiferimento || null,
      files: uploadedFiles,
    };
  }));


  const accessData = {
    anagraficaId,
    services: processedServices,
    createdByStructure: structureId,
    createdBy: userUid,
    createdByEmail: userEmail || null,
    structureIds: allowedStructures,
    createdAt: new Date().toISOString(),
  };

  await adminDb.collection('accessi').doc(accessId).set(accessData);

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