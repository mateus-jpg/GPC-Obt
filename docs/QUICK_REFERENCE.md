# GPC Quick Reference Guide

Quick reference for common operations and patterns in the GPC application.

---

## Common Operations

### Authentication & Authorization

```javascript
// Get current user
const { userUid, headers } = await requireUser();
const userEmail = headers.get('x-user-email');

// Check permissions for a structure
await verifyUserPermissions({
  userUid,
  structureId: 'structure-123'
});

// Check permissions for existing resource
await verifyUserPermissions({
  userUid,
  allowedStructures: ['struct-1', 'struct-2']
});

// Check if user is super admin
const { isSuperAdmin } = await verifyUserPermissions({ userUid });

// Check if user is structure admin
await verifyStructureAdmin({ userUid, structureId });
```

### Audit Logging

```javascript
// Log data creation
await logDataCreate({
  actorUid: userUid,
  resourceType: 'anagrafica', // or 'accessi'
  resourceId: recordId,
  structureId: structureId,
  details: { /* optional context */ }
});

// Log data access (read)
await logDataAccess({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: recordId,
  details: { /* optional context */ }
});

// Log data update
await logDataUpdate({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: recordId,
  structureId: structureId,
  changedFields: ['anagrafica', 'lavoroFormazione'],
  details: { /* optional context */ }
});

// Log data deletion
await logDataDelete({
  actorUid: userUid,
  resourceType: 'anagrafica',
  resourceId: recordId,
  softDelete: true
});

// Log file access
await logFileAccess({
  actorUid: userUid,
  resourceId: anagraficaId,
  filePath: 'files/...'
});
```

### Cache Management

```javascript
// Invalidate single record
import { revalidateTag, CACHE_TAGS } from '@/lib/cache';
revalidateTag(CACHE_TAGS.anagrafica(recordId));

// Invalidate anagrafica and all related lists
import { invalidateAnagraficaCaches } from '@/lib/cache';
invalidateAnagraficaCaches(anagraficaId, allowedStructures);

// Invalidate accessi
import { invalidateAccessiCache } from '@/lib/cache';
invalidateAccessiCache(anagraficaId);

// Invalidate files
import { invalidateFilesCache } from '@/lib/cache';
invalidateFilesCache(anagraficaId);

// Invalidate user profile
import { invalidateUserProfileCache } from '@/lib/cache';
invalidateUserProfileCache(userUid);
```

### Creating Cached Reads

```javascript
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, REVALIDATE } from '@/lib/cache';

const getCachedData = unstable_cache(
  async (id) => {
    // Fetch from database
    const doc = await db.collection('resource').doc(id).get();
    return doc.data();
  },
  ['resource', id], // Cache key
  {
    tags: [CACHE_TAGS.resource(id)],
    revalidate: REVALIDATE.resource,
  }
);

const data = await getCachedData(id);
```

### Transaction Pattern

```javascript
const result = await adminDb.runTransaction(async (transaction) => {
  // 1. Read
  const snap = await transaction.get(ref);

  // 2. Validate
  if (!snap.exists) {
    const error = new Error('Not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const data = snap.data();

  // 3. Check soft delete
  if (data.deletedAt) {
    const error = new Error('Not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // 4. Verify permissions
  await verifyUserPermissions({
    userUid,
    allowedStructures: data.canBeAccessedBy
  });

  // 5. Perform update
  transaction.update(ref, {
    ...updateData,
    updatedAt: new Date(),
    updatedBy: userUid
  });

  // 6. Return context for post-transaction operations
  return { allowedStructures: data.canBeAccessedBy };
});

// Post-transaction operations (outside transaction)
await logDataUpdate({ /* ... */ });
invalidateAnagraficaCaches(id, result.allowedStructures);
```

### Soft Delete Pattern

```javascript
// Soft delete
transaction.update(ref, {
  deleted: true,
  deletedAt: new Date(),
  deletedBy: userUid
});

// Query to exclude soft deleted
const query = db.collection('anagrafica')
  .where('canBeAccessedBy', 'array-contains', structureId)
  .where('deletedAt', '==', null);

// Or check in code after fetch
const data = snap.data();
if (data.deletedAt) {
  const error = new Error('Not found');
  error.code = 'NOT_FOUND';
  throw error;
}
```

### File Upload Pattern (New Architecture)

```javascript
import { uploadFiles, FILE_CATEGORIES } from '@/actions/files/files';

// Upload files to an anagrafica
const result = await uploadFiles({
  anagraficaId: 'anagrafica-123',
  files: [
    {
      name: 'passport.pdf',
      type: 'application/pdf',
      size: 1024000,
      buffer: fileBuffer,
      displayName: 'Passport Document'
    }
  ],
  accessoId: 'accesso-456',  // Optional: link to accesso
  category: FILE_CATEGORIES.IDENTITY,
  tags: ['passport', 'identity'],
  expirationDate: '2025-12-31',
  structureId: 'structure-789'
});

// Result contains:
// {
//   success: true,
//   files: [...],
//   uploadedCount: 1,
//   errorCount: 0
// }
```

