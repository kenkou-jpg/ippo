// ============================================================
// ippo – src/runtime/sync-consistency-checker.js
// localStorage / in-memory state / window.state の整合性確認。
// stale overwrite リスクを定期チェックする。
//
// 提供: window.ippoSyncConsistencyChecker
// ============================================================

import { logWarning } from './health-monitor.js';
import { getState } from '../store/state.js';

var _cloudSyncBlocked = false;

function markCloudSyncBlocked(val) {
  _cloudSyncBlocked = !!val;
  if (val && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('cloud-sync-blocked', { reason: 'state-integrity-guard triggered' });
  }
}

function isCloudSyncBlocked() { return _cloudSyncBlocked; }

function check() {
  var results = { ok: true, issues: [] };
  try {
    var stateKey     = window.STATE_KEY || 'ippo_state';
    var stored       = localStorage.getItem(stateKey);
    var currentState = getState();

    if (stored && currentState) {
      var parsedStored  = JSON.parse(stored);
      var storedCount   = (parsedStored.records || []).length;
      var currentCount  = (currentState.records || []).length;

      if (storedCount !== currentCount) {
        results.ok = false;
        results.issues.push({
          type:         'localStorage-state-mismatch',
          storedCount:  storedCount,
          currentCount: currentCount,
          diff:         currentCount - storedCount,
        });
        logWarning('sync-count-mismatch', { storedCount: storedCount, currentCount: currentCount });
      }

      if (parsedStored.lastSaved !== currentState.lastSaved) {
        results.issues.push({
          type:             'timestamp-mismatch',
          storedLastSaved:  parsedStored.lastSaved,
          currentLastSaved: currentState.lastSaved,
        });
      }
    } else if (!stored && currentState && (currentState.records || []).length > 0) {
      results.ok = false;
      results.issues.push({
        type:         'localStorage-empty-state-has-records',
        currentCount: (currentState.records || []).length,
      });
      logWarning('localStorage-empty-with-records', { count: (currentState.records || []).length });
    }

    if (_cloudSyncBlocked) {
      results.issues.push({ type: 'cloud-sync-blocked' });
    }
  } catch (e) {
    results.ok = false;
    results.issues.push({ type: 'check-error', message: e.message });
  }
  return results;
}

var _intervalId = null;

function schedulePeriodicCheck(intervalMs) {
  if (_intervalId) return; // 二重登録防止
  var ms = intervalMs || 60000;
  _intervalId = setInterval(function () {
    var result = check();
    if (!result.ok) {
      console.warn('[ippo SyncConsistencyChecker] inconsistency detected:', result.issues);
      if (typeof window.ippoMarkBootWarning === 'function') {
        window.ippoMarkBootWarning('sync-inconsistency', { issues: result.issues });
      }
    }
  }, ms);
}

window.ippoSyncConsistencyChecker = {
  check:                 check,
  schedulePeriodicCheck: schedulePeriodicCheck,
  markCloudSyncBlocked:  markCloudSyncBlocked,
  isCloudSyncBlocked:    isCloudSyncBlocked,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('sync-consistency-checker-loaded');
}

export { check, schedulePeriodicCheck, markCloudSyncBlocked, isCloudSyncBlocked };
