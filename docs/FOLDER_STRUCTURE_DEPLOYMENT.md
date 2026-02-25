# Folder Structure Feature - Deployment Guide

## Overview

This guide covers the deployment and testing of the new Google Drive-style folder structure feature for file management in the GPC application.

## What Was Built

### Phase 1: Data Layer (Backend)
- ✅ 9 server actions for complete folder CRUD operations
- ✅ Enhanced file upload with folder support
- ✅ Migration script for existing files
- ✅ Firestore indexes for optimal query performance
- ✅ Cache management with tag-based invalidation
- ✅ Full audit logging for all operations

### Phase 2: UI Components (Frontend)
- ✅ 3 custom hooks for data fetching and operations
- ✅ FileBrowser main container component
- ✅ Folder tree sidebar navigation
- ✅ File list table with drag-drop support
- ✅ Breadcrumb navigation
- ✅ Upload and folder management dialogs
- ✅ Integrated into anagrafica detail page

---

## Pre-Deployment Checklist

### 1. Verify File Structure

Ensure all files exist:

```
src/
├── actions/files/
│   ├── files.js (UPDATED - with folderId support)
│   └── folders.js (NEW - 9 server actions)
├── components/Files/
│   ├── FileBrowser.jsx (NEW)
│   ├── Breadcrumbs/
│   │   └── FolderBreadcrumbs.jsx (NEW)
│   ├── FolderTree/
│   │   └── FolderTree.jsx (NEW)
│   ├── FileList/
│   │   └── FileListTable.jsx (NEW)
│   └── Dialogs/
│       ├── CreateFolderDialog.jsx (NEW)
│       └── UploadFilesDialog.jsx (NEW)
├── hooks/
│   ├── useFolderTree.js (NEW)
│   ├── useFileOperations.js (NEW)
│   └── useFolderOperations.js (NEW)
├── lib/
│   ├── cache.js (UPDATED - folder cache tags)
│   └── utils.js (UPDATED - formatBytes function)
├── config/
│   └── constants.js (UPDATED - FOLDERS collection)
└── scripts/
    └── migrateFilesToFolders.js (NEW)

firestore.indexes.json (NEW)
```

### 2. Check Dependencies

Ensure these packages are installed:

```bash
npm list material-react-table
npm list @dnd-kit/core
npm list @dnd-kit/sortable
npm list date-fns
npm list sonner
```

If missing, install:

```bash
npm install material-react-table @dnd-kit/core @dnd-kit/sortable date-fns sonner
```

---

## Deployment Steps

### Step 1: Deploy Firestore Indexes

**IMPORTANT**: Deploy indexes BEFORE running migration to avoid query errors.

```bash
cd /Users/mramos/Documents/OneBridge/GPC/gpc
firebase deploy --only firestore:indexes
```

Wait for indexes to build (can take several minutes):
```bash
firebase firestore:indexes
```

Expected output:
```
✓ folders (anagraficaId, deleted, parentFolderId)
✓ folders (anagraficaId, deleted, depth, nome)
✓ files (anagraficaId, deleted, folderId, createdAt)
```

### Step 2: Test Migration Script (Dry Run)

**Test with a small sample first:**

```bash
node src/scripts/migrateFilesToFolders.js --dry-run --limit=5
```

Review the output:
- Check that 9 folders would be created per anagrafica
- Verify files would be assigned to correct folders
- Ensure no errors

### Step 3: Run Full Migration

**Backup your database first!**

```bash
# Full migration
node src/scripts/migrateFilesToFolders.js

# Or with custom batch size
node src/scripts/migrateFilesToFolders.js --batch-size=20
```

Monitor the output:
- Track progress (X/Y anagrafica processed)
- Note any errors
- Record statistics (folders created, files migrated)

### Step 4: Build and Deploy Application

```bash
# Build the application
npm run build

# Check for build errors
# If successful, deploy to production
```

### Step 5: Verify Integration

Check that the FileBrowser appears on anagrafica detail pages:

1. Navigate to any anagrafica record
2. Scroll down to see "Files & Documents" section
3. Verify folder tree shows 9 default folders
4. Test file upload functionality

---

## Testing Checklist

### Basic Operations

- [ ] **View Folder Tree**
  - Navigate to anagrafica detail page
  - Verify 9 default folders appear (DOCUMENT, IDENTITY, LEGAL, etc.)
  - Click folders to expand/collapse

- [ ] **Navigate with Breadcrumbs**
  - Click folder in tree
  - Verify breadcrumb path updates
  - Click breadcrumb items to navigate back

- [ ] **Create Folder**
  - Click "+" button in folder tree
  - Enter folder name
  - Verify folder appears in tree

- [ ] **Upload Files**
  - Click "Upload" button
  - Select target folder from dropdown
  - Drag files to dropzone or browse
  - Verify files appear in folder

- [ ] **Drag & Drop Files**
  - Drag a file row
  - Drop on a folder row
  - Verify file moves to target folder

### Advanced Operations

- [ ] **Rename Folder**
  - Click context menu (⋮) on folder
  - Select "Rename"
  - Enter new name
  - Verify folder name updates

- [ ] **Move Folder**
  - Click context menu on folder
  - Select "Move"
  - Choose new parent folder
  - Verify folder moves correctly

- [ ] **Delete Folder**
  - Create test folder
  - Click context menu > "Delete"
  - Confirm deletion
  - Verify folder disappears

- [ ] **Delete Folder with Contents**
  - Create folder with files
  - Try to delete (should warn)
  - Confirm cascade delete
  - Verify all contents deleted

