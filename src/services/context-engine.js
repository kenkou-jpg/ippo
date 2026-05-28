// ============================================================
//  ippo – src/services/context-engine.js
//  Phase C: UI Context Engine
//
//  責務:
//  - settings-store + state から「今この画面で使うべきトーン・密度・焦点」を計算
//  - getCompanionContext() → UI 向け軽量コンテキストオブジェクトを返す
//  - companion-intelligence.js の深い行動分析とは別物（補完関係）
//    companion-intelligence: 12h キャッシュ、post-save hook、深い傾向分析
//    context-engine:         5min キャッシュ、on-demand、UI トーン計算
//
//  出力 shape:
//  {
//    mode, priority, displayStyle, trackedConditions,   ← settings
//    uiDensity, emotionalTone, recommendationWeight,     ← derived UI
//    focus,                                              ← priority → 日本語ラベル
//    cyclePhase, cycleDayNum,                            ← state
//    recentSymptomKeys, hasTrackedConditions,            ← state
//    dataRichness, onboardingPurpose,                    ← state
//    generatedAt,
//  }
//
//  禁止: LLM 呼び出し / 診断 / 断定 / 病名推測 / 不安誘導
//  トーン: 「〜傾向があります」「〜ようです」「〜かもしれません」
// ============================================================

// ─── キャッシュ ────────────────────────────────────────────
var _CACHE_TTL = 5 * 60 * 1000; // 5 分（設定変更への応答性を保つ）
var _cache     = null;

function _isCacheValid() {
  if (!_cache) return false;
  return (Date.now() - new Date(_cache.generatedAt).getTime()) < _CACHE_TTL;
}

export function invalidateContextCache() {
  _cache = null;
}

// ─── 定数マップ ──────────────────────────────────────────────

// currentMode → emotionalTone
var _TONE_MAP = {
  tired:       'gentle',
  slow:        'gentle',
  recovery:    'gentle',
  overworked:  'gentle',
  anxious:     'reflective',
  fluctuating: 'supportive',
  active:      'neutral',
  neutral:     'neutral',
};

// currentMode → recommendationWeight (0.0 = 低圧 / 1.0 = 高圧)
// 「静か・柔らかい・押し付けない」原則: 全モードで上限 0.75
var _WEIGHT_MAP = {
  tired:       0.25,
  slow:        0.25,
  recovery:    0.30,
  overworked:  0.35,
  anxious:     0.40,
  fluctuating: 0.50,
  neutral:     0.60,
  active:      0.75,
};

// displayStyle → uiDensity
var _DENSITY_MAP = {
  gentle:   'minimal',
  balanced: 'standard',
  deep:     'rich',
};

// priorityFocus → 日本語フォーカスラベル (UI 表示用)
var _FOCUS_LABEL_MAP = {
  sleep:                 '睡眠とからだの回復',
  cycle:                 'からだのリズムと周期',
  symptom_understanding: '症状の観察と理解',
  emotion:               '気持ちと感情の整理',
  overwork_prevention:   '無理をしない習慣',
  recording_habit:       '記録を続ける習慣',
  anxiety_reduction:     '不安を和らげること',
};

// ─── ヘルパー: 周期フェーズ計算 ──────────────────────────────
// home-next-config.js の getCyclePhase / getCycleDayNum と同等。
// サービス層に UI モジュールを import しないよう独立実装する。

function _computeCyclePhase(lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return null;
  try {
    var last    = new Date(lastPeriodDate + 'T00:00:00');
    var today   = new Date();
    var dayNum  = Math.floor((today - last) / 86400000) + 1;
    var cl      = cycleLength || 28;
    if (dayNum < 1)   return null;
    if (dayNum <= 5)  return 'menstrual';
    if (dayNum <= 13) return 'follicular';
    if (dayNum <= 15) return 'ovulation';
    if (dayNum <= cl) return 'luteal';
    return null; // 遅延中
  } catch (_) { return null; }
}

function _computeCycleDayNum(lastPeriodDate) {
  if (!lastPeriodDate) return null;
  try {
    var last   = new Date(lastPeriodDate + 'T00:00:00');
    var today  = new Date();
    var dayNum = Math.floor((today - last) / 86400000) + 1;
    return dayNum > 0 ? dayNum : null;
  } catch (_) { return null; }
}

