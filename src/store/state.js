// ============================================================
//  ippo – src/store/state.js
//  state 初期値 / loadState / saveState / getState / setState
//
//  【設計方針】
//  - _state: module-local の単一正本。window.state は移行期間中の bridge。
//  - getState() : _state が未初期化なら window.state にフォールバック。
//  - setState()  : _state と window.state を同時に更新（bridge 維持）。
//  - saveState() : window.state 直読みを廃止し getState() 経由で読む。
//  - loadState() : localStorage → setState() で正本を初期化。
// ============================================================

export const STATE_KEY = 'ippo_state';

// ─── デフォルト初期値 ─────────────────────────────────────────
export const INITIAL_STATE = Object.freeze({
  name:            '',
  records:         [],
  streak:          0,
  totalDays:       0,
  fastingActive:   false,
  fastingStart:    null,
  fastGoal:        12,
  fastTimer:       null,
  rating:          0,
  myVision:        '',
  lastPeriodDate:  null,
  cycleLength:     28,
  cycleIrregular:  false,
  birthYear:       null,
  purpose:         null,
  reminderTime:    null,
});

// ─── module-local 正本 ────────────────────────────────────────
var _state = null;

// ─── getState ─────────────────────────────────────────────────
// _state 未初期化時は window.state にフォールバック（bootstrap 前の呼び出し対応）
export function getState() {
  if (!_state) {
    _state = window.state || Object.assign({}, INITIAL_STATE);
  }
  return _state;
}

// ─── setState ─────────────────────────────────────────────────
// 正本を更新し、移行期間中は window.state bridge も維持する。
export function setState(newState) {
  _state = newState;
  window.state = newState;
}

// ─── saveState ────────────────────────────────────────────────
export function saveState() {
  try {
    var s = getState();
    s.lastSaved = new Date().toISOString();
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch(e) {
    console.warn('ippo: saveState failed', e);
  }
}

// ─── loadState ────────────────────────────────────────────────
export function loadState() {
  try {
    var saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      var base = _state || window.state || Object.assign({}, INITIAL_STATE);
      setState(Object.assign({}, base, JSON.parse(saved)));
    } else if (!_state) {
      setState(Object.assign({}, INITIAL_STATE));
    }
  } catch(e) {
    console.warn('ippo: loadState failed', e);
    if (!_state) setState(Object.assign({}, INITIAL_STATE));
  }
  return getState();
}

// ─── legacy storage key 移行 ──────────────────────────────────
// 旧キー ('kk_records', 'records') に残っているデータを ippo_state へ統合して削除する。
// app-bootstrap.js の bootstrap() 冒頭で呼び出す。
export function migrateStorageKeys() {
  function _mergeInto(legacyKey) {
    var raw = localStorage.getItem(legacyKey);
    if (!raw) return;
    try {
      var parsed = JSON.parse(raw);
      var records = Array.isArray(parsed) ? parsed
                  : Array.isArray(parsed && parsed.records) ? parsed.records
                  : null;
      if (records && records.length > 0) {
        var currentRaw = localStorage.getItem(STATE_KEY);
        var current = currentRaw ? JSON.parse(currentRaw) : {};
        if (records.length > (current.records || []).length) {
          current.records = records;
          localStorage.setItem(STATE_KEY, JSON.stringify(current));
        }
      }
    } catch(e) {}
    localStorage.removeItem(legacyKey);
  }
  _mergeInto('kk_records');
  _mergeInto('records');
}

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
window.saveState          = saveState;
window.loadState          = loadState;
window.getState           = getState;
window.setState           = setState;
window.STATE_KEY          = STATE_KEY;
window.migrateStorageKeys = migrateStorageKeys;
