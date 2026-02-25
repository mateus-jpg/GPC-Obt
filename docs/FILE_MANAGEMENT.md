# File Management System Guide

## Overview

The GPC application now includes a comprehensive file management system with a dedicated `files` Firestore collection. This new architecture allows:

- **Independent file uploads** without requiring accessi records
- **Optional linking** to accessi records when needed
- **Comprehensive metadata** tracking
- **File categorization** with custom tags
- **Access tracking** (who accessed when, how many times)
- **Expiration dates** for documents
- **File statistics** and reporting

---

## Quick Start

### Upload Files

```javascript
import { uploadFiles, FILE_CATEGORIES } from '@/actions/files/files';

const result = await uploadFiles({
  anagraficaId: 'anagrafica-123',
  files: [
    {
      name: 'passport.pdf',
      type: 'application/pdf',
      size: 1024000,
      buffer: fileBuffer
    }
  ],
  category: FILE_CATEGORIES.IDENTITY,
  tags: ['passport'],
  structureId: 'structure-789'
});
```

### List Files

```javascript
import { getFiles } from '@/actions/files/files';

// All files for an anagrafica
const result = await getFiles('anagrafica-123');

// Files for a specific accesso
const result = await getFiles('anagrafica-123', 'accesso-456');
```

### Download File

```javascript
import { getFileUrl } from '@/actions/files/files';

const result = await getFileUrl('file-123');
// result.url is valid for 1 hour
```

---

## File Categories

The system supports 9 predefined categories for organizing files:

```javascript
import { FILE_CATEGORIES } from '@/actions/files/files';

FILE_CATEGORIES.DOCUMENT    // General documents
FILE_CATEGORIES.IDENTITY    // ID cards, passports
FILE_CATEGORIES.LEGAL       // Legal documents
FILE_CATEGORIES.MEDICAL     // Medical records
FILE_CATEGORIES.EMPLOYMENT  // Work-related documents
FILE_CATEGORIES.EDUCATION   // Educational certificates
FILE_CATEGORIES.HOUSING     // Housing documents
FILE_CATEGORIES.FINANCIAL   // Financial documents
FILE_CATEGORIES.OTHER       // Uncategorized
```

---

## Storage Structure

Files are stored in Firebase Cloud Storage with this path structure:

```
files/{anagraficaId}/{category}/{timestamp}_{UUID}.{ext}
```

**Example**:
```
files/anagrafica-123/identity/1707145200000_a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

**Security Features**:
- UUID prevents filename guessing
- Timestamp ensures uniqueness
- Category-based organization
- No path traversal vulnerability

---

## Data Model

### Files Collection Structure

```javascript
{
  id: string,                        // Firestore document ID

  // File Information
  nome: string,                      // Display name
  nomeOriginale: string,             // Original filename
  tipo: string,                      // MIME type
  dimensione: number,                // Size in bytes
  path: string,                      // Storage path

  // Links
  anagraficaId: string,              // Required: linked anagrafica
  accessoId: string,                 // Optional: linked accesso
  category: string,                  // File category
  tags: string[],                    // Custom tags

  // Dates
  dataCreazione: date,               // Upload date
  dataScadenza: date,                // Optional: expiration date

  // Access Control
  structureIds: string[],            // Structures with access
  uploadedByStructure: string,       // Uploading structure

  // Metadata
  uploadedBy: string,                // User UID
  uploadedByEmail: string,           // User email
  createdAt: date,
  updatedAt: date,

  // Soft Delete
  deleted: boolean,
  deletedAt: date,
  deletedBy: string,

  // Access Tracking
  lastAccessedAt: date,              // Last download
  accessCount: number                // Number of downloads
}
```

---

## API Reference

### uploadFiles(params)

Upload one or more files to an anagrafica record.

**Parameters**:
```javascript
{
  anagraficaId: string,           // Required
  files: Array<{                  // Required: array of files
    name: string,
    type: string,                 // MIME type
    size: number,                 // bytes
    buffer: Buffer,
    displayName?: string          // Optional custom name
  }>,
  accessoId?: string,             // Optional: link to accesso
  category?: string,              // Default: FILE_CATEGORIES.OTHER
  tags?: string[],                // Optional: custom tags
  expirationDate?: string,        // Optional: ISO date string
  structureId: string             // Required: uploading structure
}
```

**Returns**:
```javascript
{
  success: boolean,
  files: Array<{
    id: string,
    nome: string,
    path: string,
    // ... full file metadata
  }>,
  uploadedCount: number,
  errorCount: number
}
```

**Validation**:
- Max file size: 10MB (configurable)
- Allowed types: PDF, images, Word, Excel, text
- File name and size required

**Example**:
```javascript
const result = await uploadFiles({
  anagraficaId: 'abc123',
  files: [{ name: 'doc.pdf', type: 'application/pdf', size: 50000, buffer }],
  category: FILE_CATEGORIES.LEGAL,
  tags: ['contract', '2024'],
  expirationDate: '2025-12-31',
  structureId: 'struct-123'
});
```

---

### getFiles(anagraficaId, accessoId?)

List files for an anagrafica, optionally filtered by accesso.

**Parameters**:
```javascript
anagraficaId: string              // Required
accessoId?: string                // Optional: filter by accesso
```

**Returns**:
```javascript
{
  success: boolean,
  count: number,
  files: Array<{
    id: string,
    nome: string,
    nomeOriginale: string,
    tipo: string,
    dimensione: number,
    path: string,
    anagraficaId: string,
    accessoId: string,
    category: string,
    tags: string[],
    dataCreazione: string,
    dataScadenza: string,
    lastAccessedAt: string,
    accessCount: number,
    // ... more fields
  }>
}
```

**Caching**: Results are cached for 5 minutes

**Example**:
```javascript
// All files for anagrafica
const all = await getFiles('abc123');

