// src/ai/feature-engine.js
// Phase3: 分析エンジン出力 → Claude入力特徴量への変換。
//
// ルール（Blueprint 6.1）:
//   records[] の生データは Claude に渡さない。
//   このファイルが将来の唯一の Claude 入力経路となる。
//
// 入力: analyticsResults（各エンジン出力の集約オブジェクト）+ state
// 出力: ClaudeFeatures（文字列・数値・boolean のみ。生レコードなし）

/**
 * @typedef {Object} ClaudeFeatures
 * @property {string}         period          — 分析期間ラベル
 * @property {number}         sampleSize      — 有効レコード数
 * @property {string}         confidence      — 'high'|'medium'|'low'|'insufficient'
 * @property {string[]}       topSymptoms     — 上位5症状名
 * @property {string}         trend           — 'worsening'|'stable'|'improving'
 * @property {string}         flareRate       — "25%" 形式
 * @property {string|null}    flareTrigger    — 最頻フレアトリガー
 * @property {string|null}    disease         — 疾患名（日本語）
 * @property {object|null}    diseaseSpecific — 疾患固有の分析結果
 * @property {boolean}        worsened        — 直近30日で悪化傾向か
 * @property {string}         disclaimer      — 医療免責文言（常に付与）
 */

/**
 * 分析エンジン群の出力から Claude 入力特徴量を生成する。
 *
 * @param {object} analyticsResults — {
 *   sampleInfo?:     { sampleSize, confidence },
 *   flares?:         { flareRate, topTriggers },
 *   diseaseAnalysis?: object[],   // disease-registry の analyzeAll() 出力
 * }
 * @param {object} state — { diseases?, lastPeriodDate?, cycleLength? }
 * @returns {ClaudeFeatures}
 */
export function extractFeatures(analyticsResults, state = {}) {
  const { sampleInfo, flares, diseaseAnalysis } = analyticsResults || {};
  const primaryDisease = diseaseAnalysis?.[0] || null;

  return {
    period:          _formatPeriod(analyticsResults),
    sampleSize:      sampleInfo?.sampleSize ?? 0,
    confidence:      sampleInfo?.confidence ?? 'insufficient',
    topSymptoms:     _formatTopSymptoms(analyticsResults),
    trend:           _determineTrend(primaryDisease),
    flareRate:       `${Math.round((flares?.flareRate || 0) * 100)}%`,
    flareTrigger:    flares?.topTriggers?.[0]?.factor ?? null,
    disease:         primaryDisease?.disease ?? (state.diseases?.[0] || null),
    diseaseSpecific: _safeDiseasePecific(primaryDisease),
    worsened:        primaryDisease?.trend?.direction === 'worsening',
    disclaimer:      'これは医療診断ではありません。症状が続く場合は医師にご相談ください。',
  };
}

/**
 * ClaudeFeatures を人間が読みやすい概要文字列に変換する（デバッグ・ログ用）。
 * Claude のプロンプトへの埋め込みは prompt-builder.js が担う。
 * @param {ClaudeFeatures} features
 * @returns {string}
 */
export function featuresToSummary(features) {
  const lines = [
    `疾患: ${features.disease || '未設定'}`,
    `期間: ${features.period}  サンプル: ${features.sampleSize}件  信頼度: ${features.confidence}`,
    `主な症状: ${features.topSymptoms.join('、') || 'なし'}`,
    `傾向: ${_trendLabel(features.trend)}  フレア率: ${features.flareRate}`,
  ];
  if (features.flareTrigger) lines.push(`主要トリガー: ${features.flareTrigger}`);
  return lines.join('\n');
}

// ─── private helpers ─────────────────────────────────────────

function _formatPeriod(results) {
  const n = results?.sampleInfo?.sampleSize;
  if (!n) return '直近90日';
  return `直近90日（${n}件の記録）`;
}

function _formatTopSymptoms(results) {
  const diseaseTop = results?.diseaseAnalysis?.[0]?.symptomFrequency;
  if (diseaseTop?.length) {
    return diseaseTop.slice(0, 5).map(s => s.symptom);
  }
  // disease分析がない場合はフレア由来の症状を使用
  return [];
}

function _determineTrend(primaryDisease) {
  if (!primaryDisease) return 'stable';
  return primaryDisease.trend?.direction || 'stable';
}

function _safeDiseasePecific(primaryDisease) {
  // 生レコード参照を含まない diseaseSpecific だけを返す
  if (!primaryDisease?.diseaseSpecific) return null;
  return primaryDisease.diseaseSpecific;
}

function _trendLabel(trend) {
  return trend === 'worsening' ? '悪化傾向'
       : trend === 'improving' ? '改善傾向'
       : '安定';
}
