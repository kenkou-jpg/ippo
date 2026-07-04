// LegacyAuthAdapter — wraps auth-service.js + supabase.auth behind IAuthService.
// Application code must use this adapter; direct imports of supabase.js are forbidden
// from features/application layers.
import { IAuthService } from '../../contracts/index.js';
import { assertImplementsContract } from '../../application/architecture-guard.js';
import { getAuthState } from '../../modules/auth/auth-service.js';
import { supabase } from '../../services/supabase.js';

export class LegacyAuthAdapter extends IAuthService {
  /**
   * @returns {Promise<{id: string, email: string|null}|null>}
   */
  async getCurrentUser() {
    const auth = getAuthState();
    if (!auth.isReady || !auth.userId) return null;
    return { id: auth.userId, email: null };
  }

  /**
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, session: object}>}
   */
  async signIn(email, password) {
    if (!supabase) throw new Error('[LegacyAuthAdapter] Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  /**
   * @returns {Promise<void>}
   */
  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Permission check against current auth state.
   * Future: replaced by RLS-backed permission table in PR-019.
   * @param {'admin'|'premium'|'case:read'|'case:export'|string} permission
   * @returns {Promise<boolean>}
   */
  async hasPermission(permission) {
    const auth = getAuthState();
    if (!auth.isReady) return false;
    if (permission === 'admin')   return !!auth.isAdmin;
    if (permission === 'premium') return !!auth.isPremium;
    // case:read / case:export → Tier2+ required; deferred to PR-019
    if (permission.startsWith('case:')) return !!auth.isPremium;
    return false;
  }

  /**
   * @param {(user: object|null) => void} callback
   * @returns {{ unsubscribe: () => void }}
   */
  onAuthStateChange(callback) {
    const handler = (e) => {
      const auth = getAuthState();
      callback(auth.isReady ? { id: auth.userId } : null);
    };
    window.addEventListener('ippo:auth-ready',   handler);
    window.addEventListener('ippo:auth-skipped', () => callback(null));
    return {
      unsubscribe() {
        window.removeEventListener('ippo:auth-ready',   handler);
        window.removeEventListener('ippo:auth-skipped', handler);
      },
    };
  }
}

assertImplementsContract(LegacyAuthAdapter, IAuthService, 'AuthService');
