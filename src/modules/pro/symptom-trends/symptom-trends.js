// ================================================================
//  ippo – src/modules/pro/symptom-trends/symptom-trends.js
//  症状推移グラフ — PRO 向け ins-pane-trends 強化
//
//  設計ルール: 新規overlay禁止。既存 ins-pane-trends を利用する。
//  このモジュールは ins-pane-trends の下部に PRO コンテンツを注入する。
//
//  Exposed globals:
//    window.renderProSymptomTrends()
// ================================================================

import {
  getProState, esc,
  getLastNDays,
  calcPeriodComparison,
  calcFlareDays,
} from '../shared/pro-metric-utils.js';
import {
  renderSummarySection,
  renderStatCard,
  renderAlertBox,
} from '../shared/render/index.js';

// ─── Constants ───────────────────────────────────────────────
const DAYS       = 30;
const CONTAINER_ID = 'dvs-pro-trends-summary';

// ─── Aggregate ───────────────────────────────────────────────
function _aggregate() {
  const s      = getProState();
  const allRec = s?.records || [];
  const cmp    = calcPeriodComparison(allRec, DAYS);

  // 直近N日の症状頻度（上位5）
  const symMap = {};
  (cmp.curr || []).forEach(r =>
    (r.symptoms || []).forEach(sym => { symMap[sym] = (symMap[sym] || 0) + 1; })
  );
  const topSyms = Object.entries(symMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 前期比の症状変化
  const prevMap = {};
  (cmp.prev || []).forEach(r =>
    (r.symptoms || []).forEach(sym => { prevMap[sym] = (prevMap[sym] || 0) + 1; })
  );
  const trendItems = topSyms.map(([sym, cnt]) => {
    const prev  = prevMap[sym] ?? 0;
    const delta = cnt - prev;
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    return { sym, cnt, delta, arrow };
  });

  // フレア日（直近 & 前期）
  const recentFlareDays = calcFlareDays(cmp.curr, 4);
  const prevFlareDays   = calcFlareDays(cmp.prev, 4);

  return {
    hasCurr:          cmp.curr.length >= 3,
    hasPrev:          cmp.prev.length >= 3,
    trendItems,
    recentFlareDays,
    prevFlareDays,
    delta:            cmp.delta,
  };
}

// ─── Build PRO trends summary HTML ───────────────────────────
function _buildTrendsSummary() {
  const data = _aggregate();

  if (!data.hasCurr) {
    return `<div id="${CONTAINER_ID}"></div>`;
  }

  const sections = [];

  // ── 最近30日の傾向
  if (data.trendItems.length > 0) {
    const rows = data.trendItems.map(({ sym, cnt, arrow }) =>
      renderStatCard([{
        label: `${esc(sym)}`,
        value: `${cnt}日　${arrow}`,
      }])
    ).join('');
    sections.push(renderSummarySection('最近30日の症状傾向', rows));
  }

  // ── フレアマーカー補足
  if (data.recentFlareDays > 0) {
    const prevNote = data.hasPrev
      ? `（前の30日：${data.prevFlareDays}日）`
      : '';
    sections.push(renderSummarySection(null,
      renderAlertBox('alert',
        `⚡ フレア：直近30日に <strong>${data.recentFlareDays}日</strong> の強い症状がありました。${prevNote}`
      )
    ));
  } else if (data.recentFlareDays === 0 && data.hasCurr) {
    sections.push(renderSummarySection(null,
      renderAlertBox('good', '✓ フレア：直近30日に強い症状はありませんでした。')
    ));
  }

  // ── 前期比サマリー（前期データあり）
  if (data.hasPrev) {
    const d = data.delta;
    const changeRows = [];
    if (d.painDays.val !== 0)
      changeRows.push({ label: '痛みの日数', value: d.painDays.str + (d.painDays.val > 0 ? ' ▲' : ' ▼') });
    if (d.flareDays.val !== 0)
      changeRows.push({ label: 'フレア日数', value: d.flareDays.str + (d.flareDays.val > 0 ? ' ▲' : ' ▼') });
    if (Math.abs(d.avgSleep.val) >= 0.3)
      changeRows.push({ label: '睡眠時間', value: d.avgSleep.str + (d.avgSleep.val > 0 ? ' ▲' : ' ▼') });

    if (changeRows.length > 0) {
      sections.push(renderSummarySection('前の30日との比較', renderStatCard(changeRows)));
    } else {
      sections.push(renderSummarySection(null,
        renderAlertBox('good', '前の30日と比べて、大きな変化はありませんでした。')
      ));
    }
  }

  if (sections.length === 0) return `<div id="${CONTAINER_ID}"></div>`;

  return `
    <div id="${CONTAINER_ID}" style="padding:0 0 16px">
      <div style="font-size:11px;font-weight:600;color:#a78bfa;letter-spacing:.06em;text-transform:uppercase;margin:16px 0 8px;padding:0 16px">
        PRO サマリー
      </div>
      ${sections.join('')}
    </div>`;
}

// ─── Inject after .ipr-graph-card (visible in current single-scroll design) ──
// ins-pane-trends は display:none 永久固定のため使わない。
// 実際の「症状・体調の推移」は .ipr-graph-card として常時表示されている。
export function renderProSymptomTrends() {
  const anchor = document.querySelector('.ipr-graph-card');
  if (!anchor) return;

  // 既存の PRO サマリーを削除して再描画
  const old = document.getElementById(CONTAINER_ID);
  if (old) old.remove();

  anchor.insertAdjacentHTML('afterend', _buildTrendsSummary());
}

// ─── Expose globally ─────────────────────────────────────────
window.renderProSymptomTrends = renderProSymptomTrends;
