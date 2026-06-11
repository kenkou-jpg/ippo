// ============================================================
// ippo – src/runtime/rollback-manager.js
// インメモリ state スナップショット リングバッファ。
// records 消失・hydration 破損時の自動ロールバックを提供。
// 提供: window.ippoRollbackManager
// ============================================================

import { getState, saveState } from '../store/state.js';

const SNAPSHOT_LIMIT = 8;
const _snapshots = [];

function _ts() {
  try { return new Date().toISOString(); } catch (_) { return ''; }
}

function _deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 現在の state をスナップショットとして保存する
function takeSnapshot(label) {
  var state = getState();
  if (!state) return null;
  try {
    var snap = {
      label:       label || 'auto',
      at:          _ts(),
      recordCount: (state.records || []).length,
      data:        _deepClone(state),
    };
    _snapshots.push(snap);
    if (_snapshots.length > SNAPSHOT_LIMIT) _snapshots.shift();
    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('snapshot-taken', { label: snap.label, recordCount: snap.recordCount });
    }
    return snap;
  } catch (e) {
    return null;
  }
}

function getLatestSnapshot() {
  return _snapshots.length > 0 ? _snapshots[_snapshots.length - 1] : null;
}

// 最多 records を持つスナップショットを返す（記録消失時の最良候補）
function getBestSnapshot() {
  if (_snapshots.length === 0) return null;
  return _snapshots.reduce(function (best, s) {
    return s.recordCount > best.recordCount ? s : best;
  });
}

function rollbackTo(snap) {
  if (!snap || !snap.data) return false;
  try {
    var restored = _deepClone(snap.data);
    // window.setState を使う（hook を通過させない: bypass フラグを立てる）
    if (typeof window._ippoRollbackBypass === 'undefined') {
      window._ippoRollbackBypass = false;
    }
    window._ippoRollbackBypass = true;
    if (typeof window.setState === 'function') window.setState(restored);
    window._ippoRollbackBypass = false;
    // save-transaction-guard のスナップショット/検証を経由させる
    saveState();
    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('rollback-applied', {
        label:       snap.label,
        recordCount: snap.recordCount,
        snapAt:      snap.at,
      });
    }
    console.warn('[ippo RollbackManager] rolled back to snapshot:', snap.label, '(' + snap.recordCount + ' records)');
    return true;
  } catch (e) {
    return false;
  }
}

function rollbackToLatest() {
  return rollbackTo(getLatestSnapshot());
}

function rollbackToBest() {
  return rollbackTo(getBestSnapshot());
}

function getSnapshots() { return _snapshots.slice(); }

window.ippoRollbackManager = {
  takeSnapshot:     takeSnapshot,
  getLatestSnapshot: getLatestSnapshot,
  getBestSnapshot:  getBestSnapshot,
  rollbackTo:       rollbackTo,
  rollbackToLatest: rollbackToLatest,
  rollbackToBest:   rollbackToBest,
  getSnapshots:     getSnapshots,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('rollback-manager-loaded');
}

export { takeSnapshot, rollbackToBest };