// ─── ヘルパー: 直近症状キー ───────────────────────────────────
// 直近 7 日間のレコードから出現頻度上位 3 症状を返す
function _recentSymptomKeys(records) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  var counts = {};
  (records || []).forEach(function(r) {
    var d = new Date(r.date || r.record_date || '');
    if (isNaN(d.getTime()) || d < cutoff) return;
    (r.symptomDetails || []).forEach(function(sd) {
      if (sd && sd.symptom) counts[sd.symptom] = (counts[sd.symptom] || 0) + 1;
    });
    (r.symptoms || []).forEach(function(s) {
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
  });

  return Object.keys(counts)
    .sort(function(a, b) { return counts[b] - counts[a]; })
    .slice(0, 3);
}

// ─── ヘルパー: データ豊富さ ───────────────────────────────────
function _dataRichness(records) {
  var count = (records || []).length;
  if (count >= 14) return 'high';
  if (count >= 5)  return 'medium';
  return 'low';
}

// ─── ヘルパー: state 取得 ─────────────────────────────────────
function _getState() {
  try {
    return typeof window.getState === 'function' ? window.getState() : {};
  } catch (_) { return {}; }
}

// ─── ヘルパー: settings-store 取得 ────────────────────────────
function _getSettingsStore() {
  try {
    return typeof window.getSettingsStore === 'function'
      ? window.getSettingsStore()
      : (_getState().settingsProfile || {});
  } catch (_) { return {}; }
}

// ─── getCompanionContext ──────────────────────────────────────
/**
 * 現在の UI コンテキストを返す。
 *
 * @param {object} [opts]
 * @param {boolean} [opts.forceRefresh=false] キャッシュを無視して再計算
 * @returns {object} context
 */
export function getCompanionContext(opts) {
  opts = opts || {};
  if (!opts.forceRefresh && _isCacheValid()) return _cache;

  var state   = _getState();
  var store   = _getSettingsStore();
  var records = state.records || [];

  // ── settings から ─────────────────────────────────────────
  var mode        = store.currentMode   || 'neutral';
  var priority    = store.priorityFocus || 'symptom_understanding';
  var displayStyle = store.displayStyle || 'balanced';
  var conditions  = Array.isArray(store.trackedConditions) ? store.trackedConditions : [];

  // ── 派生 UI 値 ────────────────────────────────────────────
  var emotionalTone        = _TONE_MAP[mode]    || 'neutral';
  var recommendationWeight = _WEIGHT_MAP[mode]  != null ? _WEIGHT_MAP[mode] : 0.60;
  var uiDensity            = _DENSITY_MAP[displayStyle] || 'standard';
  var focus                = _FOCUS_LABEL_MAP[priority] || '症状の観察と理解';

  // ── state から ────────────────────────────────────────────
  var cyclePhase       = _computeCyclePhase(state.lastPeriodDate, state.cycleLength);
  var cycleDayNum      = _computeCycleDayNum(state.lastPeriodDate);
  var recentSymptomKeys = _recentSymptomKeys(records);
  var dataRichness     = _dataRichness(records);

  // ── 追加コンテキスト ──────────────────────────────────────
  // onboardingPurpose: state.purpose (オンボーディング選択)
  var onboardingPurpose = state.purpose || null;

  // hasTrackedConditions: 疾患が設定されているか
  var hasTrackedConditions = conditions.length > 0;

  var ctx = {
    // settings 由来
    mode:              mode,
    priority:          priority,
    displayStyle:      displayStyle,
    trackedConditions: conditions.slice(),

    // 派生 UI コンテキスト
    uiDensity:             uiDensity,
    emotionalTone:         emotionalTone,
    recommendationWeight:  recommendationWeight,
    focus:                 focus,

    // state 由来
    cyclePhase:          cyclePhase,
    cycleDayNum:         cycleDayNum,
    recentSymptomKeys:   recentSymptomKeys,
    hasTrackedConditions: hasTrackedConditions,
    dataRichness:        dataRichness,
    onboardingPurpose:   onboardingPurpose,

    // meta
    generatedAt: new Date().toISOString(),
  };

  _cache = ctx;
  return ctx;
}

// ─── キャッシュ無効化: 設定変更時 ────────────────────────────
// settings が変わったらコンテキストも即時更新できるようにする
(function _installSettingsInvalidation() {
  window.addEventListener('ippo:settings-profile-changed', function() {
    _cache = null;
  });
})();

// ─── 便利アクセサー ──────────────────────────────────────────

/**
 * tone を返す: 'gentle' | 'neutral' | 'reflective' | 'supportive'
 */
export function getEmotionalTone() {
  return getCompanionContext().emotionalTone;
}

/**
 * UI 密度を返す: 'minimal' | 'standard' | 'rich'
 */
export function getUIDensity() {
  return getCompanionContext().uiDensity;
}

/**
 * 推薦重みを返す: 0.0 - 1.0
 */
export function getRecommendationWeight() {
  return getCompanionContext().recommendationWeight;
}

/**
 * プライマリフォーカスラベル（日本語）を返す
 */
export function getFocusLabel() {
  return getCompanionContext().focus;
}

/**
 * 推薦を表示すべき閾値チェック
 * weight >= threshold のとき true
 */
export function shouldShowRecommendation(threshold) {
  threshold = threshold != null ? threshold : 0.5;
  return getCompanionContext().recommendationWeight >= threshold;
}

// ─── window 公開 ──────────────────────────────────────────────
window.getCompanionContext        = getCompanionContext;
window.invalidateContextCache     = invalidateContextCache;
window.getEmotionalTone           = getEmotionalTone;
window.getUIDensity               = getUIDensity;
window.getRecommendationWeight    = getRecommendationWeight;
window.getFocusLabel              = getFocusLabel;
window.shouldShowRecommendation   = shouldShowRecommendation;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('context-engine-loaded');
}
