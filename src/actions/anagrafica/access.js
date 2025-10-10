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
    tipoAccesso,
    sottoCategorie = [],
    altro = null,
    note = null,
    files = [],
    classificazione = null,
    enteRiferimento = null,
    structureId,
  } = payload;
  console.log('createAccessAction payload:', payload);
  if (!anagraficaId || !tipoAccesso) throw new Error('Missing required fields');
  
  
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
  if(structureId && !allowedStructures.includes(structureId)) {
    throw new Error('Forbidden: structureId not allowed for this anagrafica');
  }

  
  const accessId = randomUUID();
  const uploadedFiles= [];

  for (const a of files || []) {
    const arrayBuffer = await a.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `files/${anagraficaId}/accessi/${accessId}/${a.name}`;

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

  
  const accessData = {
    anagraficaId,
    tipoAccesso,
    sottoCategorie,
    createdByStructure: structureId,
    altro,
    note,
    files: uploadedFiles,
    createdBy: userUid,
    createdByEmail: userEmail || null,
    structureIds: allowedStructures,
    createdAt: new Date().toISOString(),
    classificazione,
    enteRiferimento,
  };

  await adminDb.collection('accessi').doc(accessId).set(accessData);

  return { success: true, accessId, accessData };
}

export async function getAccessAction(anagraficaId) {
  const hdr = await headers();
  const userUid = hdr.get('x-user-uid');
  const userEmail = hdr.get('x-user-email');
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
    accessi.push({
      id: doc.id,
      sanitizedNote : stripHtml(data.note || '' ),
      ...data,
    });
  });

  return {
    success: true,
    count: accessi.length,
    accessi,
  };
}