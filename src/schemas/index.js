/**
 * Schema exports
 * Centralized validation schemas for API inputs
 */

// Common utilities
export {
  validateRequest,
  removeProtectedFields,
  PROTECTED_FIELDS,
  uidSchema,
  emailSchema,
  phoneSchema,
  safeStringSchema,
  optionalSafeString,
  dateStringSchema,
  stringArraySchema,
  idTokenSchema,
} from './common';

// Anagrafica schemas
export {
  updateAnagraficaSchema,
  createAnagraficaSchema,
  anagraficaQuerySchema,
  validateAnagraficaUpdate,
  validateAnagraficaCreate,
} from './anagrafica';

// Auth schemas
export {
  sessionLoginSchema,
  passwordResetSchema,
  emailVerificationSchema,
  validateSessionLogin,
} from './auth';

// User schemas
export {
  createUserSchema,
  updateUserSchema,
  userStructureSchema,
  profileUpdateSchema,
  validateCreateUser,
  validateUpdateUser,
  validateProfileUpdate,
} from './user';
