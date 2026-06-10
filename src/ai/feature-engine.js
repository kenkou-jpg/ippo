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
 * @typedef {Object} PredictionFeature
 * @property {number|null} painForecast     — 翌日痛み予測 (0-10)
 * @property {number|null} fatigueForecast  — 翌日疲労予測 (0-10)
 * @property {number|null} headacheForecast — 翌日頭痛リスク (0-1)
 * @property {number|null} sleepForecast    — 翌夜睡眠予測 (h)
 * @property {string}      confidence       — 'high'|'medium'|'low'|'insufficient'
 * @property {number}      sampleSize
 */

/**
 * @typedef {Object} ClusterFeature
 * @property {number|null} clusterId   — クラスタ番号 (0-4)
 * @property {number|null} clusterSize — 同クラスタのユーザー数
 * @property {number|null} avgPain     — 同クラスタ平均痛み
 * @property {number|null} avgFatigue  — 同クラスタ平均疲労
 * @property {number|null} avgSleep    — 同クラスタ平均睡眠
 */

/**
 * @typedef {Object} TemperatureFeature
 * @property {boolean}     biphasicDetected  — 二相性あり
 * @property {string|null} ovulationEstimate — 推定排卵日 YYYY-MM-DD
 * @property {number}      tempDiff          — 低温期・高温期の温度差
 * @property {string}      confidence
 */

/**
 * @typedef {Object} ClaudeFeatures
 * @property {string}             period          — 分析期間ラベル
 * @property {number}             sampleSize      — 有効レコード数
 * @property {string}             confidence      — 'high'|'medium'|'low'|'insufficient'
 * @property {string[]}           topSymptoms     — 上位5症状名
 * @property {string}             trend           — 'worsening'|'stable'|'improving'
 * @property {string}             flareRate       — "25%" 形式
 * @property {string|null}        flareTrigger    — 最頻フレアトリガー
 * @property {string|null}        disease         — 疾患名（日本語）
 * @property {object|null}        diseaseSpecific — 疾患固有の分析結果
 * @property {boolean}            worsened        — 直近30日で悪化傾向か
 * @property {string}             disclaimer      — 医療免責文言（常に付与）
 * @property {PredictionFeature|null}  prediction — PR-D1: 翌日予測
 * @property {ClusterFeature|null}     cluster    — PR-D2: クラスタ比較
 * @property {TemperatureFeature|null} temperature — PR-D3: 体温分析
 */

/**
 * 分析エンジン群の出力から Claude 入力特徴量を生成する。
 *
 * @param {object} analyticsResults — {
 *   sampleInfo?:     { sampleSize, confidence },
 *   flares?:         { flareRate, topTriggers },
 *   diseaseAnalysis?: object[],   // disease-registry の analyzeAll() 出力
 *   prediction?:     predictNext() の出力 (PR-D1)
 *   cluster?:        { clusterId, clusterSize, avgPain, avgFatigue, avgSleep } (PR-D2)
 *   temperature?:    analyzeTemperature() の出力 (PR-D3)
 * }
 * @param {object} state — { diseases?, lastPeriodDate?, cycleLength? }
 * @returns {ClaudeFeatures}
 */
export function extractFeatures(analyticsResults, state = {}) {
  const { sampleInfo, flares, diseaseAnalysis, prediction, cluster, temperature } = analyticsResults || {};
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
    prediction:      _extractPrediction(prediction),
    cluster:         _extractCluster(cluster),
    temperature:     _extractTemperature(temperature),
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

// ─── PR-D1: Prediction ───────────────────────────────────────

/**
 * predictNext() 出力 → PredictionFeature（生レコードなし）
 * @private
 */
function _extractPrediction(prediction) {
  if (!prediction || prediction.confidence === 'insufficient') return null;
  return {
    painForecast:     prediction.pain?.value     ?? null,
    fatigueForecast:  prediction.fatigue?.value  ?? null,
    headacheForecast: prediction.headache?.value ?? null,
    sleepForecast:    prediction.sleep?.value    ?? null,
    confidence:       prediction.confidence      ?? 'low',
    sampleSize:       prediction.sampleSize      ?? 0,
  };
}

// ─── PR-D2: Cluster ──────────────────────────────────────────

/**
 * profiles.cluster_meta 読み込み結果 → ClusterFeature
 * @private
 */
function _extractCluster(cluster) {
  if (!cluster || cluster.clusterId === null || cluster.clusterId === undefined) return null;
  return {
    clusterId:   cluster.clusterId,
    clusterSize: cluster.clusterSize  ?? null,
    avgPain:     cluster.avgPain      ?? null,
    avgFatigue:  cluster.avgFatigue   ?? null,
    avgSleep:    cluster.avgSleep     ?? null,
  };
}

// ─── PR-D3: Temperature ──────────────────────────────────────

/**
 * analyzeTemperature() 出力 → TemperatureFeature（readings/ewmaLine除去）
 * @private
 */
function _extractTemperature(temperature) {
  if (!temperature || temperature.confidence === 'insufficient') return null;
  return {
    biphasicDetected:  temperature.biphasicDetected  ?? false,
    ovulationEstimate: temperature.ovulationEstimate ?? null,
    tempDiff:          temperature.tempDiff          ?? 0,
    confidence:        temperature.confidence        ?? 'low',
  };
}
