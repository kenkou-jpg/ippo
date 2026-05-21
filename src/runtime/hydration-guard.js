// ============================================================
// ippo – src/runtime/hydration-guard.js
// cloud restore / IDB restore / auto-recovery が
// より新しいローカル state を上書きしないかチェックする。
//
// 使い方:
//   import { checkHydration } from './hydration-guard.js';
//   const { allowed } = checkHydration(incomingData, 'cloud-restore');
//   if (!allowed) return; // 上書きをスキップ
//
// 提供: window.ippoHydrationGuard
// ============================================================

import { logWarning } from './health-monitor.js';
import { takeSnapshot } from './rollback-manager.js';
import { getState } from '../store/state.js';

function _ts(val) {
  if (!val) return 0;
  try { return new Date(val).getTime() || 0; } catch (_) { return 0; }
}

// incoming が current より新しいか同等かを判定
function isNewerOrEqual(incoming, current) {
  var inTs = _ts(incoming.updated_at || incoming.lastSaved || incoming.lastModified);
  var cuTs = _ts(current.updated_at  || current.lastSaved  || current.lastModified);

  if (inTs > 0 && cuTs > 0) return inTs >= cuTs;

  // タイムスタンプ不明 → records 件数で比較
  return (incoming.records || []).length >= (current.records || []).length;
}

// hydration 前に呼び出す。ブロックすべき場合は allowed: false を返す。
function checkHydration(incomingData, source) {
  var currentState = getState();
  if (!currentState || !incomingData) return { allowed: true };

  var currentCount  = (currentState.records || []).length;
  if (currentCount === 0) return { allowed: true }; // 保護対象なし

  var incomingCount = (incomingData.records || []).length;

  if (!isNewerOrEqual(incomingData, currentState)) {
    logWarning('hydration-stale-blocked', {
      source:       source,
      currentCount: currentCount,
      incomingCount: incomingCount,
      currentTs:    currentState.updated_at || currentState.lastSaved || null,
      incomingTs:   incomingData.updated_at || incomingData.lastSaved || null,
    });
    console.warn('[ippo HydrationGuard] stale hydration BLOCKED from:', source, {
      currentCount:  currentCount,
      incomingCount: incomingCount,
    });
    if (typeof window.ippoMarkBootWarning === 'function') {
      window.ippoMarkBootWarning('hydration-stale-blocked', { source: source, currentCount: currentCount, incomingCount: incomingCount });
    }
    return { allowed: false, reason: 'stale' };
  }

  // 通過前にスナップショットを取っておく
  if (currentCount > 0) {
    takeSnapshot('pre-hydration:' + source);
  }

  if (typeof window.ippoHealthMonitor === 'object') {
    window.ippoHealthMonitor.metrics.hydrationCount++;
  }

  return { allowed: true };
}

window.ippoHydrationGuard = {
  checkHydration: checkHydration,
  isNewerOrEqual: isNewerOrEqual,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('hydration-guard-loaded');
}

export { checkHydration, isNewerOrEqual };
