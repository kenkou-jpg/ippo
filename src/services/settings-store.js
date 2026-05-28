// ============================================================
//  ippo – src/services/settings-store.js
//  Phase A: Settings Store – 設定の統一 source of truth
//
//  責務:
//  - 全設定 (mode / priority / display / modules / conditions / reminder) の
//    hydration, persistence, migration, event dispatch, state sync を単一管理
//  - ippo_settings_profile (既存 key) をそのまま使用 → データ損失ゼロ
//  - trackedConditions (= myDiseases) / reminderSettings を新規追加
//  - state.settingsProfile / state.myDiseases との双方向同期
//  - settings-profile.js との後方互換を維持（同一 key + 同一 event）
//
//  移行方針:
//  - Phase A: この store を導入。settings-profile.js は並走。
//  - Phase B+: 各呼び出し元を順次 settings-store 経由へ移行。
//
//  禁止: Zustand / Redux / Pinia / MobX など外部 state library は一切使わない
// ============================================================

export var STORE_KEY = 'ippo_settings_profile'; // 既存 key を継承

// ─── Default ─────────────────────────────────────────────────
export var DEFAULT_STORE = {
  currentMode:        'neutral',               // 今のわたしの状態
  priorityFocus:      'symptom_understanding', // 重視したいこと
  displayStyle:       'balanced',              // 表示スタイル
  homeModules: [                               // ホームに表示する情報
    'todayInsight',
    'sleepRelation',
    'cyclePhase',
    'recentChanges',
    'experimentSuggestion',
  ],
  trackedConditions:  [],                      // 気になる疾患 (= state.myDiseases)
  reminderSettings: {                          // 通知設定 (stub — 将来実装)
    enabled: false,
    time:    null,
    days:    [],
  },
  updatedAt: '',
};

// ─── in-memory singleton ──────────────────────────────────────
var _store = null;

// ─── subscribers ─────────────────────────────────────────────
var _subscribers = [];

export function subscribeStore(fn) {
  if (typeof fn === 'function' && _subscribers.indexOf(fn) === -1) {
    _subscribers.push(fn);
  }
  return function unsubscribe() {
    _subscribers = _subscribers.filter(function (f) { return f !== fn; });
  };
}

function _notify(store) {
  _subscribers.forEach(function (fn) { try { fn(store); } catch (_) {} });
}

// ─── helpers ─────────────────────────────────────────────────
function _defaults() {
  return Object.assign({}, DEFAULT_STORE, {
    homeModules:       DEFAULT_STORE.homeModules.slice(),
    trackedConditions: [],
    reminderSettings:  Object.assign({}, DEFAULT_STORE.reminderSettings, { days: [] }),
  });
}

function _mergeReminder(base, incoming) {
  if (!incoming || typeof incoming !== 'object') return Object.assign({}, DEFAULT_STORE.reminderSettings, { days: [] });
  return {
    enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : base.enabled,
    time:    incoming.time    !== undefined ? incoming.time    : base.time,
    days:    Array.isArray(incoming.days)   ? incoming.days.slice() : base.days.slice(),
  };
}

// ─── migration: legacy → store ────────────────────────────────
// ippo_settings_profile に trackedConditions が無い場合、
// state.myDiseases から移植する（データ損失防止）。
function _migrateFromLegacy(raw) {
  var base = _defaults();

  // 1. 既存 settings-profile.js の値をマージ
  if (raw && typeof raw === 'object') {
    if (typeof raw.currentMode   === 'string') base.currentMode   = raw.currentMode;
    if (typeof raw.priorityFocus === 'string') base.priorityFocus = raw.priorityFocus;
    if (typeof raw.displayStyle  === 'string') base.displayStyle  = raw.displayStyle;
    if (Array.isArray(raw.homeModules))         base.homeModules   = raw.homeModules.slice();
    if (typeof raw.updatedAt     === 'string') base.updatedAt     = raw.updatedAt;
    if (raw.reminderSettings)
      base.reminderSettings = _mergeReminder(base.reminderSettings, raw.reminderSettings);

    // trackedConditions: 既存ならそのまま使用
    if (Array.isArray(raw.trackedConditions)) {
      base.trackedConditions = raw.trackedConditions.slice();
    }
  }

  // 2. trackedConditions 未設定 → state.myDiseases から移植
  if (!base.trackedConditions.length) {
    try {
      var st = typeof window.getState === 'function' ? window.getState() : null;
      if (st && Array.isArray(st.myDiseases) && st.myDiseases.length) {
        base.trackedConditions = st.myDiseases.slice();
      }
    } catch (_) {}
  }

  return base;
}

