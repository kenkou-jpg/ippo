// src/home/home-insight-engine.js
// Phase H1-H5: Home Insight オーケストレーター。
// reason / prediction / temperature / action を集約して InsightPacket を返す。
// window.buildHomeInsight として公開。

import { generateReason }     from './reason-generator.js';
import { generatePrediction } from './prediction-generator.js';
import { generateAction }     from './action-generator.js';
import { analyzeTemperature } from '../analytics/temperature-engine.js';

/**
 * @param {object[]} records
 * @param {object}   state
 * @returns {{
 *   reason:      object|null,
 *   prediction:  object|null,
 *   action:      object,
 *   temperature: object|null,
 * }}
 */
export function buildHomeInsight(records, state) {
  const reason     = generateReason(records, state);
  const prediction = generatePrediction(records);

  let temperature = null;
  try {
    const tempResult = analyzeTemperature(records);
    if (tempResult.confidence !== 'insufficient') temperature = tempResult;
  } catch (_e) {
    // 基礎体温未記録時はスキップ
  }

  const action = generateAction({ reason, prediction, temperature, state });

  return { reason, prediction, action, temperature };
}

window.buildHomeInsight = buildHomeInsight;
