// signal-insight-types.js — SSOT for Signal Insight domain type registries.
// BD-031: AI output is rule-based only — no LLM/ML.
// BD-038: ALL outputs must carry isMedicalAdvice:false; forbidden words auto-blocked.
// PR-057: Signal Insight Service

/**
 * Confidence level registry for Signal Insight outputs.
 * LOW confidence → output suppressed (BD-038 / spec requirement).
 * @readonly
 */
export const CONFIDENCE_LEVELS = Object.freeze({
  HIGH:   'HIGH',
  MEDIUM: 'MEDIUM',
  LOW:    'LOW',
});

/** Set of all valid confidence level strings. */
export const CONFIDENCE_LEVEL_SET = Object.freeze(new Set(Object.values(CONFIDENCE_LEVELS)));

/**
 * Insight type registry — the category of Signal change being reported.
 * @readonly
 */
export const INSIGHT_TYPES = Object.freeze({
  PAIN_TREND:          'PAIN_TREND',
  SLEEP_TREND:         'SLEEP_TREND',
  SYMPTOM_TREND:       'SYMPTOM_TREND',
  PHASE_COMPARISON:    'PHASE_COMPARISON',
  LONGITUDINAL_DELTA:  'LONGITUDINAL_DELTA',
  MULTI_SIGNAL:        'MULTI_SIGNAL',
});

/** Set of all valid insight type strings. */
export const INSIGHT_TYPE_SET = Object.freeze(new Set(Object.values(INSIGHT_TYPES)));

/**
 * Forbidden word list — BD-038 absolute prohibition.
 * Any output containing these words/phrases is blocked automatically.
 * Categories: 診断 / 治療指示 / 緊急度 / 医学的断定
 */
export const FORBIDDEN_WORDS = Object.freeze([
  // 診断系
  '〜病です', 'です（診断）', '診断されます', 'と診断', 'あなたは.*病',
  // 治療指示系
  '飲んでください', '服用してください', '治療してください', '手術', '投薬',
  'このサプリ', 'このサプリを', 'を飲め', 'を服用',
  // 緊急度系
  '今すぐ病院', 'すぐに受診', '緊急', '危険な状態', '重篤',
  // 因果断定系（PR-058との共用防止のため最小セットのみ）
  'の原因です', 'が原因です', 'のせいです',
  // 医学的断定
  'には効果があります', 'で治ります', 'が治癒',
]);

/**
 * Minimum data points required to generate a non-LOW-confidence insight.
 * Below this threshold, confidence is forced to LOW and output is suppressed.
 */
export const MIN_DATA_POINTS = 3;

/**
 * Comparison window pairs (days) for trend insights.
 * recent: signals within this many days
 * prior:  signals in the window before recent
 */
export const TREND_WINDOWS = Object.freeze({
  WEEK:  Object.freeze({ recent: 7,  prior: 7 }),
  MONTH: Object.freeze({ recent: 30, prior: 30 }),
});

/** Current schema version for SignalInsight records. */
export const SIGNAL_INSIGHT_SCHEMA_VERSION = '1';

/** Safety disclaimer always attached to every output (BD-038). */
export const MEDICAL_ADVICE_DISCLAIMER = 'これは医療アドバイスではありません';
