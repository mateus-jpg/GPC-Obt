'use server';

import { headers } from 'next/headers';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import { stripHtml } from '@/utils/htmlSanitizer';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

export async function createAccessInternal({ anagraficaId, services, structureId, userUid, structureIds }) {
  const accessRef = adminDb.collection('accessi').doc();
  const accessId = accessRef.id;

  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const uploadedFiles = [];

    if (svc.files && svc.files.length > 0) {
      for (const fileItem of svc.files) {
        // Handle both raw File objects (legacy/FormData) and new object structure with metadata/base64
        let file = fileItem;
        let metadata = {
          nome: fileItem.name,
          dataCreazione: fileItem.creationDate,
          dataScadenza: fileItem.expirationDate
        };
        let buffer;
        let originalName = fileItem.name;
        let mimeType = fileItem.type;
        let size = fileItem.size;

        if (fileItem.base64) {
          // Handle Base64
          const matches = fileItem.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            buffer = Buffer.from(matches[2], 'base64');
          } else {
            // Fallback if no prefix
            buffer = Buffer.from(fileItem.base64, 'base64');
          }
        } else if (fileItem.file && typeof fileItem.file.arrayBuffer === 'function') {
          // Handle File object (if supported via FormData or direct access)
          const arrayBuffer = await fileItem.file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          originalName = fileItem.file.name;
          mimeType = fileItem.file.type;
          size = fileItem.file.size;
        } else if (typeof fileItem.arrayBuffer === 'function') {
          // Direct File object
          const arrayBuffer = await fileItem.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          originalName = fileItem.name;
          mimeType = fileItem.type;
          size = fileItem.size;
        }

        if (!buffer) continue;

        // Use a unique name for storage to avoid collisions, but keep original name in metadata
        const fileNameSanitized = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${randomUUID()}_${fileNameSanitized}`;

        const fileRef = adminStorage.bucket().file(storagePath);
        await fileRef.save(buffer, { contentType: mimeType, resumable: false });

        uploadedFiles.push({
          nome: metadata.nome || originalName,
          nomeOriginale: originalName,
          tipo: mimeType,
          dimensione: size,
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
  const { userUid } = await requireUser();

  const {
    anagraficaId,
    services = [],
    structureId,
  } = payload;

  console.log('createAccessAction payload:', payload);
  if (!anagraficaId || services.length === 0) throw new Error('Missing required fields');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Check if User has access to Anagrafica
  await verifyUserPermissions({ userUid, allowedStructures });

  // Additional check: The structureId used for creation must be one of the allowed structures
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
  const { userUid } = await requireUser();
  if (!anagraficaId) throw new Error('Missing anagraficaId');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Check permissions
  await verifyUserPermissions({ userUid, allowedStructures });

  const snap = await adminDb
    .collection('accessi')
    .where('anagraficaId', '==', anagraficaId)
    .orderBy('createdAt', 'desc')
    .get();

  const accessi = [];
  snap.forEach(doc => {
    const data = doc.data();

    if (data.services && Array.isArray(data.services)) {
      accessi.push({
        id: doc.id,
        ...data,
        services: data.services.map(s => ({
          ...s,
          sanitizedNote: stripHtml(s.note || '')
        }))
      });
    } else {
      // Compatibility with old structure
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

export async function getAccessFileUrl({ anagraficaId, filePath }) {
  const { userUid } = await requireUser();

  if (!anagraficaId || !filePath) throw new Error('Missing parameters');

  // Security check: ensure filePath belongs to the anagrafica
  if (!filePath.startsWith(`files/${anagraficaId}/`)) {
    throw new Error('Invalid file path for this anagrafica');
  }

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Check permissions
  await verifyUserPermissions({ userUid, allowedStructures });

  // Generate Signed URL
  // Valid for 1 hour
  const [url] = await adminStorage
    .bucket()
    .file(filePath)
    .getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // 1 hour
    });

  return { success: true, url };
}