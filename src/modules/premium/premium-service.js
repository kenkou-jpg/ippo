// ============================================================
//  ippo – src/modules/premium/premium-service.js
//  Premium status is sourced from Supabase DB (profiles table).
//  No localStorage / client-side state manipulation.
// ============================================================

import { supabase } from '../../services/supabase.js';

var SYNC_INTERVAL_MS    = 5 * 60 * 1000; // 5分ごとに再取得
var AUTH_WAIT_TIMEOUT_MS = 20000;

// ─── Internal memory state ────────────────────────────────
export var PREMIUM_CACHE_KEY = 'ippo_premium_cached'; // A-5: 正式化 — state.js の localStorage key 一覧に記載済み
var _CACHE_KEY          = PREMIUM_CACHE_KEY;
// オフライン再起動時の fallback: localStorage から初期値を読む
var _isPremiumValue     = (function() {
  try { return localStorage.getItem(_CACHE_KEY) === 'true'; } catch(_) { return false; }
})();
var _premiumExpiresAt   = null;
var _syncInterval       = null;
var _syncActive         = false;
var _timeoutHandle      = null;
var _authReadyRunning   = false; // re-entrant guard for _onAuthReady

// ─── DB から is_premium を取得 ────────────────────────────
async function _fetchPremiumFromDB() {
  try {
    var session = (await supabase.auth.getSession()).data?.session;
    if (!session) {
      _isPremiumValue   = false;
      _premiumExpiresAt = null;
      return;
    }

    var { data, error } = await supabase
      .from('profiles')
      .select('is_premium, premium_expires_at')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      // DB エラー時はセキュリティ優先で false にリセット（キャッシュも更新）
      _isPremiumValue   = false;
      _premiumExpiresAt = null;
      try { localStorage.setItem(_CACHE_KEY, 'false'); } catch(_) {}
      console.warn('[premium-service] profiles fetch error', error);
      return;
    }

    var now = new Date();
    var expired = data.premium_expires_at && new Date(data.premium_expires_at) < now;
    _isPremiumValue   = !!data.is_premium && !expired;
    _premiumExpiresAt = data.premium_expires_at ?? null;
    try { localStorage.setItem(_CACHE_KEY, String(_isPremiumValue)); } catch(_) {}
  } catch (e) {
    console.warn('[premium-service] _fetchPremiumFromDB error', e);
  }
}

// ─── Public: isPremium ────────────────────────────────────
export function isPremium() {
  return _isPremiumValue;
}

// ─── Public: refreshPremiumStatus ────────────────────────
export async function refreshPremiumStatus() {
  await _fetchPremiumFromDB();
}

// ─── onAuthReady handler ─────────────────────────────────
async function _onAuthReady() {
  // re-entrant guard: 非同期 await 中に再発火しても無視
  if (_authReadyRunning) return;
  _authReadyRunning = true;
  try {
    stopPremiumSync();

    await _fetchPremiumFromDB();

    // 5分ごとに定期同期
    _syncInterval = setInterval(_fetchPremiumFromDB, SYNC_INTERVAL_MS);
    _syncActive   = true;

    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('premium-service:auth-ready-triggered', {
        isPremium: _isPremiumValue,
      });
    }
  } finally {
    _authReadyRunning = false;
  }
}

// ─── Public: startPremiumSync ────────────────────────────
export function startPremiumSync() {
  if (_syncActive) return;
  _syncActive = true;

  _timeoutHandle = setTimeout(function () {
    if (!_syncInterval) {
      stopPremiumSync();
      if (typeof window.ippoMarkBootEvent === 'function') {
        window.ippoMarkBootEvent('premium-service:sync-timeout', { waitedMs: AUTH_WAIT_TIMEOUT_MS });
      }
    }
  }, AUTH_WAIT_TIMEOUT_MS);

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('premium-service:started');
  }
}

// ─── ippo:auth-ready リスナーをモジュール初期化時に登録 ──────
// startPremiumSync() より先に auth-ready が発火しても取りこぼさないよう、
// モジュールロード時点で once リスナーを設定する。
window.addEventListener('ippo:auth-ready', _onAuthReady, { once: true });

// ─── Public: stopPremiumSync ─────────────────────────────
export function stopPremiumSync() {
  _syncActive = false;

  if (_syncInterval)  { clearInterval(_syncInterval);  _syncInterval  = null; }
  if (_timeoutHandle) { clearTimeout(_timeoutHandle);  _timeoutHandle = null; }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('premium-service:stopped');
  }
}

// ─── Public API object ────────────────────────────────────
window.ippoPremiumService = {
  startPremiumSync:     startPremiumSync,
  stopPremiumSync:      stopPremiumSync,
  isPremium:            isPremium,
  refreshPremiumStatus: refreshPremiumStatus,
  isActive:             function () { return _syncActive; },
};

export function checkPremiumRegistered() {
  if (localStorage.getItem('ippo_premium_registered')) {
    var form = document.getElementById('premium-form-area');
    var done = document.getElementById('premium-done');
    if (form) form.style.display = 'none';
    if (done) done.style.display = 'block';
  }
}

window.checkPremiumRegistered = checkPremiumRegistered;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('premium-service-loaded');
}