### File Download Pattern (New Architecture)

```javascript
import { getFileUrl } from '@/actions/files/files';

// Get signed URL for download
const result = await getFileUrl(fileId);

// Result contains:
// {
//   success: true,
//   url: 'https://storage.googleapis.com/...',
//   file: {
//     id: 'file-123',
//     nome: 'Passport Document',
//     tipo: 'application/pdf',
//     dimensione: 1024000
//   }
// }

// URL is valid for 1 hour
// Access is automatically tracked (lastAccessedAt, accessCount)
// Audit log is automatically created
```

### File Management Operations

```javascript
import {
  getFiles,
  deleteFile,
  updateFileMetadata,
  getFileStats,
  FILE_CATEGORIES
} from '@/actions/files/files';

// List files for an anagrafica
const filesResult = await getFiles(anagraficaId);
// Optional: filter by accesso
const accessoFilesResult = await getFiles(anagraficaId, accessoId);

// Delete a file (soft delete)
const deleteResult = await deleteFile(fileId);

// Update file metadata
const updateResult = await updateFileMetadata(fileId, {
  nome: 'Updated Name',
  tags: ['new', 'tags'],
  category: FILE_CATEGORIES.MEDICAL,
  dataScadenza: '2026-12-31'
});

// Get file statistics
const statsResult = await getFileStats(anagraficaId);
// Returns: totalFiles, totalSize, byCategory, withExpiration, expired
```

### History Entry Pattern

```javascript
import { createHistoryEntry } from '@/actions/anagrafica/history';
import { computeGroupChanges } from '@/utils/anagraficaUtils';

// 1. Compute changes
const { changedGroups, changes } = computeGroupChanges(oldData, newData);

// 2. Create history entry if there are changes
if (changedGroups.length > 0) {
  await createHistoryEntry({
    anagraficaId,
    changeType: 'update', // or 'create', 'delete'
    changedGroups,
    changes,
    userUid,
    userMail,
    structureId
  });
}
```

### Error Handling Pattern

```javascript
export async function myServerAction(params) {
  try {
    // 1. Authentication
    const { userUid } = await requireUser();

    // 2. Permission check
    await verifyUserPermissions({ userUid, structureId });

    // 3. Perform operation
    const result = await performOperation(params);

    // 4. Audit log
    await logDataCreate({ /* ... */ });

    // 5. Invalidate cache
    invalidateCache();

    return { success: true, data: result };

  } catch (error) {
    console.error('[MY_ACTION_ERROR]:', error.stack);

    // Handle specific error codes
    if (error.code === 'NOT_FOUND') {
      return { error: true, message: 'Record not found' };
    }

    if (error.code === 'PERMISSION_DENIED') {
      return { error: true, message: 'Access denied' };
    }

    if (error.code === 'ALREADY_EXISTS') {
      return { error: true, message: 'Record already exists' };
    }

    // Generic error
    return { error: true, message: error.message };
  }
}
```

---

## Common Queries

### Get Anagrafica for Structure

```javascript
const snapshot = await db.collection('anagrafica')
  .where('canBeAccessedBy', 'array-contains', structureId)
  .where('deletedAt', '==', null)
  .orderBy('createdAt', 'desc')
  .limit(50)
  .get();

const records = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### Get User Document (Dual Collection)

```javascript
import { getUserDocument } from '@/utils/database';

const { collection, data } = await getUserDocument(userUid);
// collection will be 'operators' or 'users'
```

### Get Access Records for Anagrafica

```javascript
const snapshot = await db.collection('accessi')
  .where('anagraficaId', '==', anagraficaId)
  .orderBy('createdAt', 'desc')
  .get();

const accessi = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### Get Audit Logs for User

```javascript
const snapshot = await db.collection('audit_logs')
  .where('actorUid', '==', userUid)
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();

const logs = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### Get Audit Logs for Resource

```javascript
const snapshot = await db.collection('audit_logs')
  .where('resourceId', '==', resourceId)
  .where('resourceType', '==', 'anagrafica')
  .orderBy('timestamp', 'desc')
  .get();

const logs = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

---

## Validation with Zod

### Basic Schema

```javascript
import { z } from 'zod';

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  dateOfBirth: z.date(),
  tags: z.array(z.string()),
}).strict(); // Reject unknown fields

// Validate
const result = schema.safeParse(data);
if (!result.success) {
  throw new Error(result.error.message);
}

const validatedData = result.data;
```

### Partial Updates