// Only files linked to a specific accesso
const accessoFiles = await getFiles('abc123', 'accesso-456');
```

---

### getFileUrl(fileId)

Get a signed URL for downloading a file.

**Parameters**:
```javascript
fileId: string                    // Required: file document ID
```

**Returns**:
```javascript
{
  success: boolean,
  url: string,                    // Signed URL (valid 1 hour)
  file: {
    id: string,
    nome: string,
    tipo: string,
    dimensione: number
  }
}
```

**Side Effects**:
- Updates `lastAccessedAt` to current time
- Increments `accessCount` by 1
- Creates audit log entry

**Example**:
```javascript
const result = await getFileUrl('file-123');
// Use result.url to download
// URL expires after 1 hour
```

---

### deleteFile(fileId)

Soft delete a file (marks as deleted, doesn't remove from storage).

**Parameters**:
```javascript
fileId: string                    // Required
```

**Returns**:
```javascript
{
  success: boolean,
  message: string
}
```

**Side Effects**:
- Sets `deleted: true`
- Sets `deletedAt` timestamp
- Sets `deletedBy` to current user
- Invalidates cache
- Creates audit log entry

**Example**:
```javascript
const result = await deleteFile('file-123');
```

---

### updateFileMetadata(fileId, updates)

Update file metadata (name, tags, category, expiration).

**Parameters**:
```javascript
fileId: string                    // Required
updates: {
  nome?: string,                  // Display name
  tags?: string[],                // Tags array
  category?: string,              // Category
  dataScadenza?: string           // ISO date string
}
```

**Allowed Fields**: Only `nome`, `tags`, `category`, and `dataScadenza` can be updated

**Returns**:
```javascript
{
  success: boolean,
  message: string
}
```

**Example**:
```javascript
const result = await updateFileMetadata('file-123', {
  nome: 'Updated Document Name',
  tags: ['important', 'reviewed'],
  category: FILE_CATEGORIES.LEGAL,
  dataScadenza: '2026-12-31'
});
```

---

### getFileStats(anagraficaId)

Get file statistics for an anagrafica.

**Parameters**:
```javascript
anagraficaId: string              // Required
```

**Returns**:
```javascript
{
  success: boolean,
  stats: {
    totalFiles: number,           // Total file count
    totalSize: number,            // Total size in bytes
    byCategory: {                 // Count per category
      document: number,
      identity: number,
      legal: number,
      // ... etc
    },
    withExpiration: number,       // Files with expiration date
    expired: number               // Currently expired files
  }
}
```

**Example**:
```javascript
const result = await getFileStats('abc123');
console.log(`Total: ${result.stats.totalFiles} files`);
console.log(`Size: ${result.stats.totalSize} bytes`);
console.log(`Legal docs: ${result.stats.byCategory.legal}`);
```

---

## Security

### Permission Checks

All file operations verify:
1. User is authenticated
2. User has access to the linked anagrafica
3. User belongs to a structure with access rights

### File Validation

Upload validation includes:
- File size limit (10MB default)
- MIME type whitelist
- File name and buffer presence
- Path sanitization

### Signed URLs

Download URLs:
- Expire after 1 hour
- Generated on-demand
- Cannot be reused indefinitely
- Require fresh permission check

### Audit Logging

All operations are logged:
- File uploads: `file_create`
- File downloads: `file_access`
- File deletions: `file_delete`

Logs include:
- Actor (user performing action)
- Resource (file ID and anagrafica ID)
- Timestamp
- Additional context (category, filename, etc.)

---

## Usage Examples

### Example 1: Upload Passport

```javascript
import { uploadFiles, FILE_CATEGORIES } from '@/actions/files/files';

