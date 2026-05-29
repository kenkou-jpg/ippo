// ================================================================
//  ippo – src/modules/pro/shared/render/renderSummarySection.js
//  pob-section ラッパーを描画するプリミティブ
// ================================================================

/**
 * pob-section を生成する。
 *
 * @param {string|null} title       - セクションタイトル（null/''/undefined → タイトル要素なし）
 * @param {string}      contentHTML - 内部 HTML（呼び出し側で組み立て済み）
 * @returns {string} HTML string
 */
export function renderSummarySection(title, contentHTML) {
  const titleHtml = title ? `<div class="pob-section-title">${title}</div>` : '';
  return `<div class="pob-section">${titleHtml}${contentHTML}</div>`;
}
