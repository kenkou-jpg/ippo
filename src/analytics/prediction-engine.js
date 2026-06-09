// src/analytics/prediction-engine.js
//
// 責務: 翌日の体調予測（ルールベース）
// Phase4 で導入。ML モデルは使用しない。
// Blueprint 第7章記載の予測対象・特徴量・手法に準拠。
//
// 予測対象 (Blueprint 7.2):
//   pain     — 過去7日痛み EWMA + 周期フェーズ補正 + フレア直後フラグ
//   fatigue  — 過去3日睡眠品質・エネルギー・症状数の移動平均
//   headache — 睡眠 lag1・カフェイン lag1・月経フェーズのラグ相関
//   sleep    — 過去7日睡眠・ストレス・運動の EWMA
//
// 全出力に disclaimer: true を付与（Blueprint 7.3 医療免責必須）。
// pure function のみ。window参照・副作用なし。

import { sortByDate, sliceDays } from './shared/date-utils.js';
import { average } from './shared/stats-utils.js';

const EWMA_ALPHA      = 0.3;
const DISCLAIMER_TEXT = 'これは医療診断ではありません。参考情報としてご活用ください。';

/**
 * 翌日の体調を予測する（ルールベース）。
 *
 * @param {object[]} records
 * @returns {{
 *   pain:          { value: number|null, confidence: string },
 *   fatigue:       { value: number|null, confidence: string },
 *   headache:      { value: number|null, unit: 'probability', confidence: string },
 *   sleep:         { value: number|null, confidence: string },
 *   confidence:    'high'|'medium'|'low'|'insufficient',
 *   sampleSize:    number,
 *   disclaimer:    true,
 *   disclaimerText: string
 * }}
 */
export function predictNext(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return _emptyResult();
  }

  const sorted     = sortByDate(records);
  const sampleSize = sorted.length;

  return {
    pain:           _predictPain(sorted),
    fatigue:        _predictFatigue(sorted),
    headache:       _predictHeadache(sorted),
    sleep:          _predictSleep(sorted),
    confidence:     _predictConfidence(sampleSize),
    sampleSize,
    disclaimer:     true,
    disclaimerText: DISCLAIMER_TEXT,
  };
}

// ─── 個別予測 ─────────────────────────────────────────────────

/**
 * 痛み予測: 過去7日 EWMA + 周期フェーズ補正 + フレア直後フラグ
 * @private
 */
function _predictPain(sorted) {
  const recent7 = sliceDays(sorted, 7);
  if (recent7.length === 0) return { value: null, confidence: 'insufficient' };

  const ewma = _ewmaLast(recent7.map(r => r.painLevel || 0));

  // フレア直後補正: 直近2日に痛み7以上があれば +0.5
  const postFlare = sorted.slice(-2).some(r => (r.painLevel || 0) >= 7) ? 0.5 : 0;

  // 月経開始直後補正
  const cycleCorrection = _periodStartCorrection(sorted);

  const raw = ewma + postFlare + cycleCorrection;
  return {
    value:      _clamp10(raw),
    confidence: _predictConfidence(recent7.length),
  };
}

/**
 * 疲労予測: 過去3日の睡眠・エネルギー・症状数の移動平均
 * @private
 */
function _predictFatigue(sorted) {
  const recent3 = sliceDays(sorted, 3);
  if (recent3.length === 0) return { value: null, confidence: 'insufficient' };

  const avgEnergy   = average(recent3.map(r => r.energy    || 0));
  const sleepVals   = recent3.map(r => r.sleepHours || 0).filter(v => v > 0);
  const avgSleep    = sleepVals.length > 0 ? average(sleepVals) : 5;
  const avgSymptoms = average(recent3.map(r => (r.symptoms || []).length));

  // エネルギー低下 + 睡眠不足 + 症状多 → 疲労高
  const energyFactor  = Math.max(0, (5 - avgEnergy) / 5) * 4;
  const sleepFactor   = Math.max(0, (7 - avgSleep)  / 7) * 3;
  const symptomFactor = Math.min(avgSymptoms / 5, 1)     * 3;

  return {
    value:      _clamp10(energyFactor + sleepFactor + symptomFactor),
    confidence: _predictConfidence(recent3.length),
  };
}

