// ============================================================
//  ippo – home-next-result.js
//  PR-HOME-REBUILD-01: prototype/Home #home-result-section（card-result）相当。
//
//  医療的な改善断定は禁止（Founder指示）。「治った」「効果があった」等の
//  診断・因果断定表現は一切使わず、「観察された変化」としてのみ表現する。
//  実験結果が不足している場合（home-next-experiment-adapter.jsの
//  getResultCardViewModel()がnullを返す場合）はカードごと非表示にする。
// ============================================================

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// pain-levelの値をミニバーの高さ(%)へ変換（0-10想定、最大10で正規化）
function _barHeight(value) {
  const v = Math.max(0, Math.min(10, value));
  return Math.round((v / 10) * 100);
}

/**
 * @param {HTMLElement} container
 * @param {import('./home-next-experiment-adapter.js').getResultCardViewModel extends (...args: any) => Promise<infer R> ? R : never} resultVm
 */
export function renderResultCard(container, resultVm) {
  if (!container) return;

  if (!resultVm) {
    container.innerHTML = '';
    return;
  }

  const sign = resultVm.deltaPercent > 0 ? '+' : '';
  // 「改善」「悪化」等の価値判断語を避け、観察された変化のみを記述する。
  container.innerHTML = `
    <div class="hn-result-card">
      <div class="hn-result-flow">
        <span class="hn-result-title">${esc(resultVm.experimentTitle)}</span>
        <span class="hn-result-arrow">→</span>
        <span class="hn-result-target">痛みの記録平均</span>
      </div>
      <div class="hn-result-main-row">
        <div class="hn-result-delta-block">
          <div class="hn-result-delta">${sign}${resultVm.deltaPercent}<span class="hn-result-delta-unit">%</span></div>
          <p class="hn-result-meaning">痛みの記録平均が${resultVm.beforeValue}→${resultVm.afterValue}に変化しました</p>
        </div>
        <div class="hn-result-mini-compare">
          <div class="hn-result-mini-col">
            <div class="hn-result-mini-track"><div class="hn-result-mini-fill before" style="height:${_barHeight(resultVm.beforeValue)}%"></div></div>
            <span class="hn-result-mini-label">前</span>
          </div>
          <div class="hn-result-mini-col">
            <div class="hn-result-mini-track"><div class="hn-result-mini-fill after" style="height:${_barHeight(resultVm.afterValue)}%"></div></div>
            <span class="hn-result-mini-label">後</span>
          </div>
        </div>
      </div>
      <p class="hn-result-caption">観察期間${resultVm.observationDays}日間の記録に基づく変化です（参考情報、医療的な判断ではありません）</p>
    </div>
  `;
}