// ─── load ─────────────────────────────────────────────────────
export function loadStore() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    return _migrateFromLegacy(raw ? JSON.parse(raw) : null);
  } catch (_) {
    return _defaults();
  }
}

// ─── getStore ─────────────────────────────────────────────────
// in-memory singleton を返す。未初期化の場合は loadStore() で初期化。
export function getStore() {
  if (!_store) {
    _store = loadStore();
  }
  return _store;
}

// ─── saveStore ────────────────────────────────────────────────
// updates を現在の store にマージして永続化する。
// state.settingsProfile / state.myDiseases も同期する。
// ippo:settings-profile-changed を dispatch して後方互換を維持する。
export function saveStore(updates) {
  var current = getStore();

  // reminderSettings は deep merge
  var nextReminder = current.reminderSettings;
  if (updates && updates.reminderSettings) {
    nextReminder = _mergeReminder(current.reminderSettings, updates.reminderSettings);
  }

  var next = Object.assign({}, current, updates, {
    reminderSettings: nextReminder,
    updatedAt: new Date().toISOString(),
  });

  // homeModules: array 保証
  if (!Array.isArray(next.homeModules)) {
    next.homeModules = DEFAULT_STORE.homeModules.slice();
  }
  // trackedConditions: array 保証
  if (!Array.isArray(next.trackedConditions)) {
    next.trackedConditions = [];
  }

  _store = next;

  // localStorage
  try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (_) {}

  // state.settingsProfile 同期（後方互換: insight-engine / companion 等が参照）
  try {
    if (typeof window.getState === 'function' && typeof window.setState === 'function') {
      var st = window.getState();
      window.setState(Object.assign({}, st, { settingsProfile: _buildProfileSnapshot(next) }));
    }
  } catch (_) {}

  // state.myDiseases 同期（trackedConditions 変更時）
  if (updates && ('trackedConditions' in updates)) {
    try {
      if (typeof window.getState === 'function' && typeof window.setState === 'function') {
        var st2 = window.getState();
        window.setState(Object.assign({}, st2, { myDiseases: next.trackedConditions.slice() }));
        if (typeof window.saveState === 'function') window.saveState();
      }
    } catch (_) {}
  }

  // subscribers
  _notify(next);

  // ippo:settings-profile-changed (後方互換: home-next-shell / home-renderer 等が受信)
  try {
    window.dispatchEvent(new CustomEvent('ippo:settings-profile-changed', { detail: next }));
  } catch (_) {}

  return next;
}

// ─── profile snapshot (state.settingsProfile 互換形式) ─────────
// 後方互換のため: insight-engine / companion-intelligence 等は
// state.settingsProfile.currentMode / priorityFocus / displayStyle / homeModules を読む
function _buildProfileSnapshot(store) {
  return {
    currentMode:   store.currentMode,
    priorityFocus: store.priorityFocus,
    displayStyle:  store.displayStyle,
    homeModules:   Array.isArray(store.homeModules) ? store.homeModules.slice() : [],
    updatedAt:     store.updatedAt,
    // trackedConditions を profile にも含める（将来参照用）
    trackedConditions: Array.isArray(store.trackedConditions) ? store.trackedConditions.slice() : [],
  };
}

// ─── getStoreSection ──────────────────────────────────────────
// 設定の特定セクションだけを取得する thin accessor。
// 呼び出し側が getStore() 全体を受け取って使うことを避けたい場合に使う。
export function getStoreSection(key) {
  var s = getStore();
  return s[key];
}