// User uploads passport document
const result = await uploadFiles({
  anagraficaId: 'person-123',
  files: [{
    name: 'passport.pdf',
    type: 'application/pdf',
    size: 2048000,
    buffer: fileBuffer,
    displayName: 'Passport - John Doe'
  }],
  category: FILE_CATEGORIES.IDENTITY,
  tags: ['passport', 'identity-document'],
  expirationDate: '2030-05-15',
  structureId: 'main-office'
});

if (result.success) {
  console.log(`Uploaded ${result.uploadedCount} file(s)`);
}
```

### Example 2: List and Display Files

```javascript
import { getFiles } from '@/actions/files/files';

// Get all files for display
const result = await getFiles('person-123');

if (result.success) {
  result.files.forEach(file => {
    console.log(`${file.nome} (${file.category})`);
    console.log(`  Size: ${file.dimensione} bytes`);
    console.log(`  Uploaded: ${file.dataCreazione}`);
    console.log(`  Downloads: ${file.accessCount}`);

    if (file.dataScadenza) {
      const expiry = new Date(file.dataScadenza);
      const now = new Date();
      if (expiry < now) {
        console.log(`  ⚠️ EXPIRED`);
      } else {
        console.log(`  Expires: ${file.dataScadenza}`);
      }
    }
  });
}
```

### Example 3: Download with Error Handling

```javascript
import { getFileUrl } from '@/actions/files/files';

