// src/home/prediction-generator.js
// Phase H2: PredictionEngine 結果 → PredictionCard 生成。
// 計算しない。predictNext の出力を人間語に整形するだけ。

import { predictNext } from '../analytics/prediction-engine.js';

const CONFIDENCE_MAP = { high: 0.9, medium: 0.7, low: 0.5, insufficient: 0 };
const DISCLAIMER = '※医療診断ではありません。';

/**
 * @param {object[]} records
 * @returns {{
 *   type:         string,
 *   title:        string,
 *   body:         string,
 *   confidence:   number,
 *   painScore:    number|null,
 *   headacheRisk: number|null,
 *   fatigueScore: number|null,
 * } | null}
 */
export function generatePrediction(records) {
  try {
    const result = predictNext(records);
    const confidence = CONFIDENCE_MAP[result.confidence] ?? 0;
    if (confidence === 0) return null;

    const painScore    = result.pain?.value    ?? null;
    const headacheRisk = result.headache?.value ?? null;
    const fatigueScore = result.fatigue?.value  ?? null;

    const body = _buildBody(result);
    if (!body) return null;

    return {
      type:  'prediction',
      title: '明日の体調予測',
      body:  body + ' ' + DISCLAIMER,
      confidence,
      painScore,
      headacheRisk,
      fatigueScore,
    };
  } catch (_e) {
    return null;
  }
}

function _buildBody(result) {
  const parts = [];

  const pain = result.pain?.value;
  if (pain != null) {
    if (pain >= 7)      parts.push('痛みが強くなる可能性があります（予測スコア ' + pain + '/10）。');
    else if (pain >= 4) parts.push('中程度の痛みが続く可能性があります（予測スコア ' + pain + '/10）。');
    else if (pain >= 1) parts.push('軽い痛みが残るかもしれません（予測スコア ' + pain + '/10）。');
  }

  const headache = result.headache?.value;
  if (headache != null && headache >= 0.5) {
    parts.push('頭痛リスクがやや高め（約' + Math.round(headache * 100) + '%）。');
  }

  const fatigue = result.fatigue?.value;
  if (fatigue != null && fatigue >= 6) {
    parts.push('疲れが残りやすい状態です。');
  }

  return parts.join(' ') || null;
}
