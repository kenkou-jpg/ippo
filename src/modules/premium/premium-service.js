// ============================================================
//  ippo – src/modules/premium/premium-service.js
//  Phase 5: Premium Module Extraction
//
//  責務:
//    - premium polling の ownership を premium module へ移行
//    - startPremiumSync() / stopPremiumSync() により timer 制御を一元化
//    - ippo:auth-ready イベントを受けて premium check を実行
//    - app-legacy.js の premiumCheckInterval を段階的に引き継ぐ
//
//  設計:
//    - app-legacy.js の onAuthStateChange 登録は transitional bridge として存続
//    - premium-service は ippo:auth-ready 以降の premium 再確認を担当
//    - 将来: app-legacy.js の premiumCheckInterval 完全除去後に
//      startPremiumSync() がメイン polling になる
//
//  提供: window.ippoPremiumService
//  依存: window.checkPremiumStatus (app-legacy.js)、ippo:auth-ready event
//
//  AUDIT: timer=bounded
//    _syncInterval は startPremiumSync → auth-ready で自己停止。
//    auth-ready 未発火時は AUTH_WAIT_TIMEOUT_MS (20s) でタイムアウト停止。
// ============================================================

var AUTH_WAIT_TIMEOUT_MS = 20000;  // auth-ready 待ち最大時間

// ─── Internal state ───────────────────────────────────────
var _syncInterval   = null;
var _syncActive     = false;
var _timeoutHandle  = null;
var _authReadyBound = false;

// ─── Helpers ──────────────────────────────────────────────
function _callCheckPremium() {
  try {
    if (typeof window.checkPremiumStatus === 'function') {
      window.checkPremiumStatus();
    }
  } catch (e) {
    console.warn('[ippoPremiumService] checkPremiumStatus error', e);
  }
}

// ─── onAuthReady handler ──────────────────────────────────
function _onAuthReady() {
  stopPremiumSync();
  _callCheckPremium();

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('premium-service:auth-ready-triggered');
  }
}

// ─── startPremiumSync ─────────────────────────────────────
// 起動: ippo:auth-ready を待ち、到達したら premium check を実行。
// app-legacy.js の premiumCheckInterval が既に動作中の場合も安全に共存。
export function startPremiumSync() {
  if (_syncActive) return;
  _syncActive = true;

  if (!_authReadyBound) {
    _authReadyBound = true;
    window.addEventListener('ippo:auth-ready', _onAuthReady, { once: true });
  }

  // タイムアウト保護: 20s で ippo:auth-ready が来なかった場合は停止
  _timeoutHandle = setTimeout(function () {
    if (_syncActive) {
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

// ─── stopPremiumSync ──────────────────────────────────────
export function stopPremiumSync() {
  _syncActive = false;

  if (_syncInterval)  { clearInterval(_syncInterval);  _syncInterval  = null; }
  if (_timeoutHandle) { clearTimeout(_timeoutHandle);  _timeoutHandle = null; }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('premium-service:stopped');
  }
}

// ─── isPremium ────────────────────────────────────────────
function _isPremium() {
  // auth-service 経由（推奨）
  if (window.ippoAuthService && typeof window.ippoAuthService.isPremium === 'function') {
    return window.ippoAuthService.isPremium();
  }
  // app-legacy.js bridge 経由（fallback）
  if (typeof window.isAdminOrPremium === 'function') {
    return window.isAdminOrPremium();
  }
  return false;
}

// ─── Public API ───────────────────────────────────────────
window.ippoPremiumService = {
  startPremiumSync: startPremiumSync,
  stopPremiumSync:  stopPremiumSync,
  isPremium:        _isPremium,
  isActive:         function () { return _syncActive; },
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('premium-service-loaded');
}
