'use server';

import { headers } from 'next/headers';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';


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
    sottocategorie = [],
    altro = null,
    note = null,
    files = [],
  } = payload;
  console.log('createAccessAction payload:', payload);
  if (!anagraficaId || !tipoAccesso) throw new Error('Missing required fields');

  // 1) Recupera anagrafica
  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // 2) Recupera operatore
  let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
  if (!operatorDoc.exists) {
    operatorDoc = await adminDb.collection('users').doc(userUid).get();
  }
  if (!operatorDoc.exists) throw new Error('Operator not found');

  const operatorData = operatorDoc.data() || {};
  const operatorStructures = operatorData.structureIds || operatorData.structureId || [];

  // 3) Controllo accesso
  if (!arraysIntersect(operatorStructures, allowedStructures)) {
    throw new Error('Forbidden: operator not allowed for this anagrafica');
  }

  // 4) Upload diretto su Firebase Storage
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

  // 5) Salva accesso su Firestore
  const accessData = {
    anagraficaId,
    tipoAccesso,
    sottocategorie,
    altro,
    note,
    files: uploadedFiles,
    createdBy: userUid,
    createdByEmail: userEmail || null,
    structureIds: allowedStructures,
    createdAt: new Date().toISOString(),
  };

  await adminDb.collection('accessi').doc(accessId).set(accessData);

  return { success: true, accessId, accessData };
}