```javascript
// Allow partial updates (all fields optional)
const updateSchema = schema.partial();

// Validate partial data
const result = updateSchema.safeParse(partialData);
```

---

## Database Collections Reference

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `anagrafica` | Personal records | `canBeAccessedBy`, `deletedAt`, `createdAt` |
| `anagrafica/{id}/history` | Change history | `changedAt`, `changeType`, `changedGroups` |
| `accessi` | Service access records | `anagraficaId`, `services`, `structureIds` |
| `files` | File metadata | `anagraficaId`, `accessoId`, `category`, `path`, `deleted` |
| `audit_logs` | Audit trail | `action`, `actorUid`, `resourceId`, `timestamp` |
| `operators` | Primary users | `uid`, `structures`, `role`, `active` |
| `users` | Legacy users | `uid`, `email` |
| `structures` | Organizations | `name`, `active` |

---

## Environment Variables

Key environment variables (check `.env` files):

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Environment
NODE_ENV=development|production

# Next.js
NEXT_PUBLIC_APP_URL=
```

---

## Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `NOT_FOUND` | Resource doesn't exist or is soft deleted | Return 404 |
| `PERMISSION_DENIED` | User lacks required permissions | Return 403 |
| `ALREADY_EXISTS` | Duplicate resource | Return 409 |
| `INVALID_INPUT` | Validation failed | Return 400 |
| `ALREADY_DELETED` | Trying to delete already deleted record | Return 409 |
| `UNAUTHENTICATED` | No valid session | Return 401 |

---

## Import Paths Quick Reference

```javascript
// Authentication & Authorization
import { requireUser, verifyUserPermissions } from '@/utils/server-auth';

// Audit Logging
import {
  logDataCreate,
  logDataAccess,
  logDataUpdate,
  logDataDelete,
  logFileAccess
} from '@/utils/audit';

// Cache Management
import {
  CACHE_TAGS,
  REVALIDATE,
  invalidateAnagraficaCaches,
  invalidateAccessiCache
} from '@/lib/cache';
import { revalidateTag } from 'next/cache';

// Database
import admin from '@/lib/firebase/firebaseAdmin';
import { collections, getUserDocument } from '@/utils/database';

// History Tracking
import { createHistoryEntry } from '@/actions/anagrafica/history';
import { computeGroupChanges } from '@/utils/anagraficaUtils';

// File Management
import {
  uploadFiles,
  getFiles,
  getFileUrl,
  deleteFile,
  updateFileMetadata,
  getFileStats,
  FILE_CATEGORIES
} from '@/actions/files/files';

// Validation
import { validateAnagraficaCreate, validateAnagraficaUpdate } from '@/schemas/anagrafica';

// Logging
import logger, { createScopedLogger } from '@/utils/logger';

// Next.js
import { unstable_cache } from 'next/cache';
```

---

## Testing Checklist for New Features

- [ ] Authentication works (requireUser)
- [ ] Permissions checked (verifyUserPermissions)
- [ ] Input validated (Zod schema)
- [ ] Audit logging added (log* functions)
- [ ] Cache invalidation implemented
- [ ] Transactions used for critical ops
- [ ] Soft delete handled correctly
- [ ] Error handling covers all cases
- [ ] Success/error responses consistent
- [ ] No sensitive data in error messages
- [ ] History tracking for updates (if applicable)
- [ ] File validation for uploads (if applicable)
- [ ] Signed URLs for downloads (if applicable)

---

## Useful CLI Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Check Firebase connection
node js_scripts/test-firebase.js

# Run database migrations (if any)
node js_scripts/migrate.js
```

---

## Quick Debugging Tips

### Check User Permissions
```javascript
const { operatorData, userStructures, isSuperAdmin } = await verifyUserPermissions({
  userUid: 'user-uid-here'
});
console.log('User:', operatorData);
console.log('Structures:', userStructures);
console.log('Super Admin:', isSuperAdmin);
```

### Check Cache Status
```javascript
// Add this temporarily to see if cached data is returned
const getCachedData = unstable_cache(
  async () => {
    console.log('CACHE MISS - Fetching from DB');
    return fetchFromDb();
  },
  ['key'],
  { tags: ['tag'] }
);
```

### Check Audit Logs
```javascript
// Query recent audit logs
const logs = await db.collection('audit_logs')
  .orderBy('timestamp', 'desc')
  .limit(20)
  .get();

logs.forEach(doc => {
  const log = doc.data();
  console.log(`${log.action} by ${log.actorUid} at ${log.timestamp}`);
});
```

### Test Permission Check
```javascript
try {
  await verifyUserPermissions({
    userUid: 'test-uid',
    structureId: 'test-structure'
  });
  console.log('✅ Permission granted');
} catch (error) {
  console.log('❌ Permission denied:', error.message);
}
```

---

**Tip**: Bookmark this page for quick access to common patterns!
