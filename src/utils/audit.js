/**
 * Audit logging utilities for tracking security-sensitive operations
 * Creates an audit trail for compliance and security incident investigation
 */

import { collections } from './database';
import { logger } from './logger';

/**
 * Logs an administrative action to the audit trail
 * 
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action performed (e.g., 'set_user_claims', 'delete_anagrafica')
 * @param {string} params.actorUid - UID of the user performing the action
 * @param {string} [params.targetUid] - UID of the user being acted upon (if applicable)
 * @param {string} [params.resourceId] - ID of the resource being modified (if applicable)
 * @param {string} [params.resourceType] - Type of resource (e.g., 'anagrafica', 'structure')
 * @param {Object} [params.details] - Additional details about the action
 * @param {boolean} [params.success=true] - Whether the action succeeded
 * @returns {Promise<void>}
 */
export async function logAdminAction({
    action,
    actorUid,
    targetUid = null,
    resourceId = null,
    resourceType = null,
    details = {},
    success = true
}) {
    try {
        const auditLog = {
            action,
            actorUid,
            targetUid,
            resourceId,
            resourceType,
            details,
            success,
            timestamp: new Date(),
            // Additional metadata that might be useful
            environment: process.env.NODE_ENV || 'unknown',
        };

        await collections.auditLogs().add(auditLog);

        logger.info('Audit log created', {
            action,
            actorUid,
            targetUid,
            resourceId,
            success
        });
    } catch (error) {
        // Don't let audit logging failures break the operation
        // but do log the error
        logger.error('Failed to create audit log', error, {
            action,
            actorUid,
            targetUid,
            resourceId
        });
    }
}

/**
 * Helper to log user permission changes
 */
export async function logPermissionChange({
    actorUid,
    targetUid,
    changeType,
    details
}) {
    return logAdminAction({
        action: `permission_${changeType}`,
        actorUid,
        targetUid,
        resourceType: 'user_permissions',
        details
    });
}

/**
 * Helper to log resource modifications
 */
export async function logResourceModification({
    actorUid,
    resourceType,
    resourceId,
    action,
    details
}) {
    return logAdminAction({
        action: `${resourceType}_${action}`,
        actorUid,
        resourceType,
        resourceId,
        details
    });
}
