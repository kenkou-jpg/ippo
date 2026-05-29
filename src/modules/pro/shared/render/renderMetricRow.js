// ================================================================
//  ippo – src/modules/pro/shared/render/renderMetricRow.js
//  単一の pob-row を描画するプリミティブ
//
//  呼び出し側でエスケープ済みの文字列を渡すこと。
//  このレンダラーはエスケープを行わない。
// ================================================================

/**
 * pob-row を一行生成する。
 *
 * パターン:
 *   { label, value }   →  .pob-row-label + .pob-row-value
 *   { name, badge }    →  plain span + .pob-count-badge
 *   { name }           →  plain span のみ
 *
 * @param {Object} row
 * @param {string} [row.label]  - ラベル列テキスト
 * @param {string} [row.value]  - 値列テキスト
 * @param {string} [row.name]   - 項目名テキスト（badge モード / name-only モード）
 * @param {string} [row.badge]  - バッジテキスト（右端）
 * @returns {string} HTML string
 */
export function renderMetricRow({ label, value, name, badge } = {}) {
  if (badge !== undefined) {
    // 頻度バッジ付き行
    return `<div class="pob-row"><span>${name ?? ''}</span><span class="pob-count-badge">${badge}</span></div>`;
  }
  if (value !== undefined) {
    // ラベル + 値行
    return `<div class="pob-row"><span class="pob-row-label">${label ?? ''}</span><span class="pob-row-value">${value}</span></div>`;
  }
  // テキストのみ行
  return `<div class="pob-row"><span>${name ?? label ?? ''}</span></div>`;
}
