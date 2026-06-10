// src/home/reason-generator.js
// Phase H1: DiseaseAnalyzer 結果 → ReasonCard 生成。
// 分析はしない。analyzeAll の出力を人間語に整形するだけ。

import { analyzeAll, resolveKeys } from '../disease/disease-registry.js';

const CONFIDENCE_MAP = { high: 0.9, medium: 0.7, low: 0.5, insufficient: 0 };

/**
 * @param {object[]} records
 * @param {object}   state
 * @returns {{
 *   type:           string,
 *   title:          string,
 *   body:           string,
 *   confidence:     number,
 *   topTrigger:     string|null,
 *   trendDirection: string|null,
 *   flareRate:      number|null,
 * } | null}
 */
export function generateReason(records, state) {
  try {
    const keys = resolveKeys(state.myDiseases);
    if (!keys.length) return null;

    const results = analyzeAll(keys, records, state);
    if (!results.length) return null;

    const result = results[0];
    const confidence = CONFIDENCE_MAP[result.confidence] ?? 0;
    if (confidence === 0) return null;

    const topTrigger     = result.topFactors?.[0]?.factor ?? null;
    const trendDirection = result.trend?.direction         ?? null;
    const flareRate      = result.flarePattern?.rate       ?? null;

    const title = result.disease + 'の体調について';
    const body  = _buildBody(result);
    if (!body) return null;

    return { type: 'reason', title, body, confidence, topTrigger, trendDirection, flareRate };
  } catch (_e) {
    return null;
  }
}

function _buildBody(result) {
  const parts = [];

  const dir = result.trend?.direction;
  if (dir === 'worsening') parts.push('直近30日で症状が増える傾向があります。');
  if (dir === 'improving') parts.push('直近30日で症状が落ち着いてきています。');

  const flareRate = result.flarePattern?.rate;
  if (flareRate >= 0.2) {
    parts.push('過去90日の約' + Math.round(flareRate * 100) + '%の日にフレアが見られます。');
  }

  const topFactor = result.topFactors?.[0]?.factor;
  if (topFactor) parts.push('「' + topFactor + '」が症状と重なりやすい傾向があります。');

  const topSymptom = result.symptomFrequency?.[0]?.symptom;
  if (topSymptom) parts.push('よく見られる症状: ' + topSymptom + '。');

  return parts.join(' ') || null;
}
