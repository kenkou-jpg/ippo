// ============================================================
//  ippo – home-next-hero-ring.js
//  PR-HOME-REBUILD-01: prototype/Home #hero-ring / #hero-streak-dots 相当。
//  実データ（進行中の実験の進捗・直近7日の記録有無）のみ描画する。
//  架空データは使わない。進行中の実験が無い場合はprototype思想通りの
//  Empty State（「まだ実験はありません」）を表示する。
// ============================================================

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} container
 * @param {{ active: boolean, title?: string, progress?: object }} heroVm
 *   home-next-experiment-adapter.js の getHeroExperimentViewModel()
 * @param {{ days: Array<{date:string, hasRecord:boolean, isToday:boolean}> }} streakVm
 *   home-next-experiment-adapter.js の getStreakViewModel()
 */
export function renderHeroRing(container, heroVm, streakVm) {
  if (!container) return;

  const pct = heroVm.active ? heroVm.progress.progressPercent : 0;
  const dayNumber = heroVm.active ? heroVm.progress.currentDay : 0;
  const nameLabel = heroVm.active
    ? `🧪 ${esc(heroVm.title)}`
    : '🌱 まだ実験はありません';
  const caption = heroVm.active
    ? `残り${Math.max(0, heroVm.progress.totalDays - heroVm.progress.currentDay)}日・${heroVm.progress.currentDay}日目`
    : '記録を続けると実験を始められます';

  const dots = (streakVm.days || []).map((d) => {
    const cls = ['hn-streak-dot'];
    if (d.hasRecord) cls.push('hn-streak-dot-recorded');
    if (d.isToday)   cls.push('hn-streak-dot-today');
    return `<span class="${cls.join(' ')}"></span>`;
  }).join('');

  container.innerHTML = `
    <div class="hn-hero-signature">
      <div class="hn-hero-ring" style="--hn-ring-pct:${pct}">
        <div class="hn-hero-ring-inner">
          <span class="hn-hero-ring-day">${dayNumber}</span>
          <span class="hn-hero-ring-unit">日目</span>
        </div>
      </div>
      <div class="hn-hero-signature-info">
        <span class="hn-hero-experiment-name">${nameLabel}</span>
        <span class="hn-hero-progress-caption">${esc(caption)}</span>
      </div>
    </div>
    <div class="hn-hero-streak">
      <span class="hn-hero-streak-label">直近7日</span>
      <div class="hn-hero-streak-dots">${dots}</div>
    </div>
  `;
}