/**
 * 頭痛リスク予測: 睡眠 lag1・カフェイン lag1・月経フェーズ
 * 出力 value は確率 (0〜1)。
 * @private
 */
function _predictHeadache(sorted) {
  if (sorted.length < 2) return { value: null, unit: 'probability', confidence: 'insufficient' };

  const yesterday = sorted[sorted.length - 1];
  let risk = 0;

  if ((yesterday.sleepHours   || 0) < 6)  risk += 0.30;
  if ((yesterday.sleepQuality || 0) < 3)  risk += 0.20;

  const factors = yesterday.factors || [];
  if (factors.includes('カフェイン'))  risk += 0.25;
  if (factors.includes('アルコール'))  risk += 0.20;

  if (yesterday.menstrualCycle && yesterday.menstrualCycle !== 'なし') risk += 0.15;

  return {
    value:      Math.round(Math.min(1, risk) * 100) / 100,
    unit:       'probability',
    confidence: _predictConfidence(sorted.length),
  };
}

/**
 * 睡眠予測: 過去7日 EWMA + ストレス・運動補正
 * @private
 */
function _predictSleep(sorted) {
  const recent7    = sliceDays(sorted, 7);
  const sleepVals  = recent7.map(r => r.sleepHours || 0).filter(v => v > 0);
  if (sleepVals.length === 0) return { value: null, confidence: 'insufficient' };

  const ewma = _ewmaLast(sleepVals);

  const last    = sorted[sorted.length - 1];
  const factors = last?.factors || [];
  const stress   = factors.includes('ストレス') ? -0.5 : 0;
  const exercise = factors.includes('運動')     ?  0.3 : 0;

  return {
    value:      Math.round(Math.max(0, ewma + stress + exercise) * 10) / 10,
    confidence: _predictConfidence(sleepVals.length),
  };
}

// ─── 補助関数 ─────────────────────────────────────────────────

/**
 * 値の配列に EWMA を適用し最終値を返す (α=0.3)。
 * @private
 */
function _ewmaLast(values) {
  if (values.length === 0) return 0;
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = EWMA_ALPHA * values[i] + (1 - EWMA_ALPHA) * ewma;
  }
  return Math.round(ewma * 100) / 100;
}

/**
 * Blueprint 7.3 準拠の予測信頼度。
 * sampleSize >= 60 → 'high' / >= 30 → 'medium' / else → 'low'
 * @private
 */
function _predictConfidence(sampleSize) {
  if (sampleSize >= 60) return 'high';
  if (sampleSize >= 30) return 'medium';
  return 'low';
}

/**
 * 直近7日以内に月経開始記録があれば +0.3 の補正値を返す。
 * @private
 */
function _periodStartCorrection(sorted) {
  const recent7 = sliceDays(sorted, 7);
  const keywords = ['開始', '1日目', '生理中'];
  const hasPeriodStart = recent7.some(r =>
    r.menstrualCycle && keywords.some(kw => r.menstrualCycle.includes(kw))
  );
  return hasPeriodStart ? 0.3 : 0;
}

/** 0〜10 にクランプして小数1桁に丸める。 */
function _clamp10(v) {
  return Math.round(Math.min(10, Math.max(0, v)) * 10) / 10;
}

function _emptyResult() {
  return {
    pain:           { value: null, confidence: 'insufficient' },
    fatigue:        { value: null, confidence: 'insufficient' },
    headache:       { value: null, unit: 'probability', confidence: 'insufficient' },
    sleep:          { value: null, confidence: 'insufficient' },
    confidence:     'insufficient',
    sampleSize:     0,
    disclaimer:     true,
    disclaimerText: DISCLAIMER_TEXT,
  };
}
