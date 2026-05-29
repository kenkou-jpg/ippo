// ================================================================
//  ippo – src/modules/pro/doctor-summary/doctor-summary.js
//  受診用まとめ — 専用 PRO overlay
//
//  設計ルール: 1 feature = 1 screen owner
//  ・このモジュールは doctor-summary のみが使用する。
//  ・doctorSummaryOverlay（からだサマリー / ds-prefix）とは完全分離。
//  ・責務: 「医師へ渡すため」の観察まとめを生成する。
//
//  Exposed globals:
//    window.openDoctorVisitSummary()
//    window.closeDoctorVisitSummary()
// ================================================================

import './doctor-summary.css';
import { createProOverlay } from '../shared/pro-overlay-base.js';
import {
  getProState, esc,
  getLastNDays,
  calcSymptomFreq,
  calcFlareDays, calcPainDays,
  calcAvgSleep, calcAvgTemp,
  getCycleInfo, getSortedDates,
  calcPeriodComparison, calcSymptomChanges,
} from '../shared/pro-metric-utils.js';
import { copyToClipboard } from '../shared/pro-copy-utils.js';
import {
  renderSummarySection,
  renderStatCard,
  renderAlertBox,
  renderMetricRow,
  renderEmptyState,
} from '../shared/render/index.js';

// ─── Constants ───────────────────────────────────────────────
const DAYS = 30;

// ─── Module state ────────────────────────────────────────────
let _api = null;   // { overlay, body, open, close, ... }

// ─── Lazy init ───────────────────────────────────────────────
function _ensureOverlay() {
  if (_api) return;
  _api = createProOverlay({
    id:         'dvs-overlay',
    ariaLabel:  '受診用まとめ',
    title:      '受診用まとめ',
    subtitle:   '医師へお伝えするための観察サマリー（過去30日）',
    disclaimer: '※ このまとめは記録データをもとにした傾向整理です。医学的診断ではありません。',
    footer: [
      { id: 'dvs-btn-close', label: '閉じる',           cls: 'pob-btn pob-btn-secondary' },
      { id: 'dvs-btn-copy',  label: 'テキストをコピー', cls: 'pob-btn pob-btn-primary'   },
    ],
    onClose: closeDoctorVisitSummary,
  });

  _api.getButton('dvs-btn-close').addEventListener('click', closeDoctorVisitSummary);
  _api.getButton('dvs-btn-copy').addEventListener('click', () => {
    copyToClipboard(
      _buildCopyText(_aggregate()),
      _api.getButton('dvs-btn-copy'),
    );
  });
}

// ─── Data aggregation ────────────────────────────────────────
function _aggregate() {
  const s      = getProState();
  const allRec = s?.records || [];
  const r30    = getLastNDays(allRec, DAYS);
  const dates  = getSortedDates(r30);
  const cmp    = calcPeriodComparison(allRec, DAYS);
  const symChg = calcSymptomChanges(cmp.curr, cmp.prev);

  return {
    totalDays:   r30.length,
    period:      dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    topSymptoms: calcSymptomFreq(r30, 8),
    flareDays:   calcFlareDays(r30, 4),
    painDays:    calcPainDays(r30, 2),
    avgSleep:    calcAvgSleep(r30),
    avgTemp:     calcAvgTemp(r30),
    ...getCycleInfo(s),
    myDiseases:  s?.myDiseases ?? (s?.myDisease ? [s.myDisease] : []),
    comparison:  cmp,
    symChanges:  symChg,
  };
}

