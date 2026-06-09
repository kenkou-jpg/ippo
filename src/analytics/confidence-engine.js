// src/analytics/confidence-engine.js
// Blueprint Phase1: サンプルサイズ評価・信頼度ラベル計算
// pure function のみ。window参照・副作用なし。

import { confidenceLabel } from './shared/stats-utils.js';

/**
 * サンプルサイズから信頼度ラベルを返す（Blueprint MIN_SAMPLES準拠）。
 * @param {number} sampleSize
 * @returns {'high'|'medium'|'low'|'insufficient'}
 */
export function calcConfidence(sampleSize) {
  return confidenceLabel(sampleSize);
}

/**
 * レコード配列から有効サンプル数を返す。
 * 有効レコード = symptoms が1件以上 または painLevel が設定されているもの。
 * @param {object[]} records
 * @param {((r: object) => boolean) | null} [filterFn]
 * @returns {number}
 */
export function calcSampleSize(records, filterFn = null) {
  const filtered = filterFn ? records.filter(filterFn) : records;
  return filtered.filter(r =>
    (r.symptoms && r.symptoms.length > 0) || r.painLevel != null
  ).length;
}

/**
 * サンプルサイズと信頼度をまとめて返す。
 * @param {object[]} records
 * @param {((r: object) => boolean) | null} [filterFn]
 * @returns {{ sampleSize: number, confidence: 'high'|'medium'|'low'|'insufficient', isDisplayable: boolean }}
 */
export function getSampleInfo(records, filterFn = null) {
  const sampleSize = calcSampleSize(records, filterFn);
  const confidence = calcConfidence(sampleSize);
  return { sampleSize, confidence, isDisplayable: confidence !== 'insufficient' };
}
