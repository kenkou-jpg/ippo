// ============================================================
//  ippo – src/services/settings-profile.js
//  Settings Profile: 伴走調整のための個人化 state レイヤー
//  localStorage key: ippo_settings_profile (ippo_state から独立)
//
//  設計: 設定 = 伴走の調整。機能スイッチではなく人格合わせ。
// ============================================================

export var SETTINGS_PROFILE_KEY = 'ippo_settings_profile';

export var DEFAULT_SETTINGS_PROFILE = {
  currentMode:   'neutral',
  priorityFocus: 'symptom_understanding',
  displayStyle:  'balanced',
  homeModules: [
    'todayInsight',
    'sleepRelation',
    'cyclePhase',
    'recentChanges',
    'experimentSuggestion',
  ],
  updatedAt: '',
};

// ── subscribers ──────────────────────────────────────────────
var _subscribers = [];

export function subscribeSettingsProfile(fn) {
  if (typeof fn === 'function' && _subscribers.indexOf(fn) === -1) {
    _subscribers.push(fn);
  }
  return function unsubscribe() {
    _subscribers = _subscribers.filter(function (f) { return f !== fn; });
  };
}

function _notify(profile) {
  _subscribers.forEach(function (fn) { try { fn(profile); } catch (_) {} });
}

// ── load ─────────────────────────────────────────────────────
export function loadSettingsProfile() {
  try {
    var raw = localStorage.getItem(SETTINGS_PROFILE_KEY);
    if (!raw) return _defaults();
    var parsed = JSON.parse(raw);
    var profile = Object.assign(_defaults(), parsed);
    if (!Array.isArray(profile.homeModules)) {
      profile.homeModules = DEFAULT_SETTINGS_PROFILE.homeModules.slice();
    }
    return profile;
  } catch (_) {
    return _defaults();
  }
}

function _defaults() {
  return Object.assign({}, DEFAULT_SETTINGS_PROFILE, {
    homeModules: DEFAULT_SETTINGS_PROFILE.homeModules.slice(),
  });
}

// ── getSettingsProfile ───────────────────────────────────────
// state への注入済みを正本とし、未注入なら localStorage から読む
export function getSettingsProfile() {
  if (typeof window.getState === 'function') {
    var st = window.getState();
    if (st && st.settingsProfile) return st.settingsProfile;
  }
  return loadSettingsProfile();
}

// ── saveSettingsProfile ──────────────────────────────────────
export function saveSettingsProfile(updates) {
  var current = getSettingsProfile();
  var next = Object.assign({}, current, updates, {
    updatedAt: new Date().toISOString(),
  });
  // localStorage
  try { localStorage.setItem(SETTINGS_PROFILE_KEY, JSON.stringify(next)); } catch (_) {}
  // global state
  if (typeof window.getState === 'function' && typeof window.setState === 'function') {
    window.setState(Object.assign({}, window.getState(), { settingsProfile: next }));
  }
  // subscribers + DOM event
  _notify(next);
  try {
    window.dispatchEvent(new CustomEvent('ippo:settings-profile-changed', { detail: next }));
  } catch (_) {}
  return next;
}

// ── getSettingsAIContext ─────────────────────────────────────
// 将来 AI が参照できる構造。現段階は schema のみ。LLM API 連携不要。
export function getSettingsAIContext() {
  var p = getSettingsProfile();
  return {
    mode:            p.currentMode,
    priority:        p.priorityFocus,
    displayStyle:    p.displayStyle,
    preferredTopics: (p.homeModules || []).slice(),
  };
}

// ── initSettingsProfile (app 起動時に state へ注入) ──────────
export function initSettingsProfile() {
  var profile = loadSettingsProfile();
  if (typeof window.getState === 'function' && typeof window.setState === 'function') {
    var st = window.getState();
    if (!st || !st.settingsProfile) {
      window.setState(Object.assign({}, st || {}, { settingsProfile: profile }));
    }
  }
  return profile;
}

// ── window 公開 ──────────────────────────────────────────────
window.getSettingsProfile      = getSettingsProfile;
window.saveSettingsProfile     = saveSettingsProfile;
window.getSettingsAIContext    = getSettingsAIContext;
window.initSettingsProfile     = initSettingsProfile;
window.subscribeSettingsProfile = subscribeSettingsProfile;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('settings-profile-loaded');
}
