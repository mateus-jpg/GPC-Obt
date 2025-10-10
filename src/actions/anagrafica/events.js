'use server';

import { headers } from 'next/headers';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import { create } from 'domain';
import { stripHtml } from '@/utils/htmlSanitizer';
/**
 * Helper: controlla se due array hanno intersezione
 */
function arraysIntersect(a = [], b = []) {
  const set = new Set(a || []);
  return (b || []).some(x => set.has(x));
}

const adminDb = admin.firestore();
const adminStorage = admin.storage();
/**
 * CREA EVENTO
 */
export async function createEventAction(payload
) {
  const hdr = await headers();
  const userUid = hdr.get('x-user-uid');
  const userEmail = hdr.get('x-user-email');
  if (!userUid) throw new Error('Unauthorized');

  const {
    anagraficaId,
    tipoEvento,
    sottocategorie = [],
    altro = null,
    note = null,
    dataOra = null,
    files = [],
    classificazione = null,
    enteRiferimento = null,
    structureId,
  } = payload;

  if (!anagraficaId || !tipoEvento) throw new Error('Missing required fields');

  
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  
  let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
/*   if (!operatorDoc.exists) {
    operatorDoc = await adminDb.collection('users').doc(userUid).get();
  } */
  if (!operatorDoc.exists) throw new Error('Operator not found');

  const operatorData = operatorDoc.data() || {};
  const operatorStructures = operatorData.structureIds || operatorData.structureId || [];

  
  if (!arraysIntersect(operatorStructures, allowedStructures)) {
    throw new Error('Forbidden: operator not allowed for this anagrafica');
  }

  if (structureId && !allowedStructures.includes(structureId)) {
    throw new Error('Forbidden: invalid structureId');
  }
  
  const eventId = randomUUID();
  const uploadedFiles = [];

  for (const a of files || []) {
    const arrayBuffer = await a.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `files/${anagraficaId}/eventi/${eventId}/${a.name}`;

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

  
  const eventData = {
    anagraficaId,
    tipoEvento,
    sottocategorie,
    altro,
    note,
    dataOra: dataOra || null,
    files: uploadedFiles,
    createdBy: userUid,
    createdByEmail: userEmail || null,
    structureIds: allowedStructures,
    createdAt: new Date().toISOString(),
    classificazione,
    enteRiferimento,
    createdByStructure: structureId || null,
  };

  await adminDb.collection('eventi').doc(eventId).set(eventData);

  return { success: true, eventId, eventData };
}



export async function getEventsAction(anagraficaId) {
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
    .collection('eventi')
    .where('anagraficaId', '==', anagraficaId)
    .orderBy('createdAt', 'desc')
    .get();

  const eventi = [];
  snap.forEach(doc => {
    const data = doc.data();
    eventi.push({
      id: doc.id,
      sanitizedNote : stripHtml(data.note || '' ),
      ...data,
    });
  });

  return {
    success: true,
    count: eventi.length,
    eventi,
  };
}