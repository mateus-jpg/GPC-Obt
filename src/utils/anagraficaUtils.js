/**
 * Utility functions for anagrafica operations
 * These are NOT server actions - they are pure utility functions
 */

// Define the group fields that we track for history
export const ANAGRAFICA_GROUPS = [
  'anagrafica',
  'nucleoFamiliare',
  'legaleAbitativa',
  'lavoroFormazione',
  'vulnerabilita',
  'referral'
];

/**
 * Compute which groups have changed between old and new data
 * @param {Object} oldData - Previous anagrafica data
 * @param {Object} newData - New data being applied
 * @returns {Object} Object with changedGroups array and changes object
 */
export function computeGroupChanges(oldData, newData) {
  const changedGroups = [];
  const changes = {};

  for (const group of ANAGRAFICA_GROUPS) {
    const oldGroup = oldData[group];
    const newGroup = newData[group];

    // Skip if newGroup is not being updated
    if (newGroup === undefined) continue;

    // Check if the group has changed
    const oldJson = JSON.stringify(oldGroup || {});
    const newJson = JSON.stringify(newGroup || {});

    if (oldJson !== newJson) {
      changedGroups.push(group);
      changes[group] = {
        before: oldGroup || null,
        after: newGroup || null
      };
    }
  }

  return { changedGroups, changes };
}
