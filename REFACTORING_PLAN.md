# Refactoring Plan: GPC Codebase Optimization

## Overview
This plan outlines the steps to refactor the GPC codebase to improve maintainability, reduce code duplication, enhance security, and polish the user experience. The focus is on the `Anagrafica` and `Access` modules.

## Phase 1: Backend Standardization & Security
**Goal**: Centralize authentication and permission logic to reduce duplication and potential security risks.

### 1.1 Create Auth Middleware Helper
- [x] Create `src/utils/server-auth.js`:
  - Export a function `requireUser(headers)` that returns `userUid`.
  - Export a function `verifyUserPermissions(userUid, requiredStructureId, allowedStructures)` that checks DB records.
  - **Benefit**: Removes ~20 lines of duplicated code per server action.

### 1.2 Refactor Server Actions
- [x] Update the following files to use the new helpers:
  - `src/actions/anagrafica/anagrafica.js`:
    - `createAnagrafica`
    - `getAnagrafica`
    - `updateAnagrafica`
    - `deleteAnagrafica`
  - `src/actions/anagrafica/access.js`:
    - `createAccessAction`
    - `getAccessAction`
    - `getAccessFileUrl`

### 1.3 Unify File Handling
- [x] Review base64 handling in `access.js`. Ensure it handles all mime types correctly.
- [x] Ensure `stripHtml` is consistently applied.

## Phase 2: Frontend Modularization
**Goal**: Break down the monolithic `new/page.jsx` (~600 lines) into manageable, reusable components.

### 2.1 Refactor Anagrafica Form
- [x] Split `src/app/(portal)/[structureId]/new/page.jsx` into:
  - `src/components/Anagrafica/Form/PersonalInfoSection.jsx`
  - `src/components/Anagrafica/Form/FamilyUnitSection.jsx`
  - `src/components/Anagrafica/Form/LegalStatusSection.jsx`
  - `src/components/Anagrafica/Form/WorkEducationSection.jsx`
  - `src/components/Anagrafica/Form/VulnerabilitySection.jsx`
  - `src/components/Anagrafica/Form/ReferralSection.jsx`

### 2.2 Centralize Form Data Constants
- [x] Move hardcoded arrays (e.g., "Situazione legale", "Situazione lavorativa") to `src/data/formOptions.js` or `src/config/constants.js`.
- **Benfit**: Easier to update options globally.

## Phase 3: UI/UX & Quality of Life
**Goal**: Remove "dev-only" artifacts and improve user feedback.

### 3.1 Better Error Handling
- [x] Replace `alert()` calls with a Toast notification system (e.g., `sonner` or `shadcn/ui-toast`).
- [x] Standardize error messages from server actions.

### 3.2 Loading States
- [x] Ensure Buttons show loading spinners (already partially implemented, but verify consistency).
- [ ] Add specific skeleton loaders for data fetching.

## Execution Order
1. **Phase 1 (Backend)**: Critical for security and code health. (COMPLETED)
2. **Phase 2 (Frontend)**: Critical for maintainability. (COMPLETED)
3. **Phase 3 (UX)**: Polish. (PARTIALLY COMPLETED - Toasts added)

## Proposed File Changes
- `src/utils/server-auth.js` (NEW - DONE)
- `src/actions/anagrafica/*.js` (MODIFY - DONE)
- `src/data/formOptions.js` (NEW - DONE)
- `src/app/(portal)/[structureId]/new/page.jsx` (MODIFY - DONE)
- `src/components/Anagrafica/Form/*.jsx` (NEW - DONE)
- `src/app/layout.js` (MODIFY - DONE)
- `src/components/Anagrafica/AccessDialog/AccessDialog.jsx` (MODIFY - DONE)
