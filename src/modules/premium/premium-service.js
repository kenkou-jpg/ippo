// ============================================================
//  ippo – src/modules/premium/premium-service.js
//  Premium Source of Truth: subscriptions テーブル（単一参照源）
//  Realtime 購読で即時反映。setInterval ポーリングはフォールバック専用。
//
//  ADR-003: profiles.is_premium 廃止 → subscriptions テーブルへ移行
// ============================================================

import { supabase } from '../../services/supabase.js';

var SYNC_INTERVAL_MS     = 5 * 60 * 1000;
var AUTH_WAIT_TIMEOUT_MS = 20000;

export var PREMIUM_CACHE_KEY = 'ippo_premium_cached';
var _CACHE_KEY          = PREMIUM_CACHE_KEY;

// オフライン再起動時の fallback: localStorage から初期値を読む
var _isPremiumValue = (function () {
  try { return localStorage.getItem(_CACHE_KEY) === 'true'; } catch (_) { return false; }
})();
var _syncInterval      = null;
var _syncActive        = false;
var _timeoutHandle     = null;
var _authReadyRunning  = false;
var _realtimeChannel   = null;

// ─── 購読者へ変化を通知 ─────────────────────────────────────
function _dispatchUpdate() {
  window.dispatchEvent(new CustomEvent('ippo:premium-updated', {
    detail: { isPremium: _isPremiumValue },
  }));
}

// ─── subscriptions テーブルから取得 ──────────────────────────
async function _fetchPremiumFromDB() {
  try {
    var session = (await supabase.auth.getSession()).data?.session;
    if (!session) {
      _isPremiumValue = false;
      try { localStorage.setItem(_CACHE_KEY, 'false'); } catch (_) {}
      _dispatchUpdate();
      return;
    }

    var { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.warn('[premium-service] subscriptions fetch error', error);
      _dispatchUpdate();
      return;
    }

    var now     = new Date();
    var expired = data?.current_period_end && new Date(data.current_period_end) < now;
    _isPremiumValue = !!(data?.status === 'active' && !expired);
    try { localStorage.setItem(_CACHE_KEY, String(_isPremiumValue)); } catch (_) {}
    _dispatchUpdate();
  } catch (e) {
    console.warn('[premium-service] _fetchPremiumFromDB error', e);
  }
}

// ─── Realtime 購読 ────────────────────────────────────────────
function _setupRealtime(userId) {
  if (_realtimeChannel) {
    supabase.removeChannel(_realtimeChannel);
    _realtimeChannel = null;
  }
  _realtimeChannel = supabase
    .channel('subscriptions:' + userId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'subscriptions',
      filter: 'user_id=eq.' + userId,
    }, function (payload) {
      var row     = payload.new || payload.old || {};
      var expired = row.current_period_end && new Date(row.current_period_end) < new Date();
      _isPremiumValue = !!(row.status === 'active' && !expired);
      try { localStorage.setItem(_CACHE_KEY, String(_isPremiumValue)); } catch (_) {}
      _dispatchUpdate();
    })
    .subscribe();
}

// ─── Public: isPremium ───────────────────────────────────────
export function isPremium() {
  return _isPremiumValue;
}

// ─── Public: refreshPremiumStatus ───────────────────────────
export async function refreshPremiumStatus() {
  await _fetchPremiumFromDB();
}

// ─── onAuthReady handler ─────────────────────────────────────
async function _onAuthReady() {
  if (_authReadyRunning) return;
  _authReadyRunning = true;
  try {
    stopPremiumSync();

    var session = (await supabase.auth.getSession()).data?.session;
    await _fetchPremiumFromDB();

    if (session) {
      _setupRealtime(session.user.id);
    }

    // フォールバック定期同期 (Realtime が切断された場合の保険)
    _syncInterval = setInterval(_fetchPremiumFromDB, SYNC_INTERVAL_MS);
    _syncActive   = true;

    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('premium-service:auth-ready-triggered', { isPremium: _isPremiumValue });
    }
  } finally {
    _authReadyRunning = false;
  }
}

// モジュール読み込み時点で once リスナーを登録（startPremiumSync() より先に auth-ready が発火しても取りこぼさない）
window.addEventListener('ippo:auth-ready', _onAuthReady, { once: true });

// ─── Public: startPremiumSync ────────────────────────────────
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

// ─── Public: stopPremiumSync ─────────────────────────────────
export function stopPremiumSync() {
  _syncActive = false;
  if (_syncInterval)    { clearInterval(_syncInterval);             _syncInterval    = null; }
  if (_timeoutHandle)   { clearTimeout(_timeoutHandle);             _timeoutHandle   = null; }
  if (_realtimeChannel) { supabase.removeChannel(_realtimeChannel); _realtimeChannel = null; }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('premium-service:stopped');
  }
}

// ─── checkPremiumRegistered ─────────────────────────────────
// 決済完了フォームの表示切替（app-bootstrap.js から呼ばれる）
export function checkPremiumRegistered() {
  if (localStorage.getItem('ippo_premium_registered')) {
    var form = document.getElementById('premium-form-area');
    var done = document.getElementById('premium-done');
    if (form) form.style.display = 'none';
    if (done) done.style.display = 'block';
  }
}

// app-bootstrap.js が直接 import に移行するまでの互換グローバル
window.checkPremiumRegistered = checkPremiumRegistered;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('premium-service-loaded');
}
