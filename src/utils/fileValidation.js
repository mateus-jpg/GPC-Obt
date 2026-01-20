/**
 * File validation utilities
 * Provides consistent file validation across the application
 */

// Maximum file size: 10MB
export const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

// Allowed file types
export const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Text
    'text/plain',
    'text/csv',
];

/**
 * Validates a single file
 * 
 * @param {File} file - File to validate
 * @returns {Object} Validation result with isValid flag and error message
 */
export function validateFile(file) {
    if (!file) {
        return {
            isValid: false,
            error: 'No file provided'
        };
    }

    // Check file size
    if (file.size > FILE_SIZE_LIMIT) {
        return {
            isValid: false,
            error: `File size exceeds limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`
        };
    }

    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            isValid: false,
            error: `File type ${file.type} is not allowed`
        };
    }

    return {
        isValid: true,
        error: null
    };
}

/**
 * Validates multiple files
 * 
 * @param {File[]} files - Array of files to validate
 * @returns {Object} Validation result with isValid flag, errors array, and valid files
 */
export function validateFiles(files) {
    if (!Array.isArray(files) || files.length === 0) {
        return {
            isValid: false,
            errors: ['No files provided'],
            validFiles: []
        };
    }

    const results = files.map(file => ({
        file,
        validation: validateFile(file)
    }));

    const errors = results
        .filter(r => !r.validation.isValid)
        .map(r => `${r.file.name}: ${r.validation.error}`);

    const validFiles = results
        .filter(r => r.validation.isValid)
        .map(r => r.file);

    return {
        isValid: errors.length === 0,
        errors,
        validFiles
    };
}

/**
 * Formats file size for display
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