// ─── Section builders ────────────────────────────────────────
function _buildSections(data) {
  if (!data || data.totalDays === 0) {
    return [renderEmptyState({
      desc: `過去${DAYS}日間の記録がありません。<br>毎日の記録を続けると、受診用まとめが自動生成されます。`,
    })];
  }

  const s = [];

  // ── 対象期間
  if (data.period) {
    s.push(renderSummarySection('対象期間',
      renderStatCard([
        { label: '記録日数', value: `${data.totalDays} 日分` },
        { label: '期間',     value: `${esc(data.period.from)} 〜 ${esc(data.period.to)}` },
      ])
    ));
  }

  // ── 症状の頻度
  if (data.topSymptoms.length > 0) {
    s.push(renderSummarySection('症状の頻度（上位）',
      renderStatCard(
        data.topSymptoms.map(([sym, cnt]) => ({
          name:  esc(sym),
          badge: `${cnt} 日 / ${DAYS}日中`,
        }))
      )
    ));
  }

  // ── 痛み・不調
  if (data.painDays > 0) {
    const flareNote = data.flareDays > 0
      ? ` うち <strong>${data.flareDays}日</strong> は強い症状（レベル4以上）でした。` : '';
    s.push(renderSummarySection('痛み・不調の状況',
      renderAlertBox('alert',
        `過去${DAYS}日のうち <strong>${data.painDays}日</strong> に痛み・不調の記録があります。${flareNote}`
      )
    ));
  }

  // ── 周期
  if (data.lastPeriod) {
    const cycleLabel = data.cycleDay ? `周期 ${data.cycleDay} 日目` : '計算できません';
    s.push(renderSummarySection('周期の状況',
      renderStatCard([
        { label: '最終生理開始日', value: esc(data.lastPeriod) },
        { label: '周期長',         value: `${data.cycleLength} 日` },
        { label: '現在',           value: cycleLabel },
      ])
    ));
  }

  // ── 睡眠
  if (data.avgSleep) {
    s.push(renderSummarySection('睡眠の傾向',
      renderStatCard([{ label: '平均睡眠時間', value: `${data.avgSleep} 時間 / 日` }])
    ));
  }

  // ── 体温
  if (data.avgTemp) {
    s.push(renderSummarySection('体温の傾向',
      renderStatCard([{ label: '平均基礎体温', value: `${data.avgTemp} ℃` }])
    ));
  }

  // ── 追跡中の疾患
  if (data.myDiseases.length > 0) {
    s.push(renderSummarySection('追跡中の疾患',
      renderStatCard(data.myDiseases.map(d => ({ name: esc(d) })))
    ));
  }

  // ── 最近の変化（前30日比）
  const { delta, prev } = data.comparison;
  if (prev.count >= 3) {
    const changeRows = [];
    if (delta.painDays.val !== 0)
      changeRows.push(renderMetricRow({
        label: '痛みの日数',
        value: delta.painDays.str + (delta.painDays.val > 0 ? ' ▲' : ' ▼'),
      }));
    if (delta.flareDays.val !== 0)
      changeRows.push(renderMetricRow({
        label: 'フレア日数',
        value: delta.flareDays.str + (delta.flareDays.val > 0 ? ' ▲' : ' ▼'),
      }));
    if (Math.abs(delta.avgSleep.val) >= 0.3)
      changeRows.push(renderMetricRow({
        label: '睡眠時間',
        value: delta.avgSleep.str + (delta.avgSleep.val > 0 ? ' ▲' : ' ▼'),
      }));
    if (delta.recordFreq.val !== 0)
      changeRows.push(renderMetricRow({
        label: '記録頻度',
        value: delta.recordFreq.str,
      }));
    if (changeRows.length > 0) {
      s.push(renderSummarySection('最近の変化（前の30日比）',
        `<div class="pob-card">${changeRows.join('')}</div>`
      ));
    }
  }

  // ── 受診メモ（増えた症状・減った症状・一番困っている症状）
  const { increased, decreased, topCurrent } = data.symChanges;
  const memoLines = [];
  if (topCurrent)
    memoLines.push(`<li>一番困っている症状：<strong>${esc(topCurrent)}</strong></li>`);
  if (increased.length > 0)
    memoLines.push(`<li>最近増えた症状：${increased.map(esc).join('、')}</li>`);
  if (decreased.length > 0)
    memoLines.push(`<li>最近減った症状：${decreased.map(esc).join('、')}</li>`);
  if (memoLines.length > 0) {
    s.push(renderSummarySection('受診時に伝えたいこと',
      renderAlertBox('info',
        `<div class="pob-info-label">📋 受診メモ（自動生成）</div><ul style="margin:.4rem 0 0 1.2rem;padding:0;line-height:1.7">${memoLines.join('')}</ul>`
      )
    ));
  }

  // ── 受診のポイント
  s.push(renderSummarySection(null,
    renderAlertBox('info',
      `<div class="pob-info-label">🏥 受診のポイント</div>
      このまとめを医師にお見せいただくか、「コピー」ボタンでテキストをコピーしてメモアプリへ貼り付けてください。<br>
      症状の記録日数・強さ・周期との関連をそのままお伝えいただけます。`
    )
  ));

  return s;
}

