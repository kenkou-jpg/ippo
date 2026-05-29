// ================================================================
//  ippo – src/modules/pro/shared/render/renderTimeline.js
//  タイムライン行リストを描画するプリミティブ
//
//  ※ 将来用（フレアタイムライン・症状タイムライン等）
//  CSS: pro-overlay-base.css の .pob-timeline / .pob-tl-* を参照
// ================================================================

/**
 * タイムラインを生成する。
 *
 * @param {Array<{ date: string, label: string, level?: number }>} entries
 *   date  - 表示日付文字列（YYYY-MM-DD 等）
 *   label - 行ラベルテキスト
 *   level - 任意の強度レベル（0–5）→ pob-tl-level-{n} クラスを付与
 * @returns {string} HTML string — entries が空の場合は空文字
 */
export function renderTimeline(entries = []) {
  if (!entries.length) return '';

  const rows = entries.map(({ date, label, level }) => {
    const levelCls = level != null ? ` pob-tl-level-${level}` : '';
    return `
      <div class="pob-tl-row${levelCls}">
        <span class="pob-tl-date">${date}</span>
        <span class="pob-tl-label">${label}</span>
      </div>`;
  }).join('');

  return `<div class="pob-timeline">${rows}</div>`;
}
