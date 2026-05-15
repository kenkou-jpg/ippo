// ============================================================
// ippo – src/runtime/auth-cloud-state-machine.js
// Auth/Cloud State Machine
//
// 責務:
//   - Supabase 可用性の非同期待機（タイムアウト付き）
//   - Cloud restore の状態追跡（IDLE/RESTORING/RESTORED/FAILED/SKIPPED）
//   - 未ログイン時の safe skip 保証
//   - brain への状態レポート（controller が SAFE_CLOUD_MODE へ遷移できるよう）
//   - Promise deadlock 禁止（全パスに timeout 保護）
//
// States:
//   Auth:  INITIAL → CHECKING → READY | NOT_AUTHENTICATED | TIMEOUT
//   Cloud: IDLE → RESTORING → RESTORED | FAILED | SKIPPED
//
// 提供: window.ippoAuthCloudState
//
// AUDIT: status=required
//   POLL_INTERVAL_MS=300ms — burst-only; timer self-clears on first READY or TIMEOUT.
//   AUTH_TIMEOUT_MS=8000   — required; Supabase load is non-deterministic on slow networks.
//   RESTORE_TIMEOUT_MS=15000 — required; cloud restore can be slow on first sync.
//   Polling does NOT run indefinitely — it fires for max 8s then stops.
//   Future: replace with 'supabaseLoaded' CustomEvent if Supabase SDK supports it.
// ============================================================

import { getState } from '../store/state.js';
import { supabase } from '../services/supabase.js';

var AUTH_STATE = Object.freeze({
  INITIAL:           'initial',
  CHECKING:          'checking',
  READY:             'ready',
  NOT_AUTHENTICATED: 'not_authenticated',
  TIMEOUT:           'timeout',
});

var CLOUD_STATE = Object.freeze({
  IDLE:      'idle',
  RESTORING: 'restoring',
  RESTORED:  'restored',
  FAILED:    'failed',
  SKIPPED:   'skipped',
});

// ─── Internal state ────────────────────────────────────────
var _authState  = AUTH_STATE.INITIAL;
var _cloudState = CLOUD_STATE.IDLE;
var _history    = [];
var _supabaseReady = false;

var _pollTimer    = null;
var _restoreTimer = null;

// Tuning constants
var AUTH_TIMEOUT_MS    = 8000;   // Supabase 可用性待ち最大時間
var RESTORE_TIMEOUT_MS = 15000;  // cloud restore 最大時間
var POLL_INTERVAL_MS   = 300;    // Supabase 待ちポーリング間隔

// ─── Helpers ──────────────────────────────────────────────
function _iso() { try { return new Date().toISOString(); } catch (_) { return ''; } }

function _transition(newAuth, newCloud, reason) {
  var changed = false;
  if (newAuth  != null && newAuth  !== _authState)  { _authState  = newAuth;  changed = true; }
  if (newCloud != null && newCloud !== _cloudState) { _cloudState = newCloud; changed = true; }
  if (!changed && !reason) return;

  var entry = {
    auth:   _authState,
    cloud:  _cloudState,
    reason: reason || '',
    at:     _iso(),
  };
  _history.push(entry);
  if (_history.length > 30) _history.shift();

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('auth-cloud-transition', {
      auth:   _authState,
      cloud:  _cloudState,
      reason: reason,
    });
  }
  _reportBrain(reason);
}

// ─── Brain reporting ───────────────────────────────────────
function _reportBrain(reason) {
  if (typeof window.ippoBrain !== 'object') return;

  var outcome = 'ok';
  var errMsg  = null;

  if (_cloudState === CLOUD_STATE.FAILED || _authState === AUTH_STATE.TIMEOUT) {
    outcome = 'error';
    errMsg  = 'auth=' + _authState + ' cloud=' + _cloudState + (reason ? ' reason=' + reason : '');
  } else if (_authState === AUTH_STATE.NOT_AUTHENTICATED) {
    outcome = 'warning';
  }

  var recordCount = null;
  try {
    var s = getState();
    recordCount = s ? (s.records || []).length : null;
  } catch (_) {}

  window.ippoBrain.report({
    phase:        'sync',
    module:       'auth-cloud',
    outcome:      outcome,
    error:        errMsg,
    recordsCount: recordCount,
  });
}

