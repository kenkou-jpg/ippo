// PermissionPolicy — declarative permission rules per role.
// user  → own records/cases/similarity only
// admin → all user permissions + network statistics
// PR-020: Auth Domain Migration

const POLICY = {
  user: new Set([
    'record:read',
    'record:write',
    'experiment:read',
    'experiment:write',
    'case:read:own',
    'consent:read',
    'consent:write',
    'similarity:read:own',
  ]),
  admin: new Set([
    'record:read',
    'record:write',
    'experiment:read',
    'experiment:write',
    'case:read:own',
    'case:read:all',
    'consent:read',
    'consent:write',
    'similarity:read:own',
    'similarity:read:all',
    'network:stats:read',
    'admin:dashboard',
  ]),
  guest: new Set([]),
};

export class PermissionPolicy {
  /**
   * @param {'user'|'admin'|'guest'} role
   * @param {string} permission
   * @returns {boolean}
   */
  allows(role, permission) {
    return (POLICY[role] ?? POLICY.guest).has(permission);
  }

  /**
   * @param {'user'|'admin'|'guest'} role
   * @returns {Set<string>}
   */
  permissionsFor(role) {
    return new Set(POLICY[role] ?? POLICY.guest);
  }
}
