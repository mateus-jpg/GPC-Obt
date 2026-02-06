Google Drive-Style Folder Structure Implementation Plan
Overview
Add hierarchical folder structure to the file management system, integrated into anagrafica detail pages. Users can organize files in custom folder hierarchies, with the 9 existing categories (IDENTITY, LEGAL, MEDICAL, etc.) converted to default top-level folders.

User Requirements
Location: Integrated into existing /[structureId]/anagrafica/[id] pages (not a global view)
Categories: Convert 9 existing categories to default folders, allow creating more at any level
Operations: Create/rename/delete folders, drag-drop files between folders, move/copy folders with contents
Permissions: Use existing structure-based permissions (no folder-level permissions)
Data Model
New folders Collection

{
  id: "auto-generated",
  nome: "Passports",

  // Hierarchy
  anagraficaId: "anagrafica123",
  parentFolderId: null,              // null = root level
  path: "/IDENTITY/Passports",        // Denormalized for breadcrumbs
  depth: 1,                           // 0=root, max 5

  // Metadata
  isDefaultCategory: true,            // True for 9 default folders
  category: "IDENTITY",               // Maps to FILE_CATEGORIES

  // Access Control (inherited from anagrafica)
  structureIds: ["struct1"],

  // Audit
  createdAt, createdBy, updatedAt,

  // Soft Delete
  deleted: false, deletedAt, deletedBy
}
Updated files Collection
Add new field:

folderId: Required folder ID (replaces category-based organization)
Keep category field for backward compatibility during migration
Required Firestore Indexes

