// ============================================================
// ippo – src/runtime/state-integrity-guard.js
// records の大幅減少を検知・ブロック・ロールバックする。
// addSetStateHook 経由で module-scoped setState も含む全呼び出しをガード。
//
// トリガー条件: records が 3件以上減り、かつ 50% 未満になった場合
// 例外: window._ippoRollbackBypass = true の場合はスキップ
//       (rollback-manager 自身によるロールバック書き込みを除外)
// ============================================================

import { logError, logWarning } from './health-monitor.js';
import { takeSnapshot, rollbackToBest } from './rollback-manager.js';

const DROP_ABS_THRESHOLD   = 3;    // 最低 3件以上の減少で反応
const DROP_RATIO_THRESHOLD = 0.5;  // 50% 未満になったらブロック

var _installed = false;

function _hook(nextState, currentState) {
  // ロールバック書き込み自体は除外
  if (window._ippoRollbackBypass === true) return; // undefined = allow

  if (!currentState || !nextState) return; // 比較不能 → 通過

  var currentCount = (currentState.records || []).length;
  var nextCount    = (nextState.records    || []).length;

  if (currentCount === 0) return; // 保護対象なし

  var dropped    = currentCount - nextCount;
  var dropRatio  = nextCount / currentCount;

  if (dropped >= DROP_ABS_THRESHOLD && dropRatio < DROP_RATIO_THRESHOLD) {
    // records 消失イベント
    if (typeof window.ippoHealthMonitor === 'object') {
      window.ippoHealthMonitor.metrics.recordDropEvents++;
      logError('state-integrity-records-drop-blocked', {
        currentCount: currentCount,
        nextCount:    nextCount,
        dropped:      dropped,
        dropRatio:    dropRatio.toFixed(2),
      });
    }

    if (typeof window.ippoMarkBootError === 'function') {
      window.ippoMarkBootError('records-drop-blocked', { currentCount: currentCount, nextCount: nextCount });
    }

    console.error(
      '[ippo StateIntegrityGuard] records drop BLOCKED',
      { currentCount: currentCount, nextCount: nextCount, dropped: dropped }
    );

    // cloud sync も止める（Supabase 側への上書きを防ぐため）
    if (typeof window.ippoSyncConsistencyChecker === 'object') {
      window.ippoSyncConsistencyChecker.markCloudSyncBlocked(true);
    }

    // ベストスナップショットへロールバック
    rollbackToBest();

    return false; // setState をブロック
  }

  // 通常の減少（1–2件など）は通過、スナップショットを更新
  if (dropped > 0) {
    logWarning('state-integrity-records-reduced', {
      currentCount: currentCount,
      nextCount:    nextCount,
      dropped:      dropped,
    });
  }
}

function install() {
  if (_installed) return;

  // addSetStateHook 経由で module-scoped setState もインターセプト
  if (typeof window.addSetStateHook === 'function') {
    window.addSetStateHook(_hook);
    _installed = true;
    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('state-integrity-guard-installed');
    }
  } else {
    console.warn('[ippo StateIntegrityGuard] addSetStateHook not found, guard not installed');
  }
}

window.ippoStateIntegrityGuard = { install: install };

export { install };
