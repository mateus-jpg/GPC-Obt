# Security and Claims Documentation - GPC

**Generated:** 2026-01-18  
**Purpose:** Document the usage of Firebase Custom Claims and Firestore user data, assess coherence, and identify potential security issues.

---

## Table of Contents
1. [Data Model Overview](#data-model-overview)
2. [Authentication Flow](#authentication-flow)
3. [Authorization Mechanisms](#authorization-mechanisms)
4. [Security Assessment](#security-assessment)
5. [Recommendations](#recommendations)

---

## Data Model Overview

### Collections

#### 1. `operators` Collection
Stores user/operator information with the following structure:
```javascript
{
  uid: string,              // Firebase Auth UID
  email: string,
  displayName: string,
  role: string,             // 'admin' | 'user' | 'structure_admin'
  structureIds: string[],   // Array of structure IDs user has access to
  // ... other fields
}
```

#### 2. `users` Collection
**Purpose:** Fallback/legacy collection that mirrors `operators` structure.  
**Current Usage:** Some parts of the codebase check both `operators` and `users` collections.

**⚠️ ISSUE IDENTIFIED:** Inconsistent usage between `operators` and `users` collections.

#### 3. `structures` Collection
Stores organizational structures:
```javascript
{
  id: string,
  name: string,
  admins: string[],         // Array of UIDs who are admins of this structure
  // ... other fields
}
```

#### 4. Firebase Auth Custom Claims
Used to store authorization metadata directly in the Firebase Auth token:
```javascript
{
  role: string,             // 'admin' | 'user' | 'structure_admin'
  structureId: string,      // Legacy: single structure ID
  admin: boolean            // Future: flag for super admin (not currently used)
}
```

---

## Authentication Flow

### Client-Side Authentication
Location: [`src/context/AuthContext.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/context/AuthContext.js)

1. User signs in with email/password via `signInWithEmail`
2. Firebase Auth generates ID token
3. Token sent to `/api/sessionLogin` to create session cookie
4. System fetches user from `operators` collection and merges with auth data
5. User object stored in React Context with `structureIds` populated

### Server-Side Authentication
Location: [`src/utils/server-auth.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/utils/server-auth.js)

**Entry Point:** `requireUser()`
- Extracts `x-user-uid` header (set by middleware from session cookie)
- Returns `{ userUid, headers }` or throws if unauthorized

---

## Authorization Mechanisms

### 1. Permission Checking Functions

#### `requireUser()`
**Purpose:** Basic authentication check  
**Returns:** `{ userUid, headers }`  
**Throws:** If `x-user-uid` header is missing

#### `verifyUserPermissions({ userUid, structureId, allowedStructures })`
**Purpose:** Verify user has access to a structure/resource  
**Logic:**
1. Fetches user from `operators` collection (fallback to `users`)
2. Checks if user's `structureIds` includes the requested `structureId`
3. If `allowedStructures` provided, checks for intersection with user's structures

**⚠️ ISSUE IDENTIFIED:** Does not check `role` field for super admin bypass

#### `verifyStructureAdmin({ userUid, structureId })`
**Purpose:** Verify user is an admin of a specific structure OR a global admin  
**Logic:**
1. Checks if `role === 'admin'` (global admin) → returns true
2. Checks if user is in structure's `admins` array → returns true
3. Otherwise throws error

**✅ SECURITY:** Properly escalates to global admin

#### `verifySuperAdmin({ userUid })` *(NEW)*
**Purpose:** Verify user is a Super Admin  
**Logic:**
1. Checks `operators/{uid}` for `role === 'admin'`
2. Fallback checks `users/{uid}` for `role === 'admin'`
3. Throws if not authorized

**✅ SECURITY:** Properly restricts to super admin only

---

### 2. Current Authorization Patterns

#### Pattern A: Database Role-Based (RBAC)
**Used in:**
- `verifyStructureAdmin` - checks `role` in Firestore
- `verifySuperAdmin` - checks `role` in Firestore
- Structure admin actions

**Data Source:** Firestore `operators` or `users` collection  
**Field:** `role` (string)  
**Values:** `'admin'`, `'structure_admin'`, `'user'`

#### Pattern B: Custom Claims (Not Actively Used)
**Defined in:**
- [`UserClaimsDialog.jsx`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/components/admin/UserClaimsDialog.jsx) - UI to set claims
- [`listAllUsers`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/admin/users.js) - returns `customClaims`

**⚠️ CRITICAL ISSUE:** Custom claims can be set via UI but are **NOT** used for authorization decisions in the backend. This creates a false sense of security.

#### Pattern C: Structure-Based Access Control
**Used in:**
- Anagrafica access control
- Event permissions
- Most resource access

**Logic:**
1. Resource has `canBeAccessedBy` or `structureIds` array
2. User has `structureIds` array
3. Access granted if arrays intersect

---

## Security Assessment

### ✅ Strengths

1. **Multi-layer authentication**: Session cookies + Firebase Auth
2. **Structure isolation**: Resources properly scoped to structures
3. **Explicit permission checks**: Most actions verify user permissions before execution
4. **Admin escalation**: Super admins bypass structure-specific checks

### 🔴 Critical Issues

#### 1. **Dual Collection Inconsistency**
**Severity:** HIGH  
**Files Affected:**
- [`server-auth.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/utils/server-auth.js)
- [`events.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/anagrafica/events.js)
- [`route.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/app/api/anagrafica/[id]/route.js)

**Issue:** Some code checks `operators`, some checks `users`, some checks both.

**Example from `route.js`:**
```javascript
// GET uses 'operators'
const userRef = adminDb.collection('operators').doc(userUid);

// PATCH and DELETE use 'users'
const userRef = adminDb.collection('users').doc(userUid);
```

**Impact:**
- Authorization bypass if user exists in one collection but not the other
- Data inconsistency
- Difficult to maintain and audit

**Fix Required:** Standardize on a single collection OR always check both with consistent logic.

---

#### 2. **Custom Claims Not Enforced**
**Severity:** HIGH  
**Files Affected:**
- [`UserClaimsDialog.jsx`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/components/admin/UserClaimsDialog.jsx)
- [`setUserClaims`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/admin/users.js)

**Issue:** Admin UI allows setting Custom Claims on users, but backend authorization uses Firestore `role` field instead of claims.

**Impact:**
- Admins may set claims thinking they grant permissions
- Actual permissions come from Firestore, not claims
- Confusing security model
- Potential privilege escalation if future code relies on claims without proper validation

**Fix Options:**
1. **Option A (Recommended):** Use Custom Claims as the source of truth for roles
   - Update all `verifyX` functions to check claims first
   - Keep Firestore `role` as backup/cache
   - Sync claims to Firestore for queries

2. **Option B:** Remove Custom Claims entirely
   - Remove `setUserClaims` action
   - Remove claims UI
   - Use Firestore exclusively

---

#### 3. **Missing Permission Check in Events**
**Severity:** MEDIUM  
**File:** [`events.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/anagrafica/events.js)

**Issue:** Lines 53-56 show commented-out fallback to `users` collection:
```javascript
let operatorDoc = await adminDb.collection('operators').doc(userUid).get();
/*   if (!operatorDoc.exists) {
    operatorDoc = await adminDb.collection('users').doc(userUid).get();
  } */
```

**Impact:** If a user exists only in `users` collection, they cannot create events even if they should have access.

**Fix Required:** Uncomment fallback or migrate all users to `operators`.

---

### ⚠️ Medium Issues

#### 4. **Super Admin Bypass Not Universal**
**Severity:** MEDIUM

**Issue:** `verifySuperAdmin` checks for global admin, but `verifyUserPermissions` does NOT bypass structure checks for super admins.

**Example:** A super admin must still have the `structureId` in their `structureIds` array to access resources.

**Expected Behavior:** Super admins should bypass all structure-based restrictions.

**Fix:** Update `verifyUserPermissions` to check for `role === 'admin'` and skip structure validation.

---

#### 5. **No Audit Trail for Permission Changes**
**Severity:** MEDIUM

**Issue:** `setUserClaims` and `toggleStructureAdminStatus` do not log who made changes or when.

**Impact:** Cannot audit security incidents or unauthorized permission escalation.

**Fix:** Add audit logging to Firestore collection for all permission changes.

---

#### 6. **Inconsistent Error Messages**
**Severity:** LOW

**Issue:** Some errors expose internal details ("Operator not found"), others are generic ("Forbidden").

**Impact:** Information leakage, harder to debug for legitimate users.

**Fix:** Standardize error messages with proper logging.

---

## Recommendations

### Immediate Actions (Critical)

1. **✅ COMPLETED:** Add `verifySuperAdmin` check to:
   - `listAllUsers` ✅
   - `setUserClaims` ✅

2. **🔴 HIGH PRIORITY:** Standardize user collection usage
   - **Recommended:** Use `operators` as primary, always fallback to `users`
   - Update all files to use consistent helper function
   - Create migration script to move `users` → `operators`

3. **🔴 HIGH PRIORITY:** Resolve Custom Claims vs Firestore Role conflict
   - **Recommended:** Use Custom Claims as source of truth
   - Update auth helpers to check claims first
   - Keep Firestore role synchronized for query purposes

### Short-term Actions

4. **Enable Super Admin Bypass**
   - Update `verifyUserPermissions` to check `role === 'admin'` before structure validation

5. **Add Audit Logging**
   - Create `audit_logs` collection
   - Log all permission changes with timestamp, actor, target, action

6. **Uncomment Fallback in Events**
   - Fix line 54-56 in `events.js`

### Long-term Actions

7. **Implement Role-Based Access Control (RBAC) Framework**
   - Define clear permission system
   - Document all roles and their capabilities
   - Centralize permission checking logic

8. **Add Integration Tests**
   - Test all permission scenarios
   - Test super admin bypass
   - Test structure isolation

9. **Security Audit**
   - Review all server actions for missing permission checks
   - Ensure client cannot bypass server-side validation
   - Check for injection vulnerabilities

---

## Coherence Assessment

### Current State: ⚠️ PARTIALLY COHERENT

**Strengths:**
- Clear separation between authentication (who you are) and authorization (what you can do)
- Structure-based access control is consistently applied
- Admin escalation hierarchy exists

**Weaknesses:**
- Dual collection pattern creates confusion and potential security gaps
- Custom Claims UI suggests functionality that doesn't exist in backend
- Inconsistent super admin bypass behavior
- No clear documentation of permission model

### Recommended Target State: ✅ COHERENT

```
Authentication: Firebase Auth (session cookies)
        ↓
Authorization Source of Truth: Custom Claims + Firestore Role (synchronized)
        ↓
Permission Levels:
  1. Super Admin (role: 'admin') → Full access
  2. Structure Admin (in structure.admins[]) → Manage structure + users
  3. User (structureIds: [...]) → Access resources in assigned structures
        ↓
Enforcement Points:
  - Server actions (via verifyX helpers)
  - API routes (via middleware + manual checks)
  - Client UI (via context + claims)
```

---

## Files Audited

### Core Security Files
- ✅ [`src/utils/server-auth.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/utils/server-auth.js)
- ✅ [`src/actions/admin/users.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/admin/users.js)
- ✅ [`src/actions/admin/structure.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/admin/structure.js)
- ✅ [`src/context/AuthContext.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/context/AuthContext.js)

### Action Files
- ✅ [`src/actions/anagrafica/events.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/actions/anagrafica/events.js)
- ✅ [`src/app/api/anagrafica/[id]/route.js`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/app/api/anagrafica/[id]/route.js)

### UI Components
- ✅ [`src/components/admin/UserClaimsDialog.jsx`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/components/admin/UserClaimsDialog.jsx)
- ✅ [`src/components/admin/UsersTable.jsx`](file:///Users/mramos/Documents/OneBridge/GPC/gpc/src/components/admin/UsersTable.jsx)

---

## Final Assessment

### Overall Security Posture: ⚠️ MODERATE

The application has a reasonable security foundation with proper authentication and structure-based access control. However, **critical inconsistencies** in the dual collection pattern and the unused Custom Claims system create potential security vulnerabilities and confusion.

### Critical Issues: 3
- Dual collection inconsistency
- Custom Claims not enforced
- Missing fallback in events

### Priority Actions:
1. ✅ Implement super admin checks (COMPLETED)
2. 🔴 Standardize collection usage (URGENT)
3. 🔴 Resolve Custom Claims conflict (URGENT)

### Risk Level: **MEDIUM-HIGH**
The system is functional but has exploitable gaps. Immediate action recommended on critical issues.
