// ================================================================
//  ippo – src/modules/pro/shared/render/renderEmptyState.js
//  空状態を描画するプリミティブ
//
//  シンプルモード : desc のみ → pob-empty
//  フルモード     : icon+title → pob-empty-state（アクションボタン付き可）
// ================================================================

/**
 * 空状態を生成する。
 *
 * シンプルモード（icon/title なし）:
 *   <div class="pob-empty">…</div>
 *
 * フルモード（icon または title あり）:
 *   <div class="pob-empty-state">…</div>
 *
 * @param {Object}  opts
 * @param {string}  [opts.desc='']         - 説明文（HTML 可）
 * @param {string}  [opts.icon]            - 絵文字アイコン（フルモード）
 * @param {string}  [opts.title]           - タイトルテキスト（フルモード）
 * @param {string}  [opts.actionLabel]     - アクションボタンのラベル
 * @param {string}  [opts.actionOnclick]   - アクションボタンのインライン onclick 文字列
 * @returns {string} HTML string
 */
export function renderEmptyState({ desc = '', icon, title, actionLabel, actionOnclick } = {}) {
  if (!icon && !title) {
    // シンプルモード
    return `<div class="pob-empty">${desc}</div>`;
  }

  const iconHtml   = icon  ? `<div class="pob-empty-icon">${icon}</div>`   : '';
  const titleHtml  = title ? `<div class="pob-empty-title">${title}</div>` : '';
  const descHtml   = desc  ? `<div class="pob-empty-desc">${desc}</div>`   : '';
  const actionHtml = actionLabel
    ? `<button class="pob-empty-action"${actionOnclick ? ` onclick="${actionOnclick}"` : ''}>${actionLabel}</button>`
    : '';

  return `
    <div class="pob-empty-state">
      ${iconHtml}${titleHtml}${descHtml}${actionHtml}
    </div>`;
}
