// PermissionService — the single gate for permission decisions.
// All auth checks in the application layer must flow through this service.
// PR-020: Auth Domain Migration
import { PermissionPolicy }        from './permission-policy.js';
import { RoleResolver }            from './role-resolver.js';
import { AuthContext, UserSession } from './auth-context.js';

export class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export class PermissionService {
  #authService;
  #policy;
  #roleResolver;

  /** @param {import('../../contracts/IAuthService.js').IAuthService} authService */
  constructor(authService) {
    this.#authService  = authService;
    this.#policy       = new PermissionPolicy();
    this.#roleResolver = new RoleResolver();
  }

  /**
   * Build an AuthContext from the current auth adapter state.
   * @returns {Promise<AuthContext>}
   */
  async getAuthContext() {
    const user = await this.#authService.getCurrentUser();
    if (!user) return AuthContext.guest();
    const role    = this.#roleResolver.resolve(user);
    const session = new UserSession({
      id:        user.id,
      email:     user.email     ?? null,
      role,
      isAdmin:   user.isAdmin   ?? false,
      isPremium: user.isPremium ?? false,
    });
    return new AuthContext(session);
  }

  /**
   * Assert the current user holds the given permission. Throws AuthError if not.
   * @param {string} permission
   * @returns {Promise<AuthContext>}
   */
  async require(permission) {
    const ctx = await this.getAuthContext();
    if (!ctx.isAuthenticated) throw new AuthError('Unauthenticated', 'UNAUTHENTICATED');
    if (!this.#policy.allows(ctx.role, permission)) {
      throw new AuthError(`Permission denied: ${permission}`, 'FORBIDDEN');
    }
    return ctx;
  }

  /**
   * Non-throwing permission check.
   * @param {string} permission
   * @returns {Promise<boolean>}
   */
  async check(permission) {
    try {
      await this.require(permission);
      return true;
    } catch (_) {
      return false;
    }
  }
}