// ─── initStore ────────────────────────────────────────────────
// アプリ起動時に呼ぶ。bootstrap() 後に実行すること（state が確定している必要あり）。
//
// 1. loadStore() で localStorage + myDiseases からストアを構築
// 2. state.settingsProfile へ注入
// 3. settings-profile.js が書いた内容と競合しないよう、
//    state.settingsProfile が既に注入済みの場合はそこから trackedConditions を補完
export function initStore() {
  // 既存 settings-profile.js が注入済みの場合はそれを起点にする
  var existing = null;
  try {
    var st = typeof window.getState === 'function' ? window.getState() : null;
    if (st && st.settingsProfile) existing = st.settingsProfile;
  } catch (_) {}

  var base = loadStore();

  // 既存 state.settingsProfile の値を優先してマージ（bootstrap後の値を尊重）
  if (existing) {
    if (typeof existing.currentMode   === 'string') base.currentMode   = existing.currentMode;
    if (typeof existing.priorityFocus === 'string') base.priorityFocus = existing.priorityFocus;
    if (typeof existing.displayStyle  === 'string') base.displayStyle  = existing.displayStyle;
    if (Array.isArray(existing.homeModules))         base.homeModules   = existing.homeModules.slice();
    // trackedConditions: existing に無ければ base のものを使う
    if (Array.isArray(existing.trackedConditions) && existing.trackedConditions.length) {
      base.trackedConditions = existing.trackedConditions.slice();
    }
  }

  _store = base;

  // state.settingsProfile を最新 store で上書き
  try {
    if (typeof window.getState === 'function' && typeof window.setState === 'function') {
      var st2 = window.getState();
      window.setState(Object.assign({}, st2, {
        settingsProfile: _buildProfileSnapshot(_store),
      }));
    }
  } catch (_) {}

  // localStorage にも最新を書き戻す（trackedConditions 移植分を永続化）
  try { localStorage.setItem(STORE_KEY, JSON.stringify(_store)); } catch (_) {}

  return _store;
}

// ─── legacy event sync ───────────────────────────────────────
// settings-profile.js 経由の saveSettingsProfile() が呼ばれた場合、
// ippo:settings-profile-changed を受け取って in-memory store を同期する。
// これにより、Phase A では settings-profile.js と settings-store.js が共存できる。
(function _installLegacySync() {
  window.addEventListener('ippo:settings-profile-changed', function (e) {
    // 自分自身の saveStore() が dispatch したイベントはスキップ（再帰防止）
    if (_store && e.detail && e.detail._fromSettingsStore) return;
    if (!e.detail) return;
    var detail = e.detail;
    // legacy write を store に反映（trackedConditions は state.myDiseases から補完）
    var current = _store || _defaults();
    var merged = Object.assign({}, current);
    if (typeof detail.currentMode   === 'string') merged.currentMode   = detail.currentMode;
    if (typeof detail.priorityFocus === 'string') merged.priorityFocus = detail.priorityFocus;
    if (typeof detail.displayStyle  === 'string') merged.displayStyle  = detail.displayStyle;
    if (Array.isArray(detail.homeModules))         merged.homeModules   = detail.homeModules.slice();
    if (typeof detail.updatedAt     === 'string') merged.updatedAt     = detail.updatedAt;
    if (Array.isArray(detail.trackedConditions))   merged.trackedConditions = detail.trackedConditions.slice();
    _store = merged;
    // subscribers に通知（DOM event の再 dispatch は不要 — 既に legacy 側が発火済み）
    _notify(merged);
  });
})();

// ─── context helper ──────────────────────────────────────────
// Phase C (context-engine.js) が参照するための thin accessor。
// 設定から UI コンテキストを簡易計算して返す。
export function getSettingsContext() {
  var s = getStore();
  return {
    currentMode:       s.currentMode,
    priorityFocus:     s.priorityFocus,
    displayStyle:      s.displayStyle,
    homeModules:       Array.isArray(s.homeModules) ? s.homeModules.slice() : [],
    trackedConditions: Array.isArray(s.trackedConditions) ? s.trackedConditions.slice() : [],
    reminderEnabled:   !!(s.reminderSettings && s.reminderSettings.enabled),
    // computed
    isDenseMode:       s.displayStyle === 'deep',
    isGentleMode:      s.displayStyle === 'gentle',
    isRecoveryMode:    s.currentMode  === 'recovery',
    isActiveMode:      s.currentMode  === 'active',
    hasTrackedConditions: Array.isArray(s.trackedConditions) && s.trackedConditions.length > 0,
  };
}

// ─── window 公開 ──────────────────────────────────────────────
window.getSettingsStore    = getStore;
window.saveSettingsStore   = saveStore;
window.initSettingsStore   = initStore;
window.getSettingsContext  = getSettingsContext;
window.getStoreSection     = getStoreSection;
window.subscribeStore      = subscribeStore;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('settings-store-loaded');
}
