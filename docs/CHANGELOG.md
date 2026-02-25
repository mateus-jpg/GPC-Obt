# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.2.0] - 2026-02-07

### Added
- **Anagrafica Modular Data Architecture**: Implemented separation of global identity data and structure-specific situation data.
  - New `anagrafica_data` Firestore collection for per-structure data.
  - `getAnagraficaInternal` now fetches and merges data from all associated structures.
  - `updateAnagraficaInternal` automatically routes field changes to the correct collection.
  - `createHistoryEntry` supports routing history to global or structure-specific collections.
- **Cross-Structure Data Visibility**: Structures can now view read-only data from other authorized structures.
  - New `OtherStructuresInfo` component displays data from other structures on the view page.
  - `otherStructuresData` field returned by `getAnagrafica` action.
- **Migration Script**: Added `js_scripts/migrate_anagrafica_modular.js` to split existing data into the new modular structure.
  - Supports dry-run mode.
  - Supports custom limits for batch processing.

### Changed
- **`anagrafica` Collection Schema**: Now stores only global identity fields (`anagrafica` group, `codiceFiscale`, access control, metadata).
- **`getAnagrafica` Server Action**: Now accepts an optional `structureId` parameter for context.
- **History Tracking**: History is now split between `anagrafica/{id}/history` (global changes) and `anagrafica_data/{id}/history` (structure-specific changes).

### Fixed
- Serialization errors when passing Firestore Timestamps from Server Components to Client Components in `getAuthUserData`, `listAllUsers`, and `getAnagraficaInternal`.

---

## [1.1.0] - 2026-02-06

### Added
- Project-based organization hierarchy (Projects > Structures).
- Project Admin and Structure Admin roles.
- Comprehensive audit logging system.
- File management module with independent file uploads.

### Changed
- Improved caching strategy with tag-based invalidation.

---

## [1.0.0] - 2025-12-01

### Added
- Initial release of GPC.
- Anagrafica and Accessi management.
- Multi-tenant architecture with structure-based permissions.
- Firebase Authentication and Firestore integration.