// ─── Copy text builder ───────────────────────────────────────
function _buildCopyText(data) {
  if (!data || data.totalDays === 0) return 'データがありません。';
  const lines = ['【受診用まとめ（ippo アプリより）】', ''];
  if (data.period) {
    lines.push(`記録期間: ${data.period.from} 〜 ${data.period.to}（${data.totalDays}日分）`, '');
  }
  if (data.topSymptoms.length > 0) {
    lines.push('◆ 症状の頻度（過去30日）');
    data.topSymptoms.forEach(([sym, cnt]) => lines.push(`  ${sym}: ${cnt}日`));
    lines.push('');
  }
  if (data.painDays > 0) {
    lines.push(`◆ 痛み・不調: ${data.painDays}日 / 30日`);
    if (data.flareDays > 0) lines.push(`  強い症状（レベル4以上）: ${data.flareDays}日`);
    lines.push('');
  }
  if (data.lastPeriod) {
    lines.push('◆ 周期の状況');
    lines.push(`  最終生理開始日: ${data.lastPeriod}`);
    lines.push(`  周期長: ${data.cycleLength}日`);
    if (data.cycleDay) lines.push(`  現在: 周期${data.cycleDay}日目`);
    lines.push('');
  }
  if (data.avgSleep) lines.push(`◆ 平均睡眠: ${data.avgSleep}時間 / 日`, '');
  if (data.avgTemp)  lines.push(`◆ 平均基礎体温: ${data.avgTemp}℃`, '');
  if (data.myDiseases.length > 0) {
    lines.push(`◆ 追跡中の疾患: ${data.myDiseases.join('、')}`, '');
  }
  // 最近の変化
  const { delta, prev } = data.comparison;
  if (prev.count >= 3) {
    const changeItems = [];
    if (delta.painDays.val !== 0)  changeItems.push(`  痛みの日数 ${delta.painDays.str}`);
    if (delta.flareDays.val !== 0) changeItems.push(`  フレア日数 ${delta.flareDays.str}`);
    if (Math.abs(delta.avgSleep.val) >= 0.3) changeItems.push(`  睡眠時間 ${delta.avgSleep.str}`);
    if (changeItems.length > 0) {
      lines.push('◆ 最近の変化（前の30日比）');
      changeItems.forEach(l => lines.push(l));
      lines.push('');
    }
  }
  // 受診メモ
  const { increased, decreased, topCurrent } = data.symChanges;
  if (topCurrent || increased.length > 0 || decreased.length > 0) {
    lines.push('◆ 受診時に伝えたいこと');
    if (topCurrent)        lines.push(`  一番困っている症状: ${topCurrent}`);
    if (increased.length)  lines.push(`  最近増えた症状: ${increased.join('、')}`);
    if (decreased.length)  lines.push(`  最近減った症状: ${decreased.join('、')}`);
    lines.push('');
  }
  lines.push('※ このまとめは ippo アプリの記録データをもとに生成しています。医学的診断ではありません。');
  return lines.join('\n');
}

// ─── Render ──────────────────────────────────────────────────
function _render() {
  _api.body.innerHTML = _buildSections(_aggregate()).join('');
}

// ─── Public API ──────────────────────────────────────────────
export function openDoctorVisitSummary() {
  _ensureOverlay();
  _api.open();
  _render();
}

export function closeDoctorVisitSummary() {
  _api?.close();
}

// ─── Expose globally ─────────────────────────────────────────
window.openDoctorVisitSummary  = openDoctorVisitSummary;
window.closeDoctorVisitSummary = closeDoctorVisitSummary;