// ─── waitForSupabase ───────────────────────────────────────
// 設計: setInterval による最大 AUTH_TIMEOUT_MS のポーリング。
// タイムアウト後は safe skip（cloud を SKIPPED 状態にして controller が SAFE_CLOUD_MODE へ）。
// onReady コールバックは Supabase 可用時に 1 度だけ呼ばれる。
function waitForSupabase(onReady) {
  if (_authState !== AUTH_STATE.INITIAL) {
    // 二重呼び出し時はコールバックだけ即実行（既に READY なら）
    if (_authState === AUTH_STATE.READY && typeof onReady === 'function') {
      try { onReady(); } catch (_) {}
    }
    return;
  }

  _transition(AUTH_STATE.CHECKING, null, 'waitForSupabase started');

  var elapsed = 0;

  _pollTimer = setInterval(function () {
    elapsed += POLL_INTERVAL_MS;

    var isReady = !!(supabase && typeof supabase.auth === 'object');

    if (isReady) {
      clearInterval(_pollTimer);
      _pollTimer = null;
      _supabaseReady = true;
      _transition(AUTH_STATE.READY, null, 'supabase available after ' + elapsed + 'ms');

      try {
        if (typeof onReady === 'function') onReady();
      } catch (e) {
        if (typeof window.ippoMarkBootError === 'function') {
          window.ippoMarkBootError('auth-cloud-restore-callback-error', { error: String(e) });
        }
      }
      return;
    }

    if (elapsed >= AUTH_TIMEOUT_MS) {
      clearInterval(_pollTimer);
      _pollTimer = null;
      _supabaseReady = false;

      // タイムアウト → SAFE_CLOUD_MODE への遷移を controller に委譲
      window.__ippoCloudRestoreFailed = true;
      _transition(AUTH_STATE.TIMEOUT, CLOUD_STATE.SKIPPED, 'supabase not available after ' + AUTH_TIMEOUT_MS + 'ms');

      if (typeof window.ippoMarkBootWarning === 'function') {
        window.ippoMarkBootWarning('auth-cloud-supabase-timeout', { waitedMs: elapsed });
      }
    }
  }, POLL_INTERVAL_MS);
}

// ─── Cloud restore lifecycle ───────────────────────────────
function markCloudRestoring() {
  if (_cloudState === CLOUD_STATE.RESTORING) return;
  _transition(null, CLOUD_STATE.RESTORING, 'cloud restore started');

  // タイムアウト保護: 15s で未完了なら FAILED
  _restoreTimer = setTimeout(function () {
    if (_cloudState === CLOUD_STATE.RESTORING) {
      window.__ippoCloudRestoreFailed = true;
      _transition(null, CLOUD_STATE.FAILED, 'cloud restore timeout after ' + RESTORE_TIMEOUT_MS + 'ms');
    }
  }, RESTORE_TIMEOUT_MS);
}

function markCloudRestored() {
  if (_restoreTimer) { clearTimeout(_restoreTimer); _restoreTimer = null; }
  window.__ippoCloudRestoreFailed = false;
  _transition(null, CLOUD_STATE.RESTORED, 'cloud restore success');
}

function markCloudFailed(reason) {
  if (_restoreTimer) { clearTimeout(_restoreTimer); _restoreTimer = null; }
  window.__ippoCloudRestoreFailed = true;
  _transition(null, CLOUD_STATE.FAILED, reason || 'cloud restore error');
}

function markCloudSkipped(reason) {
  if (_restoreTimer) { clearTimeout(_restoreTimer); _restoreTimer = null; }
  _transition(null, CLOUD_STATE.SKIPPED, reason || 'cloud skipped');
}

function markNotAuthenticated() {
  _transition(AUTH_STATE.NOT_AUTHENTICATED, CLOUD_STATE.SKIPPED, 'user not logged in - cloud skipped safely');
}

// ─── Cleanup (for testing / restart) ──────────────────────
function _cleanup() {
  if (_pollTimer)    { clearInterval(_pollTimer);   _pollTimer    = null; }
  if (_restoreTimer) { clearTimeout(_restoreTimer); _restoreTimer = null; }
}

// ─── Public API ───────────────────────────────────────────
window.ippoAuthCloudState = {
  // Readable state
  getAuthState:  function () { return _authState; },
  getCloudState: function () { return _cloudState; },
  getHistory:    function () { return _history.slice(); },

  // Readiness flags
  isAuthReady:          function () { return _authState  === AUTH_STATE.READY; },
  isSupabaseReady:      function () { return _supabaseReady; },
  isCloudRestoreReady:  function () { return _cloudState === CLOUD_STATE.RESTORED; },
  isCloudFailed:        function () { return _cloudState === CLOUD_STATE.FAILED; },
  isCloudSkipped:       function () { return _cloudState === CLOUD_STATE.SKIPPED; },
  isNotAuthenticated:   function () { return _authState  === AUTH_STATE.NOT_AUTHENTICATED; },
  isCloudDone:          function () {
    return _cloudState === CLOUD_STATE.RESTORED ||
           _cloudState === CLOUD_STATE.FAILED   ||
           _cloudState === CLOUD_STATE.SKIPPED;
  },

  // State machine actions
  waitForSupabase:     waitForSupabase,
  markCloudRestoring:  markCloudRestoring,
  markCloudRestored:   markCloudRestored,
  markCloudFailed:     markCloudFailed,
  markCloudSkipped:    markCloudSkipped,
  markNotAuthenticated: markNotAuthenticated,

  // Constants (for external inspection)
  AUTH_STATE:  AUTH_STATE,
  CLOUD_STATE: CLOUD_STATE,

  // Internal (for tests)
  _cleanup: _cleanup,
};

// 起動時は __ippoCloudRestoreFailed を未設定にしておく
if (typeof window.__ippoCloudRestoreFailed === 'undefined') {
  window.__ippoCloudRestoreFailed = false;
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('auth-cloud-state-machine-loaded');
}

export {};
