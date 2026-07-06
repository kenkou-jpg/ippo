// ============================================================
//  ippo – src/store/state.js
//  state 初期値 / loadState / saveState / getState / setState
//
//  【設計方針】
//  - _state: module-local の単一正本（唯一の source of truth）。
//  - getState() : _state 未初期化時は INITIAL_STATE で初期化。
//  - setState()  : _state を更新し、window.state へ直接同期する
//                 （app-legacy.js の _ippoStateHooks 経由の同期に依存しない）。
//  - saveState() : getState() 経由で localStorage に保存。
//  - loadState() : localStorage → setState() で正本を初期化。
// ============================================================

export const STATE_KEY = 'ippo_state';

// ─── localStorage key 一覧 ────────────────────────────────────
// ippo が使用する全 localStorage キーの正規リスト。
// キー追加時はここに追記し、所有モジュールを明記する。
//
// Key                       Owner / Purpose
// ------------------------- -----------------------------------------------
// ippo_state                state.js — メイン state JSON
// kk_records                (legacy) → migrateStorageKeys() で ippo_state へ移行
// records                   (legacy) → 同上
// ippo_idb_migrated         storage-migration.js — IDB 移行完了フラグ
// ippo_premium_cached       premium-service.js  — プレミアム状態オフライン cache
//                           (M-4 で追加; A-5 で正式化)
// ippo_draft                record.js — 記録入力途中の下書き
// ippo_meal_draft           record.js — 食事時刻入力の下書き
// ippo_last_record_count    record-freshness-guard.js — 記録件数監視
// ippo_device_id            supabase.js — デバイス識別子
// ippo_sb_user_id           supabase.js — Supabase ユーザー ID cache
// ippo_sb_token             supabase.js — Supabase セッショントークン
// ippo_sb_refresh           supabase.js — Supabase リフレッシュトークン
// ippo_records_synced       supabase.js — クラウド同期済みフラグ
// ippo_onboarding_completed onboarding-runtime.js — オンボーディング完了フラグ
// ippo_recent_symptoms      record-edit / symptom モジュール — 最近の症状
// ippo_rec_details_open     record-edit UI — 詳細セクション開閉状態
// ippo_theme                settings — テーマ設定
// ippo_hide_add_home        home — ホームの「追加」バナー非表示フラグ
// ippo_upsell_ts            premium UI — アップセル表示タイムスタンプ
// ippo_debug_overlay        production-diagnostics — デバッグオーバーレイ表示フラグ
// ippo_debug_record         production-diagnostics — デバッグ記録フラグ
// ippo_diagnostics_overlay  production-diagnostics — 診断オーバーレイ
// ippo_manifest_version     service worker — マニフェストバージョン
// ippo_premium_registered   premium-service — プレミアム登録フラグ
// onboardingCompleted       (legacy) — 旧オンボーディング完了フラグ
// sakura                    (legacy) — 旧設定キー

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

// ─── saveState hook registry ──────────────────────────────────
// pre-save: void hooks called before localStorage write (e.g. snapshot)
// post-save: hooks called after save with (error|null)
var _preSaveHooks  = [];
var _postSaveHooks = [];

export function addPreSaveHook(fn) {
  if (typeof fn === 'function' && _preSaveHooks.indexOf(fn) === -1) {
    _preSaveHooks.push(fn);
  }
}

export function addPostSaveHook(fn) {
  if (typeof fn === 'function' && _postSaveHooks.indexOf(fn) === -1) {
    _postSaveHooks.push(fn);
  }
}

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
  // null レコードを除去してクラッシュを防ぐ
  if (newState && Array.isArray(newState.records)) {
    var hasNull = newState.records.some(function(r) { return r == null; });
    if (hasNull) {
      newState = Object.assign({}, newState, { records: newState.records.filter(Boolean) });
    }
  }
  for (var i = 0; i < _preHooks.length; i++) {
    try {
      if (_preHooks[i](newState, _state) === false) return;
    } catch (_) {}
  }
  _state = newState;
  try { window.state = _state; } catch (_) {}
  for (var _i = 0; _i < _postHooks.length; _i++) {
    try { _postHooks[_i](newState); } catch(e) { console.warn('ippo: setState post-hook error', e); }
  }
}



// ─── saveState ────────────────────────────────────────────────
export function saveState() {
  for (var _pi = 0; _pi < _preSaveHooks.length; _pi++) {
    try { _preSaveHooks[_pi](); } catch (_) {}
  }
  var saveErr = null;
  try {
    var s = Object.assign({}, getState());
    s.lastSaved = new Date().toISOString();
    _state.lastSaved = s.lastSaved;
    // P0-FIX-2: currentScreen は UI 状態でありユーザーデータではない。
    // 永続化するとブート時に pro-hub 等が初期表示される原因になるため除外。
    // 画面遷移は showScreen()/switchTab() が毎回担保する。
    delete s.currentScreen;
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch(e) {
    saveErr = e;
    console.warn('ippo: saveState failed', e);
    try { window.dispatchEvent(new CustomEvent('ippo:save-error', { detail: { error: e } })); } catch (_) {}
  }
  for (var _oi = 0; _oi < _postSaveHooks.length; _oi++) {
    try { _postSaveHooks[_oi](saveErr); } catch (_) {}
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
        // タイムスタンプ比較: legacy データが新しい場合のみ上書き（削除済みレコード再インポート防止）
        var legacyTs  = parsed && parsed.lastSaved ? new Date(parsed.lastSaved).getTime() : 0;
        var currentTs = current.lastSaved ? new Date(current.lastSaved).getTime() : 0;
        if (legacyTs > currentTs) {
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
window.addPreSaveHook        = addPreSaveHook;
window.addPostSaveHook       = addPostSaveHook;
window.STATE_KEY             = STATE_KEY;
window.migrateStorageKeys    = migrateStorageKeys;
