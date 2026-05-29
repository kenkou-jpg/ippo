// ================================================================
//  ippo – src/modules/pro/shared/render/renderStatCard.js
//  pob-card (行リスト付きカード) を描画するプリミティブ
// ================================================================

import { renderMetricRow } from './renderMetricRow.js';

/**
 * pob-card を生成する。内部に renderMetricRow の行を並べる。
 *
 * @param {Array<{ label?: string, value?: string, name?: string, badge?: string }>} rows
 * @returns {string} HTML string
 */
export function renderStatCard(rows = []) {
  return `<div class="pob-card">${rows.map(renderMetricRow).join('')}</div>`;
}