- [ ] **Download File**
  - Click context menu on file
  - Select "Download"
  - Verify file downloads

- [ ] **Delete File**
  - Click context menu on file
  - Select "Delete"
  - Confirm deletion
  - Verify file removed

### Edge Cases

- [ ] **Max Depth Limit**
  - Create nested folders up to 5 levels
  - Try to create 6th level
  - Should show error message

- [ ] **Circular Reference Prevention**
  - Create parent and child folders
  - Try to move parent into child
  - Should show error message

- [ ] **Protected Folders**
  - Try to delete default category folders
  - Try to rename default category folders
  - Both should show error or be disabled

- [ ] **Long File Names**
  - Upload file with very long name
  - Verify truncation with ellipsis
  - Verify full name in tooltip

- [ ] **Large File Upload**
  - Try to upload file > 10MB
  - Should show size error

- [ ] **Multiple File Selection**
  - Upload multiple files at once
  - Verify all files appear
  - Check upload progress

### Performance Tests

- [ ] **Large Folder Tree**
  - Create 20+ folders
  - Verify tree loads quickly
  - Test expand/collapse performance

- [ ] **Large File List**
  - Upload 50+ files
  - Test pagination
  - Test sorting and filtering

- [ ] **Drag Performance**
  - Drag file over multiple folders
  - Verify smooth visual feedback
  - Check no lag or stuttering

---

## Troubleshooting

### Issue: "Missing index" error

**Symptom**: Console error about missing Firestore index

**Solution**:
```bash
firebase deploy --only firestore:indexes
firebase firestore:indexes  # Check build status
```

### Issue: Files not appearing after migration

**Symptom**: Folders created but files missing

**Check**:
1. Run migration script with `--dry-run --limit=1`
2. Check console output for errors
3. Verify file documents have `folderId` field in Firestore

**Fix**:
```bash
# Re-run migration
node src/scripts/migrateFilesToFolders.js
```

### Issue: Drag-drop not working

**Symptom**: Cannot drag files to folders

**Check**:
1. Browser console for errors
2. Verify `@dnd-kit/core` is installed
3. Check if MaterialReactTable is loading

**Fix**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable
npm run build
```

### Issue: Upload dialog not appearing

**Symptom**: Click upload button, nothing happens

**Check**:
1. Browser console for errors
2. Verify all dialog components exist
3. Check if folders are loaded

**Fix**:
- Refresh page
- Check network tab for failed requests
- Verify folders collection has data

### Issue: Permission denied errors

**Symptom**: 403 errors when creating folders or uploading files

**Check**:
1. User has correct structure permissions
2. `structureId` is being passed correctly
3. Firestore security rules allow operations

**Fix**:
- Verify user's `structureIds` in operators collection
- Check if anagrafica's `canBeAccessedBy` includes user's structures

---

## Rollback Plan

If issues occur after deployment:

### 1. Disable UI (Quick Fix)

Comment out FileBrowser integration:

```javascript
// src/app/(portal)/[structureId]/anagrafica/[id]/page.js

// Comment out:
// <FileBrowser
//   anagraficaId={anagrafica.id}
//   structureId={structureId}
// />
```

Redeploy:
```bash
npm run build
# Deploy
```

### 2. Revert Migration (if needed)

**NOTE**: Files are not deleted, only `folderId` is added. To revert:

1. Remove `folderId` field from files (optional, doesn't break anything)
2. Delete folders collection (if desired)

```javascript
// Script to remove folderId (run with caution)
const snapshot = await db.collection('files').get();
const batch = db.batch();
snapshot.docs.forEach(doc => {
  batch.update(doc.ref, { folderId: admin.firestore.FieldValue.delete() });
});
await batch.commit();
```

### 3. Full Rollback

Revert to previous git commit:
```bash
git log  # Find commit before folder structure
git revert <commit-hash>
git push
```

---

## Monitoring

### Key Metrics to Watch

1. **Query Performance**
   - Check Firestore console for slow queries
   - Monitor index usage

2. **Error Rates**
   - Check application logs for errors
   - Monitor audit logs for failed operations

3. **User Feedback**
   - Track user reports of issues
   - Monitor support tickets

### Firestore Console Checks

1. Navigate to Firestore console
2. Check `folders` collection:
   - Should have ~9 folders per anagrafica
   - Verify `isDefaultCategory` flag on defaults
3. Check `files` collection:
   - All files should have `folderId` field
   - Old `category` field preserved

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Collect user feedback
- [ ] Fix any critical bugs

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Optimize slow queries if needed
- [ ] Plan Phase 3 enhancements

### Future Enhancements
- [ ] Add file rename dialog (currently uses prompt)
- [ ] Add move folder dialog with tree selector
- [ ] Add file preview/viewer
- [ ] Add keyboard shortcuts
- [ ] Mobile responsive improvements
- [ ] Bulk operations UI

---

## Support

For issues or questions:
1. Check this guide first
2. Review error logs
3. Check Firestore console
4. Contact development team

---

## Success Criteria

The deployment is considered successful when:

✅ All Firestore indexes deployed
✅ Migration completed with 0 errors
✅ FileBrowser appears on all anagrafica pages
✅ Users can create folders and upload files
✅ Drag-drop works smoothly
✅ No permission errors
✅ Performance is acceptable (< 2s page load)
✅ No data loss or corruption

---

**Last Updated**: 2026-02-06
**Version**: 1.0.0
