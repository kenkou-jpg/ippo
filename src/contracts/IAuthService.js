// IAuthService — contract for authentication and permission checks.
// Wraps Supabase auth; the implementation detail stays behind this interface.
// Implementations replace the legacy auth-service.js integration in PR-019.
export class IAuthService {
  /**
   * @returns {Promise<object|null>}  { id, email, ... } or null when unauthenticated
   */
  getCurrentUser() {
    throw new Error('Not Implemented: IAuthService.getCurrentUser');
  }

  /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>}  { user, session }
   */
  signIn(email, password) {
    throw new Error('Not Implemented: IAuthService.signIn');
  }

  /**
   * @returns {Promise<void>}
   */
  signOut() {
    throw new Error('Not Implemented: IAuthService.signOut');
  }

  /**
   * Check whether the current user holds the given permission.
   * @param {string} permission  e.g. 'case:read', 'case:export', 'admin'
   * @returns {Promise<boolean>}
   */
  hasPermission(permission) {
    throw new Error('Not Implemented: IAuthService.hasPermission');
  }

  /**
   * Subscribe to auth state changes.
   * @param {(user: object|null) => void} callback
   * @returns {{ unsubscribe: () => void }}
   */
  onAuthStateChange(callback) {
    throw new Error('Not Implemented: IAuthService.onAuthStateChange');
  }
}
