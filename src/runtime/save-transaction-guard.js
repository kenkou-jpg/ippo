// ============================================================
// ippo – src/runtime/save-transaction-guard.js
// saveState をトランザクション化。
// 保存前スナップショット → 保存実行 → localStorage 検証 の 3フェーズ。
// 失敗時は警告ログ（自動ロールバックは rollback-manager に委譲）。
//
// install() は main.js 側で state.js import 後に呼び出す。
// 提供: window.ippoSaveTransactionGuard
// ============================================================

import { logError, logWarning } from './health-monitor.js';
import { takeSnapshot } from './rollback-manager.js';

var _installed = false;

function install() {
  if (_installed) return;

  var _original = window.saveState;
  if (typeof _original !== 'function') {
    console.warn('[ippo SaveTransactionGuard] window.saveState not found, guard skipped');
    return;
  }

  window.saveState = function guardedSaveState() {
    var metrics = window.ippoHealthMonitor && window.ippoHealthMonitor.metrics;

    // Phase 1: pre-save snapshot
    var snap = takeSnapshot('pre-save');

    // Phase 2: 実際の保存
    try {
      var result = _original.call(this);
      if (metrics) metrics.saveCount++;

      // Phase 3: localStorage 検証
      try {
        var stateKey = window.STATE_KEY || 'ippo_state';
        var stored   = localStorage.getItem(stateKey);
        if (!stored) {
          logWarning('save-verify-empty', { reason: 'localStorage empty after save' });
        } else {
          var parsed       = JSON.parse(stored);
          var storedCount  = (parsed.records || []).length;
          var currentCount = snap ? snap.recordCount : 0;
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

      return result;
    } catch (saveErr) {
      if (metrics) metrics.saveFailCount++;
      logError('save-transaction-failed', { message: saveErr.message });
      console.error('[ippo SaveTransactionGuard] save failed:', saveErr);
      throw saveErr;
    }
  };

  _installed = true;
  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('save-transaction-guard-installed');
  }
}

window.ippoSaveTransactionGuard = { install: install };

export { install };
