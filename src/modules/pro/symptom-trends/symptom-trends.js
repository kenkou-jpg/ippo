// ================================================================
//  ippo – src/modules/pro/symptom-trends/symptom-trends.js
//  症状推移グラフ — PRO 専用オーバーレイ (P31)
//
//  設計ルール: 1 feature = 1 screen owner
//  ・このモジュールは symptom-trends のみが使用する。
//  ・グラフ描画ロジック・計算ロジックは変更しない。
//  ・グラフ本体 (.ipr-graph-card) はインサイト画面が所有する。
//    → オーバーレイからはリンクボタンで案内する。
//
//  表示順 (P31):
//    1. 今見えていること  — 症状傾向サマリー
//    2. 症状推移グラフ    — インサイトへのリンク
//    3. なぜそう考えた？  — フレア・前期比の根拠
//    4. 詳しいデータ      — 数値比較
//
//  Exposed globals:
//    window.openSymptomTrends()
//    window.closeSymptomTrends()
// ================================================================

import { createProOverlay } from '../shared/pro-overlay-base.js';
import {
  getProState, esc,
  calcPeriodComparison,
  calcFlareDays,
} from '../shared/pro-metric-utils.js';
import {
  renderSummarySection,
  renderStatCard,
  renderAlertBox,
} from '../shared/render/index.js';

// ─── Constants ───────────────────────────────────────────────
const DAYS = 30;

// ─── Module state ────────────────────────────────────────────
let _api = null;

