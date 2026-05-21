// ============================================================
// ippo – src/runtime/save-transaction-guard.js
// saveState をトランザクション化。
// 保存前スナップショット → 保存実行 → localStorage 検証 の 3フェーズ。
// 失敗時は警告ログ（自動ロールバックは rollback-manager に委譲）。
//
// install() は main.js 側で state.js import 後に呼び出す。
// 提供: window.ippoSaveTransactionGuard
//
// A-4: window.saveState パッチを廃止し、state.js の addPreSaveHook /
// addPostSaveHook にフックとして登録する方式に変更。
// これにより direct import / window.saveState どちら経由でも guard が動作する。
// ============================================================

import { logError, logWarning } from './health-monitor.js';
import { takeSnapshot } from './rollback-manager.js';
import { addPreSaveHook, addPostSaveHook } from '../store/state.js';

var _installed = false;
var _snap = null;

function _preSave() {
  _snap = takeSnapshot('pre-save');
  var metrics = window.ippoHealthMonitor && window.ippoHealthMonitor.metrics;
  if (metrics) metrics._pendingSave = true;
}

function _postSave(err) {
  var metrics = window.ippoHealthMonitor && window.ippoHealthMonitor.metrics;
  if (err) {
    if (metrics) metrics.saveFailCount++;
    logError('save-transaction-failed', { message: err.message });
    console.error('[ippo SaveTransactionGuard] save failed:', err);
    return;
  }

  if (metrics) {
    metrics.saveCount++;
    metrics._pendingSave = false;
  }

  // Phase 3: localStorage 検証
  try {
    var stateKey = window.STATE_KEY || 'ippo_state';
    var stored   = localStorage.getItem(stateKey);
    if (!stored) {
      logWarning('save-verify-empty', { reason: 'localStorage empty after save' });
    } else {
      var parsed       = JSON.parse(stored);
      var storedCount  = (parsed.records || []).length;
      var currentCount = _snap ? _snap.recordCount : 0;
      if (storedCount < currentCount) {
        logWarning('save-verify-count-mismatch', {
          storedCount:  storedCount,
          expectedCount: currentCount,
        });
      }
    }
  } catch (verifyErr) {
    logWarning('save-verify-error', { message: verifyErr.message });
  }
}

function install() {
  if (_installed) return;

  addPreSaveHook(_preSave);
  addPostSaveHook(_postSave);

  _installed = true;
  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('save-transaction-guard-installed');
  }
}

window.ippoSaveTransactionGuard = { install: install };

export { install };
