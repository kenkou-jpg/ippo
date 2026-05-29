// ================================================================
//  ippo – src/modules/pro/shared/render/renderAlertBox.js
//  pob-alert / pob-good / pob-info ボックスを描画するプリミティブ
//
//  内部 HTML は呼び出し側が構成する。
//  エスケープ済みテキストを渡すこと。意図的なマークアップ（<strong> 等）は許可。
// ================================================================

/**
 * ステータスボックスを生成する。
 *
 * @param {'alert'|'good'|'info'} type      - ボックス種別 → pob-{type} クラス
 * @param {string}                 html      - 内部 HTML
 * @param {string}                [extraCls] - 追加 CSS クラス（スペース区切りで複数可）
 * @returns {string} HTML string
 */
export function renderAlertBox(type, html, extraCls = '') {
  const cls = extraCls ? `pob-${type} ${extraCls}` : `pob-${type}`;
  return `<div class="${cls}">${html}</div>`;
}
