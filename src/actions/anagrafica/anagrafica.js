'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { headers } from 'next/headers';

const adminDb = admin.firestore();

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