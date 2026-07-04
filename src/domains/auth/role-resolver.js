// RoleResolver — derives the application role from the auth adapter's state.
// PR-020: Auth Domain Migration

export class RoleResolver {
  /**
   * @param {{ isAdmin?: boolean, isPremium?: boolean }|null} authState
   * @returns {'admin'|'user'|'guest'}
   */
  resolve(authState) {
    if (!authState) return 'guest';
    if (authState.isAdmin) return 'admin';
    return 'user';
  }
}
