'use server';

import { headers } from 'next/headers';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';

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
  } = payload;

  if (!anagraficaId || !tipoEvento) throw new Error('Missing required fields');

  // 1) Recupera anagrafica
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // 2) Recupera operatore
  let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
/*   if (!operatorDoc.exists) {
    operatorDoc = await adminDb.collection('users').doc(userUid).get();
  } */
  if (!operatorDoc.exists) throw new Error('Operator not found');

  const operatorData = operatorDoc.data() || {};
  const operatorStructures = operatorData.structureIds || operatorData.structureId || [];

  // 3) Controllo accesso
  if (!arraysIntersect(operatorStructures, allowedStructures)) {
    throw new Error('Forbidden: operator not allowed for this anagrafica');
  }

  // 4) Upload diretto su Firebase Storage (senza file temporanei)
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
      path: storagePath, // solo path
    });
  }

  // 5) Salva evento su Firestore
  const eventData = {
    anagraficaId,
    tipoEvento,
    sottocategorie,
    altro,
    contenuto,
    dataOra: dataOra || null,
    files: uploadedFiles,
    createdBy: userUid,
    createdByEmail: userEmail || null,
    structureIds: allowedStructures,
    createdAt: new Date().toISOString(),
  };

  await adminDb.collection('eventi').doc(eventId).set(eventData);

  return { success: true, eventId, eventData };
}
