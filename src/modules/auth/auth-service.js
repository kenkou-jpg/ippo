// ============================================================
//  ippo – src/modules/auth/auth-service.js
//  Phase 2: Auth Module Extraction
//
//  責務:
//    - auth state の single source of truth
//    - supabaseUserId bridge から auth service ownership へ移行
//    - auth lifecycle event dispatch (ippo:auth-ready / failed / skipped)
//    - window.supabaseUserId bridge の transitional 管理
//
//  Lifecycle:
//    INITIAL → RESTORING → AUTH_READY | AUTH_FAILED | AUTH_SKIPPED
//
//  提供: window.ippoAuthService
//
//  ロード順: app-legacy.js より前 (main.js で先行 import)
//  依存: なし (state.js 非依存)
// ============================================================

export var AUTH_LIFECYCLE = Object.freeze({
  INITIAL:      'INITIAL',
  RESTORING:    'RESTORING',
  AUTH_READY:   'AUTH_READY',
  AUTH_FAILED:  'AUTH_FAILED',
  AUTH_SKIPPED: 'AUTH_SKIPPED',
});

// ─── Internal state (single source of truth) ──────────────
var _auth = {
  lifecycle:  AUTH_LIFECYCLE.INITIAL,
  userId:     null,
  token:      null,
  isReady:    false,
  isPremium:  false,
  isAdmin:    false,
  at:         null,
};

// ─── Helpers ──────────────────────────────────────────────
function _iso() { try { return new Date().toISOString(); } catch (_) { return ''; } }

// ─── getAuthState ─────────────────────────────────────────
export function getAuthState() {
  return Object.assign({}, _auth);
}

// ─── setAuthState ─────────────────────────────────────────
// 内部 _auth を更新し、window bridge を同期する。
export function setAuthState(key, value) {
  _auth = Object.assign({}, _auth, typeof key === 'object' ? key : { [key]: value });
  _auth.at = _iso();

  // window.supabaseUserId 橋渡し (transitional compat)
  if (typeof _auth.userId !== 'undefined') {
    try { window.supabaseUserId = _auth.userId || null; } catch(_) {}
  }

  // brain への状態同期
  if (window.ippoBrain && typeof window.ippoBrain.setAuthState === 'function') {
    window.ippoBrain.setAuthState('authReady',    _auth.isReady);
    window.ippoBrain.setAuthState('supabaseReady', _auth.isReady);
  }
}

// ─── Lifecycle transitions ────────────────────────────────
export function markRestoring() {
  setAuthState({ lifecycle: AUTH_LIFECYCLE.RESTORING, isReady: false });
  _dispatchEvent('ippo:auth-restoring', {});
}

export function markAuthReady(userId, token) {
  setAuthState({
    lifecycle: AUTH_LIFECYCLE.AUTH_READY,
    userId:    userId  || null,
    token:     token   || null,
    isReady:   true,
  });
  _dispatchEvent('ippo:auth-ready', { userId: userId });

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('auth-service:auth-ready', { userId: userId });
  }
}

export function markAuthFailed(reason) {
  setAuthState({
    lifecycle: AUTH_LIFECYCLE.AUTH_FAILED,
    isReady:   false,
  });
  _dispatchEvent('ippo:auth-failed', { reason: reason || 'unknown' });

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('auth-service:auth-failed', { reason: reason });
  }
}

export function markAuthSkipped(reason) {
  setAuthState({
    lifecycle: AUTH_LIFECYCLE.AUTH_SKIPPED,
    isReady:   false,
    userId:    null,
    token:     null,
  });
  _dispatchEvent('ippo:auth-skipped', { reason: reason || 'no-session' });

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('auth-service:auth-skipped', { reason: reason });
  }
}

// Premium status update (called from checkPremiumStatus bridge)
export function setPremiumStatus(isPremium, isAdmin) {
  setAuthState({ isPremium: !!isPremium, isAdmin: !!isAdmin });
}

// ─── Internal event dispatch ──────────────────────────────
function _dispatchEvent(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  } catch (_) {}
}

// ─── Public API ───────────────────────────────────────────
window.ippoAuthService = {
  // State access
  getAuthState:     getAuthState,
  setAuthState:     setAuthState,

  // Lifecycle
  markRestoring:    markRestoring,
  markAuthReady:    markAuthReady,
  markAuthFailed:   markAuthFailed,
  markAuthSkipped:  markAuthSkipped,
  setPremiumStatus: setPremiumStatus,

  // Convenience accessors
  isReady:    function () { return _auth.isReady; },
  getUserId:  function () { return _auth.userId; },
  isPremium:  function () { return _auth.isPremium; },
  isAdmin:    function () { return _auth.isAdmin; },
  getLifecycle: function () { return _auth.lifecycle; },

  // Constants
  AUTH_LIFECYCLE: AUTH_LIFECYCLE,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('auth-service-loaded');
}