// ─── Lazy init ───────────────────────────────────────────────
function _ensureOverlay() {
  if (_api) return;
  _api = createProOverlay({
    id:        'st-overlay',
    ariaLabel: '症状推移グラフ',
    title:     '症状推移グラフ',
    subtitle:  '症状がどう変化しているか、前の30日と比べて確認できます',
    footer: [
      { id: 'st-btn-chart', label: 'インサイトでグラフを見る', cls: 'pob-btn pob-btn-primary'   },
      { id: 'st-btn-close', label: '閉じる',                  cls: 'pob-btn pob-btn-secondary' },
    ],
    onClose: closeSymptomTrends,
  });

  _api.getButton('st-btn-close').addEventListener('click', closeSymptomTrends);
  _api.getButton('st-btn-chart').addEventListener('click', () => {
    closeSymptomTrends();
    // インサイト画面のグラフへ案内
    if (typeof window.switchTab !== 'function') return;
    const p = window.switchTab('insights', null);
    const _scroll = () => {
      const graph = document.querySelector('.ipr-graph-card');
      if (graph) graph.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (p && typeof p.then === 'function') p.then(_scroll);
    else setTimeout(_scroll, 200);
  });
}

// ─── Data aggregation (グラフ計算変更禁止・既存ロジック流用) ──
function _aggregate() {
  const s      = getProState();
  const allRec = s?.records || [];
  const cmp    = calcPeriodComparison(allRec, DAYS);

  const symMap = {};
  (cmp.curr || []).forEach(r =>
    (r.symptoms || []).forEach(sym => { symMap[sym] = (symMap[sym] || 0) + 1; })
  );
  const topSyms = Object.entries(symMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

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

  const recentFlareDays = calcFlareDays(cmp.curr, 4);
  const prevFlareDays   = calcFlareDays(cmp.prev, 4);

  return {
    hasCurr:       cmp.curr.length >= 3,
    hasPrev:       cmp.prev.length >= 3,
    trendItems,
    recentFlareDays,
    prevFlareDays,
    delta:         cmp.delta,
    currCount:     cmp.curr.length,
  };
}

// ─── Render ──────────────────────────────────────────────────
function _render() {
  const data = _aggregate();

  if (!data.hasCurr) {
    _api.body.innerHTML = `
      <div class="pob-empty">
        記録が3日以上積み重なると<br>傾向が表示されます。
      </div>`;
    return;
  }

  const sections = [];

  // ── 1. 今見えていること ───────────────────────────────────
  if (data.trendItems.length > 0) {
    const rows = data.trendItems.map(({ sym, cnt, arrow, delta }) => {
      const deltaTxt = delta !== 0
        ? `（前期比 ${delta > 0 ? '+' : ''}${delta}日）`
        : '（変化なし）';
      return renderStatCard([{
        label: esc(sym),
        value: `${cnt}日　${arrow} <small style="color:rgba(44,36,32,.38);font-size:10px">${deltaTxt}</small>`,
      }]);
    }).join('');
    sections.push(renderSummarySection('今見えていること', rows));
  }

  // ── 2. 症状推移グラフ ─────────────────────────────────────
  sections.push(renderSummarySection('症状推移グラフ', `
    <div class="pob-info">
      <div class="pob-info-label">📈 グラフ</div>
      過去30日の症状・体調の折れ線グラフはインサイト画面で確認できます。<br>
      画面下の「インサイトでグラフを見る」ボタンから開けます。
    </div>`));

  // ── 3. なぜそう考えた？ ───────────────────────────────────
  const whySections = [];

  if (data.recentFlareDays > 0) {
    const prevNote = data.hasPrev
      ? `前の30日は ${data.prevFlareDays} 日でした。`
      : '';
    whySections.push(renderAlertBox('alert',
      `⚡ 直近30日に <strong>${data.recentFlareDays}日</strong> の強い症状がありました。${prevNote ? '<br>' + prevNote : ''}`
    ));
  } else {
    whySections.push(renderAlertBox('good',
      '✓ 直近30日に強い症状（フレア）はありませんでした。'
    ));
  }

  if (data.hasPrev && data.trendItems.length > 0) {
    const increasing = data.trendItems.filter(t => t.delta > 0);
    const decreasing = data.trendItems.filter(t => t.delta < 0);
    if (increasing.length > 0) {
      whySections.push(`<div class="pob-tip">
        前の30日より増えている症状: ${increasing.map(t => esc(t.sym)).join('・')}
      </div>`);
    }
    if (decreasing.length > 0) {
      whySections.push(`<div class="pob-tip">
        前の30日より減っている症状: ${decreasing.map(t => esc(t.sym)).join('・')}
      </div>`);
    }
  }

  sections.push(renderSummarySection('なぜそう考えた？', whySections.join('')));

  // ── 4. 詳しいデータ ───────────────────────────────────────
  if (data.hasPrev) {
    const d = data.delta;
    const detailRows = [];

    if (d.painDays.val !== 0)
      detailRows.push({ label: '痛みの日数（前期比）', value: d.painDays.str + (d.painDays.val > 0 ? ' ▲' : ' ▼') });
    if (d.flareDays.val !== 0)
      detailRows.push({ label: 'フレア日数（前期比）', value: d.flareDays.str + (d.flareDays.val > 0 ? ' ▲' : ' ▼') });
    if (Math.abs(d.avgSleep?.val ?? 0) >= 0.3)
      detailRows.push({ label: '平均睡眠時間（前期比）', value: d.avgSleep.str + (d.avgSleep.val > 0 ? ' ▲' : ' ▼') });

    if (detailRows.length > 0) {
      sections.push(renderSummarySection('詳しいデータ', renderStatCard(detailRows)));
    } else {
      sections.push(renderSummarySection('詳しいデータ',
        renderAlertBox('good', '前の30日と比べて、大きな数値の変化はありませんでした。')
      ));
    }
  } else {
    sections.push(renderSummarySection('詳しいデータ', `
      <div class="pob-no-data">
        前の30日分の記録が揃うと、より詳しい比較データが表示されます。<br>
        現在の記録日数: ${data.currCount}日
      </div>`));
  }

  _api.body.innerHTML = sections.join('');
}

// ─── Public API ──────────────────────────────────────────────
export function openSymptomTrends() {
  _ensureOverlay();
  _api.open();
  _render();
}

export function closeSymptomTrends() {
  _api?.close();
}

// ─── Expose globally ─────────────────────────────────────────
window.openSymptomTrends  = openSymptomTrends;
window.closeSymptomTrends = closeSymptomTrends;

// 後方互換: 旧 renderProSymptomTrends は insights 注入用だったが
// P31以降はオーバーレイに統一。呼び出し元が残っている場合の安全ガード。
window.renderProSymptomTrends = () => {};
