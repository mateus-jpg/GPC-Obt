'use server';

import { unstable_cache } from 'next/cache';
import admin from '@/lib/firebase/firebaseAdmin';
import { randomUUID } from 'crypto';
import path from 'path';
import { stripHtml } from '@/utils/htmlSanitizer';
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';
import { FILE_SIZE_LIMIT, ALLOWED_MIME_TYPES, validateFileSignature } from '@/utils/fileValidation';
import { CACHE_TAGS, REVALIDATE, invalidateAccessiCache, invalidateFilesCache } from '@/lib/cache';
import { logDataCreate, logDataAccess, logFileAccess } from '@/utils/audit';
import { initializeDefaultFolders } from '@/actions/files/folders';
import { FILE_CATEGORIES } from '@/config/constants';

const adminDb = admin.firestore();
const adminStorage = admin.storage();

export async function createAccessInternal({ anagraficaId, services, structureId, userUid, structureIds }) {
  const accessRef = adminDb.collection('accessi').doc();
  const accessId = accessRef.id;

  // Initialize default folders for this anagrafica if not already done
  const foldersResult = await initializeDefaultFolders(
    anagraficaId,
    structureIds,
    userUid,
    null // No email needed for internal calls
  );

  // Find the DOCUMENT folder for access files
  const documentFolder = foldersResult.folders?.find(f => f.category === FILE_CATEGORIES.DOCUMENT);
  const targetFolderId = documentFolder?.id || null;

  const processedServices = await Promise.all(services.map(async (svc, index) => {
    const uploadedFiles = [];

    if (svc.files && svc.files.length > 0) {
      for (const fileItem of svc.files) {
        // Handle both raw File objects (legacy/FormData) and new object structure with metadata/base64
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

        // Security: Validate file size
        if (buffer.length > FILE_SIZE_LIMIT) {
          throw new Error(`File ${originalName} exceeds size limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`);
        }

        // Security: Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          throw new Error(`File type ${mimeType} is not allowed`);
        }

        // Security: Validate file content matches claimed MIME type (magic number check)
        // This prevents MIME type spoofing attacks
        if (!validateFileSignature(buffer, mimeType)) {
          throw new Error(`File ${originalName} content does not match claimed type ${mimeType}`);
        }

        // Security: Extract safe file extension from original name
        const fileExt = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
        // Security: Use UUID-only storage paths to prevent path traversal attacks
        // Original filename is stored in metadata only, never in the file path
        const storagePath = `files/${anagraficaId}/accessi/${accessId}/${index}_${randomUUID()}${fileExt}`;

        const fileRef = adminStorage.bucket().file(storagePath);
        await fileRef.save(buffer, { contentType: mimeType, resumable: false });

        const fileMetadata = {
          nome: metadata.nome || originalName,
          nomeOriginale: originalName,
          tipo: mimeType,
          dimensione: size,
          path: storagePath,
          dataCreazione: metadata.dataCreazione ? new Date(metadata.dataCreazione).toISOString() : new Date().toISOString(),
          dataScadenza: metadata.dataScadenza ? new Date(metadata.dataScadenza).toISOString() : null,
        };

        uploadedFiles.push(fileMetadata);

        // ALSO save to files collection so it appears in folder structure
        if (targetFolderId) {
          const fileDocRef = adminDb.collection('files').doc();
          await fileDocRef.set({
            // File Information
            nome: fileMetadata.nome,
            nomeOriginale: fileMetadata.nomeOriginale,
            tipo: fileMetadata.tipo,
            dimensione: fileMetadata.dimensione,
            path: fileMetadata.path,

            // Links
            anagraficaId,
            folderId: targetFolderId,
            accessoId: accessId,
            category: FILE_CATEGORIES.DOCUMENT,
            tags: [],

            // Dates
            dataDocumento: metadata.dataCreazione ? new Date(metadata.dataCreazione) : new Date(),
            dataCreazione: new Date(),
            dataScadenza: metadata.dataScadenza ? new Date(metadata.dataScadenza) : null,

            // Access Control
            structureIds: structureIds || [],
            uploadedByStructure: structureId,

            // Metadata
            uploadedBy: userUid,
            uploadedByEmail: null,
            createdAt: new Date(),
            updatedAt: new Date(),

            // Soft Delete
            deleted: false,
            deletedAt: null,
            deletedBy: null,

            // Access Tracking
            lastAccessedAt: null,
            accessCount: 0
          });
        }
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

  // Invalidate caches after creating new access
  invalidateAccessiCache(anagraficaId);
  invalidateFilesCache(anagraficaId);

  return { accessId, accessData };
}

export async function createAccessAction(payload) {
  const { userUid } = await requireUser();

  const {
    anagraficaId,
    services = [],
    structureId,
  } = payload;

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

  // Audit log: access record creation
  await logDataCreate({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: accessId,
    structureId,
    details: {
      anagraficaId,
      servicesCount: services.length,
      serviceTypes: services.map(s => s.tipoAccesso).filter(Boolean)
    }
  });

  return { success: true, accessId, accessData };
}

/**
 * Internal function to fetch accessi from database
 * Used by cached wrapper
 */
async function fetchAccessiFromDb(anagraficaId) {
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

  return accessi;
}

/**
 * Get access records for an anagrafica with caching
 * Permission check runs fresh on every call (not cached)
 */
export async function getAccessAction(anagraficaId) {
  const { userUid } = await requireUser();
  if (!anagraficaId) throw new Error('Missing anagraficaId');

  const anagraficaRef = adminDb.collection('anagrafica').doc(anagraficaId);
  const anagraficaSnap = await anagraficaRef.get();
  if (!anagraficaSnap.exists) throw new Error('Anagrafica not found');

  const anagraficaData = anagraficaSnap.data() || {};
  const allowedStructures = anagraficaData.canBeAccessedBy || anagraficaData.structureIds || [];

  // Permission check is NOT cached - always runs fresh for security
  await verifyUserPermissions({ userUid, allowedStructures });

  // Get cached accessi data
  const getCachedAccessi = unstable_cache(
    async () => fetchAccessiFromDb(anagraficaId),
    [`accessi`, anagraficaId],
    {
      tags: [CACHE_TAGS.accessi(anagraficaId)],
      revalidate: REVALIDATE.accessi,
    }
  );

  const accessi = await getCachedAccessi();

  // Audit log: access records read
  await logDataAccess({
    actorUid: userUid,
    resourceType: 'accessi',
    resourceId: anagraficaId,
    details: {
      accessCount: accessi.length
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

  // Security: Validate anagraficaId format (should be alphanumeric Firebase ID)
  if (!/^[a-zA-Z0-9]+$/.test(anagraficaId)) {
    throw new Error('Invalid anagraficaId format');
  }

  // Security: Normalize path to prevent path traversal attacks (../ sequences)
  const normalizedPath = path.posix.normalize(filePath);
  const expectedPrefix = `files/${anagraficaId}/`;

  // Security: Check that normalized path starts with expected prefix
  // and doesn't contain dangerous sequences after normalization
  if (!normalizedPath.startsWith(expectedPrefix) || normalizedPath.includes('..')) {
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
  // Security: Use the normalized path to prevent path traversal
  const [url] = await adminStorage
    .bucket()
    .file(normalizedPath)
    .getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60, // 1 hour
    });

  // Audit log: file access
  await logFileAccess({
    actorUid: userUid,
    resourceId: anagraficaId,
    filePath: normalizedPath
  });

  return { success: true, url };
}
