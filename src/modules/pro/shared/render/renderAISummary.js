// ================================================================
//  ippo – src/modules/pro/shared/render/renderAISummary.js
//  AI サマリーカードを描画するプリミティブ
//
//  ※ 将来用（AI short summary / AI observation 等）
//  非同期取得中は loading 表示、取得後に summary を流し込む。
//
//  使用例（async render token パターンと組み合わせ）:
//    _api.body.innerHTML = renderAISummaryCard({ loading: true });
//    const token = _api.nextToken();
//    const summary = await fetchAISummary();
//    if (_api.isStale(token)) return;
//    // AI card 部分だけ差し替え
//    el.querySelector('.pob-ai-card').outerHTML = renderAISummaryCard({ summary });
// ================================================================

/**
 * AI サマリーカードを生成する。
 *
 * @param {Object}  opts
 * @param {boolean} [opts.loading=false] - ローディング状態を表示
 * @param {string}  [opts.summary='']   - AI 生成サマリー文（HTML 可）
 * @returns {string} HTML string — loading=false かつ summary 空の場合は空文字
 */
export function renderAISummaryCard({ loading = false, summary = '' } = {}) {
  if (!loading && !summary) return '';

  const body = loading
    ? `<div class="pob-loading">分析中...</div>`
    : summary;

  return `
    <div class="pob-info pob-ai-card">
      <div class="pob-info-label">🤖 AI サマリー</div>
      ${body}
    </div>`;
}
