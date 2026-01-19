'use server';

import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import path from 'path';
import { stripHtml } from '@/utils/htmlSanitizer';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { FILE_SIZE_LIMIT, ALLOWED_MIME_TYPES } from '@/utils/fileValidation';
import { z } from 'zod';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

/**
 * Zod schema for event payload validation
 */
const eventPayloadSchema = z.object({
  anagraficaId: z.string().min(1, 'anagraficaId is required'),
  tipoEvento: z.string().min(1, 'tipoEvento is required'),
  sottocategorie: z.array(z.string()).optional().default([]),
  altro: z.string().nullable().optional().default(null),
  note: z.string().nullable().optional().default(null),
  title: z.string().nullable().optional().default(null),
  dataOra: z.string().nullable().optional().default(null),
  files: z.array(z.any()).optional().default([]),
  classificazione: z.string().nullable().optional().default(null),
  enteRiferimento: z.string().nullable().optional().default(null),
  structureId: z.string().optional(),
});

/**
 * CREA EVENTO
 */
export async function createEventAction(payload) {
  // Security: Use standardized auth helper
  const { userUid, headers: hdr } = await requireUser();
  const userEmail = hdr.get('x-user-email');

  // Security: Validate payload with Zod schema
  const validatedPayload = eventPayloadSchema.parse(payload);
  const {
    anagraficaId,
    tipoEvento,
    sottocategorie,
    altro,
    note,
    title,
    dataOra,
    files,
    classificazione,
    enteRiferimento,
    structureId,
  } = validatedPayload;

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Security: Use standardized permission verification
  await verifyUserPermissions({ userUid, allowedStructures });

  // Additional check: structureId must be in allowed structures
  if (structureId && !allowedStructures.includes(structureId)) {
    throw new Error('Forbidden: invalid structureId');
  }

  const eventId = randomUUID();
  const uploadedFiles = [];

  for (let index = 0; index < (files || []).length; index++) {
    const a = files[index];
    const arrayBuffer = await a.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Security: Validate file size
    if (buffer.length > FILE_SIZE_LIMIT) {
      throw new Error(`File ${a.name} exceeds size limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`);
    }

    // Security: Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(a.type)) {
      throw new Error(`File type ${a.type} is not allowed`);
    }

    // Security: Extract safe file extension and use UUID-only storage paths
    // to prevent path traversal attacks
    const fileExt = path.extname(a.name).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
    const storagePath = `files/${anagraficaId}/eventi/${eventId}/${index}_${randomUUID()}${fileExt}`;

    const fileRef = adminStorage.bucket().file(storagePath);
    await fileRef.save(buffer, {
      contentType: a.type,
      resumable: false,
    });

    uploadedFiles.push({
      nome: a.name,
      nomeOriginale: a.name,
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
    title,
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
  // Security: Use standardized auth helper
  const { userUid } = await requireUser();

  if (!anagraficaId) throw new Error('Missing anagraficaId');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Security: Use standardized permission verification
  await verifyUserPermissions({ userUid, allowedStructures });


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
      sanitizedNote: stripHtml(data.note || ''),
      ...data,
    });
  });

  return {
    success: true,
    count: eventi.length,
    eventi,
  };
}