async function downloadFile(fileId) {
  try {
    const result = await getFileUrl(fileId);

    if (result.error) {
      console.error('Download failed:', result.message);
      return null;
    }

    // Open in new window or trigger download
    window.open(result.url, '_blank');

    // Or use fetch to download programmatically
    const response = await fetch(result.url);
    const blob = await response.blob();
    // ... handle blob

    return result.url;

  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}
```

### Example 4: Batch Upload with Validation

```javascript
import { uploadFiles, FILE_CATEGORIES } from '@/actions/files/files';

async function uploadMultipleFiles(anagraficaId, fileInputs, structureId) {
  // Prepare files array
  const files = [];

  for (const input of fileInputs) {
    // Validate client-side first
    if (input.size > 10 * 1024 * 1024) {
      console.warn(`File ${input.name} too large, skipping`);
      continue;
    }

    const buffer = await input.arrayBuffer();
    files.push({
      name: input.name,
      type: input.type,
      size: input.size,
      buffer: Buffer.from(buffer)
    });
  }

  if (files.length === 0) {
    return { error: true, message: 'No valid files to upload' };
  }

  // Upload
  const result = await uploadFiles({
    anagraficaId,
    files,
    category: FILE_CATEGORIES.DOCUMENT,
    structureId
  });

  if (result.success) {
    console.log(`Successfully uploaded ${result.uploadedCount} files`);
    if (result.errorCount > 0) {
      console.warn(`Failed to upload ${result.errorCount} files`);
    }
  }

  return result;
}
```

### Example 5: File Management Dashboard

```javascript
import {
  getFiles,
  getFileStats,
  deleteFile,
  updateFileMetadata,
  FILE_CATEGORIES
} from '@/actions/files/files';

async function showFileDashboard(anagraficaId) {
  // Get statistics
  const stats = await getFileStats(anagraficaId);
  console.log('=== File Statistics ===');
  console.log(`Total Files: ${stats.stats.totalFiles}`);
  console.log(`Total Size: ${(stats.stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Expired: ${stats.stats.expired}`);
  console.log('\nBy Category:');
  Object.entries(stats.stats.byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  // Get all files
  const files = await getFiles(anagraficaId);

  // Find expired files
  const now = new Date();
  const expired = files.files.filter(f =>
    f.dataScadenza && new Date(f.dataScadenza) < now
  );

  console.log(`\n=== Expired Files (${expired.length}) ===`);
  expired.forEach(f => {
    console.log(`${f.nome} - expired ${f.dataScadenza}`);
  });

  // Optionally update or delete expired files
  // for (const file of expired) {
  //   await deleteFile(file.id);
  // }
}
```

---

## Migration Notes

### Coexistence with Old System

The new file management system can coexist with the existing accessi file system:

- **Old System**: Files embedded in `accessi.services[].files[]`
- **New System**: Files in dedicated `files` collection

Both can work simultaneously. You can:
1. Continue using old system for accessi-specific files
2. Use new system for standalone file uploads
3. Gradually migrate old files to new system

### Migration Strategy (Future)

To migrate old files to the new system:

1. Query all accessi records
2. For each file in `services[].files[]`:
   - Create new `files` collection document
   - Link to original accesso (`accessoId`)
   - Preserve all metadata
   - Keep original file in storage (same path)
3. Update application to use new system
4. Eventually remove file arrays from accessi

---

## Best Practices

### 1. Always Use Categories

```javascript
// Good
uploadFiles({
  category: FILE_CATEGORIES.LEGAL,
  // ...
});

// Avoid
uploadFiles({
  category: 'some-random-string',
  // ...
});
```

### 2. Add Descriptive Tags

```javascript
// Good
tags: ['passport', 'identity', '2024', 'renewal']

// Less useful
tags: ['file', 'document']
```

### 3. Set Expiration Dates for Time-Sensitive Documents

```javascript
// Good for documents that expire
uploadFiles({
  expirationDate: '2025-12-31',
  // ...
});
```

### 4. Handle Errors Gracefully

```javascript
const result = await uploadFiles({ /* ... */ });

if (result.error) {
  // Show user-friendly error
  alert('Failed to upload file: ' + result.message);
} else if (result.errorCount > 0) {
  // Some files failed
  alert(`Uploaded ${result.uploadedCount} files, ${result.errorCount} failed`);
}
```

### 5. Invalidate Cache After Mutations

The system automatically handles this, but be aware:
- Upload → invalidates `files-{anagraficaId}` cache
- Delete → invalidates `files-{anagraficaId}` cache
- Update metadata → invalidates cache

---

## Troubleshooting

### File Upload Fails

**Problem**: Upload returns error

**Check**:
1. File size (must be ≤ 10MB)
2. File type (must be in allowed list)
3. User permissions (must have access to anagrafica)
4. Structure permissions (user must belong to structureId)

### Can't Download File

**Problem**: `getFileUrl` returns error

**Check**:
1. File exists and is not deleted
2. User has permission to access anagrafica
3. Signed URL hasn't expired (1 hour)

### Files Not Appearing in List

**Problem**: `getFiles` returns empty array

**Check**:
1. Files are linked to correct anagraficaId
2. Files are not soft-deleted
3. Cache hasn't stale (wait 5 minutes or invalidate)

### Large File Upload Timeout

**Problem**: Upload times out for large files

**Solution**:
- Implement chunked upload (future enhancement)
- Reduce max file size limit
- Use compression before upload

---

## Future Enhancements

Planned improvements:
- [ ] Chunked upload for large files
- [ ] Image thumbnails generation
- [ ] PDF preview generation
- [ ] Virus scanning integration
- [ ] Bulk download (zip multiple files)
- [ ] File versioning
- [ ] File sharing with expiring links
- [ ] Advanced search and filtering
- [ ] File duplicates detection
- [ ] Storage quota management

---

## Support

For questions or issues with the file management system:
1. Check this documentation
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details
3. Check audit logs for operation history
4. Contact the development team

---

**Last Updated**: February 5, 2026
