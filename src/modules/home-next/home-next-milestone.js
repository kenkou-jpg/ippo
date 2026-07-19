// ============================================================
//  ippo – home-next-milestone.js
//  PR-HOME-REBUILD-01: prototype/Home #home-milestone-banner 相当。
//  実験完了直後のみ表示する（常時表示しない）。判定ロジックは
//  home-next-experiment-adapter.js の getMilestoneViewModel()
//  （Before→After結果カードの可用性をそのまま再利用、別ロジックなし）。
// ============================================================

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} container
 * @param {{ title: string } | null} milestoneVm
 */
export function renderMilestone(container, milestoneVm) {
  if (!container) return;

  if (!milestoneVm) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="hn-milestone-banner">
      <span class="hn-milestone-mark" aria-hidden="true">✦</span>
      <div class="hn-milestone-copy">
        <div class="hn-milestone-title">「${esc(milestoneVm.title)}」の観察期間が終わりました</div>
        <p class="hn-milestone-sub">記録、お疲れさまでした。下の結果カードで変化を振り返ってみましょう。</p>
      </div>
    </div>
  `;
}
