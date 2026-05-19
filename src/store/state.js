// ============================================================
//  ippo – src/store/state.js
//  state 初期値 / loadState / saveState / getState / setState
//
//  【設計方針】
//  - _state: module-local の単一正本（唯一の source of truth）。
//  - getState() : _state 未初期化時は INITIAL_STATE で初期化。
//  - setState()  : _state のみを更新。window.state は app-legacy.js の
//                 Object.defineProperty getter 経由で _state を参照する。
//  - saveState() : getState() 経由で localStorage に保存。
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
  currentScreen:   'home',
});

// ─── module-local 正本 ────────────────────────────────────────
var _state = null;

// ─── setState hook registry ───────────────────────────────────
// app-legacy.js が state.js より先に実行されるため、
// window._ippoStateHooks キューに事前登録されたフックを引き継ぐ。
//
// _preHooks  : hook(nextState, currentState) が false を返すと setState をブロック。
//              addSetStateHook() で登録（後方互換）。
// _postHooks : 状態更新確定後の通知専用。ブロック不可。
//              addPostSetStateHook() で登録。
var _preHooks = (Array.isArray(window._ippoStateHooks) ? window._ippoStateHooks.slice() : []);
window._ippoStateHooks = _preHooks; // 同じ配列参照を維持（追加登録も届く）

var _postHooks = [];

export function addSetStateHook(fn) {
  if (typeof fn === 'function' && _preHooks.indexOf(fn) === -1) {
    _preHooks.push(fn);
  }
}

export function addPostSetStateHook(fn) {
  if (typeof fn === 'function' && _postHooks.indexOf(fn) === -1) {
    _postHooks.push(fn);
  }
}

// ─── getState ─────────────────────────────────────────────────
export function getState() {
  if (!_state) {
    _state = Object.assign({}, INITIAL_STATE);
  }
  return _state;
}

// ─── setState ─────────────────────────────────────────────────
// _state を更新する唯一の関数。フック経由で legacy bare `state` も同期する。
export function setState(newState) {
  for (var i = 0; i < _preHooks.length; i++) {
    try {
      if (_preHooks[i](newState, _state) === false) return;
    } catch (_) {}
  }
  _state = newState;
  for (var _i = 0; _i < _postHooks.length; _i++) {
    try { _postHooks[_i](newState); } catch(e) { console.warn('ippo: setState post-hook error', e); }
  }
}



// ─── saveState ────────────────────────────────────────────────
export function saveState() {
  try {
    var s = Object.assign({}, getState());
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
      var base = _state || Object.assign({}, INITIAL_STATE);
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

// ─── window 互換（app.html inline script との共存） ──
window.saveState             = saveState;
window.loadState             = loadState;
window.getState              = getState;
window.setState              = setState;
window.addSetStateHook       = addSetStateHook;
window.addPostSetStateHook   = addPostSetStateHook;
window.STATE_KEY             = STATE_KEY;
window.migrateStorageKeys    = migrateStorageKeys;