{
  "indexes": [
    {
      "collectionGroup": "folders",
      "fields": [
        { "fieldPath": "anagraficaId", "order": "ASCENDING" },
        { "fieldPath": "deleted", "order": "ASCENDING" },
        { "fieldPath": "parentFolderId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "files",
      "fields": [
        { "fieldPath": "anagraficaId", "order": "ASCENDING" },
        { "fieldPath": "deleted", "order": "ASCENDING" },
        { "fieldPath": "folderId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
Implementation Steps
Phase 1: Server Actions (Data Layer)
Create /src/actions/files/folders.js with operations:


// Core CRUD
export async function createFolder({ anagraficaId, nome, parentFolderId, structureId })
export async function renameFolder({ folderId, newName, structureId })
export async function deleteFolder({ folderId, cascade, structureId })
export async function moveFolder({ folderId, newParentFolderId, structureId })

// Queries
export async function getFolderTree(anagraficaId)
export async function getFolderContents({ folderId, includeSubfolders })

// File operations
export async function moveFileToFolder({ fileId, targetFolderId, structureId })
export async function moveFilesToFolder({ fileIds, targetFolderId, structureId })

// Initialization
export async function initializeDefaultFolders(anagraficaId, structureIds)
Update /src/actions/files/files.js:

Modify uploadFiles() to accept folderId instead of category
Update getFiles() to support folder filtering
Auto-initialize default folders on first file operation
Key Implementation Details:

Use transactions for folder moves to prevent race conditions
Recursively update path field when renaming/moving folders
Validate max depth of 5 levels
Prevent moving folder into its own descendant (circular reference)
Protect default category folders from deletion (check isDefaultCategory)
Implement cascade delete with user confirmation
Add comprehensive audit logging for all operations
Phase 2: UI Components
Component Structure:


src/components/Files/
├── FileBrowser.jsx                 # Main container with sidebar + content
├── FolderTree/
│   ├── FolderTree.jsx             # Collapsible tree navigation
│   ├── FolderTreeItem.jsx         # Individual folder with expand/collapse
│   └── FolderActions.jsx          # Rename/Delete/Move dropdown menu
├── FileList/
│   ├── FileListTable.jsx          # MaterialReactTable with drag-drop
│   ├── FileRow.jsx                # Draggable file row
│   └── FileActions.jsx            # File context menu
├── Breadcrumbs/
│   └── FolderBreadcrumbs.jsx      # Navigation path
├── Dialogs/
│   ├── CreateFolderDialog.jsx     # New folder form
│   ├── RenameFolderDialog.jsx     # Rename folder
│   ├── MoveFolderDialog.jsx       # Folder tree selector for move
│   ├── UploadFilesDialog.jsx      # Enhanced with folder selector
│   └── DeleteFolderDialog.jsx     # Delete confirmation with cascade option
└── hooks/
    ├── useFolderTree.js           # SWR hook for folder tree
    ├── useFileOperations.js       # Drag-drop handlers
    └── useFolderOperations.js     # Folder CRUD operations
FileBrowser Layout:


┌─────────────────────────────────────────┐
│ Breadcrumbs: / > IDENTITY > Passports  │  Upload Button
├──────────┬──────────────────────────────┤
│ Folders  │  Files & Subfolders          │
│          │  ┌────────────────────────┐  │
│ 📁 ROOT  │  │ Name | Size | Modified │  │
│ 📁 IDEN..│  ├────────────────────────┤  │
│  📁 Pass │  │ 📁 Subfolder1          │  │ <- Draggable
│  📁 Visa │  │ 📄 passport.pdf       │  │ <- Draggable
│ 📁 LEGAL │  │ 📄 visa_copy.jpg      │  │
│ 📁 MEDIC │  └────────────────────────┘  │
│          │                              │
└──────────┴──────────────────────────────┘
Drag & Drop Implementation:

Use @dnd-kit/core and @dnd-kit/sortable (already available)
Files draggable to folders (visual drop zone highlight)
Multi-select support (drag multiple files at once)
Folders draggable to other folders (with circular reference check)
Visual feedback during drag (cursor, opacity, drop indicator)
MaterialReactTable Integration:

Combine folders + files in single table view
Different icons for folders vs files (Folder/File from lucide-react)
Double-click folder to navigate into it
Right-click context menu for operations
Enable row selection for batch operations
Phase 3: Cache Management
Update /src/lib/cache.js:


export const CACHE_TAGS = {
  // ... existing
  folders: (anagraficaId) => `folders-${anagraficaId}`,
  folder: (folderId) => `folder-${folderId}`,
  folderContents: (folderId) => `folder-contents-${folderId}`,
};

export function invalidateFolderCaches(anagraficaId, affectedFolderIds = []) {
  revalidateTag(CACHE_TAGS.folders(anagraficaId));
  for (const folderId of affectedFolderIds) {
    revalidateTag(CACHE_TAGS.folder(folderId));
    revalidateTag(CACHE_TAGS.folderContents(folderId));
  }
  invalidateFilesCache(anagraficaId);
}
Invalidation Rules:

Create folder: folders(anagraficaId) + folderContents(parentFolderId)
Rename folder: folder(folderId) + all child folderContents
Delete folder: folders(anagraficaId) + folderContents(parentFolderId)
Move folder: folders(anagraficaId) + old/new parent folderContents
Move file: old and new folderContents(folderId)
Phase 4: Migration Strategy
Migration Script (src/scripts/migrateFilesToFolders.js):

For each anagrafica:

Create 9 default folders (DOCUMENT, IDENTITY, LEGAL, MEDICAL, EMPLOYMENT, EDUCATION, HOUSING, FINANCIAL, OTHER)
Set isDefaultCategory: true and category field
Set parentFolderId: null (root level)
For each existing file:

Look up folder ID based on file's category field
Update file with folderId
Keep category field for backward compatibility
Execution:

Run on staging environment first
Use Firestore batch writes (500 operations max)
Add progress logging
Implement retry logic for failures
Make folderId required after 100% migration
Backward Compatibility:

Keep category field on files during transition period
Support both old getFiles(anagraficaId, { category }) and new getFiles(anagraficaId, { folderId })
Old file upload API continues working (auto-assign to category folder)
Remove legacy support after 3-6 months
Phase 5: Integration with Anagrafica Page
Update /src/app/(portal)/[structureId]/anagrafica/[id]/page.js:

Replace current files section with:


<FileBrowser
  anagraficaId={anagrafica.id}
  structureId={structureId}
/>
Position: Between Anagrafica info card and Accessi section

Critical Files to Modify/Create
CREATE /src/actions/files/folders.js - All folder server actions
CREATE /src/components/Files/FileBrowser.jsx - Main container component
CREATE /src/components/Files/FileList/FileListTable.jsx - Table with drag-drop
MODIFY /src/actions/files/files.js - Add folderId support to existing functions
MODIFY /src/lib/cache.js - Add folder cache tags and invalidation
MODIFY /src/config/constants.js - Add FOLDERS to COLLECTIONS
CREATE /src/scripts/migrateFilesToFolders.js - One-time migration script
Edge Cases & Validation
Circular References: Check if target is descendant before moving folder
Max Depth: Validate depth ≤ 5 before creating subfolder
Default Folder Protection: Prevent deletion of folders with isDefaultCategory: true
Empty Folder Check: Warn before deleting non-empty folder (or cascade with confirmation)
Name Conflicts: Allow duplicate folder names (like macOS) OR enforce unique per parent
Concurrent Operations: Use Firestore transactions for critical operations
Large Batch Operations: Use batch writes for moving 500+ files
Orphaned Files: Prevent orphaned files by validating folderId on operations
Security
All operations require requireUser() authentication
Verify user has access to anagrafica via verifyUserPermissions()
Folders inherit structureIds from parent anagrafica
No folder-level permissions (keeps it simple)
Comprehensive audit logging for all folder operations
Testing & Verification
Manual Testing Checklist
Folder CRUD:

 Create folder at root level
 Create subfolder (nested 3 levels deep)
 Rename folder (verify breadcrumbs update)
 Delete empty folder
 Delete folder with files (cascade confirmation)
 Try to delete default category folder (should fail)
File Operations:

 Upload file to specific folder
 Drag file to different folder
 Drag multiple files to folder
 Download file (existing functionality)
 Delete file from folder
Folder Navigation:

 Click folder in tree to expand/collapse
 Double-click folder in table to navigate
 Use breadcrumbs to navigate back
 Navigate to root level
Folder Move:

 Move folder to different parent
 Move folder to root level
 Try to move folder into its own subfolder (should fail)
 Verify all subfolders/files move with parent
Edge Cases:

 Create folder with very long name (50+ chars)
 Create 6th level folder (should fail - max depth 5)
 Two users modifying same folder simultaneously
 Upload file while folder is being deleted
Migration:

 Run migration script on test anagrafica
 Verify all files assigned to correct folders
 Verify 9 default folders created
 Old file upload API still works
Automated Tests
Server Action Tests (__tests__/actions/folders.test.js):

Test folder creation with valid/invalid data
Test rename with path updates
Test delete with cascade
Test circular reference detection
Test permission validation
Component Tests (__tests__/components/FileBrowser.test.jsx):

Test folder tree rendering
Test breadcrumb navigation
Test drag-drop handlers
Test dialog open/close
Performance Considerations
Folder Tree: Fetch entire tree once, cache client-side with SWR
Lazy Load: Only fetch folder contents when user navigates to it
Pagination: Use MaterialReactTable pagination for large file lists
Batch Operations: Single server action for moving multiple files
Path Updates: Use Firestore batch writes for recursive updates
Denormalized Path: Store path string to avoid recursive queries for breadcrumbs
Implementation Timeline
Week 1: Server actions + migration script (Phase 1)
Week 2: Core UI components (Phase 2)
Week 3: Dialogs + drag-drop (Phase 2)
Week 4: Integration + migration (Phase 3 & 4)
Week 5: Polish + testing (Phase 5)
Success Metrics
Users can navigate folder hierarchy intuitively
Drag-drop works smoothly with visual feedback
All existing files successfully migrated to folders
No permissions bypassed (security maintained)
Page load time < 2s for 1000 files
Zero data loss during migration