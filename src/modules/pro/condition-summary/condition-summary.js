// ================================================================
//  ippo – src/modules/pro/condition-summary/condition-summary.js
//  疾患観察まとめ — 専用 PRO overlay
//
//  設計ルール: 1 feature = 1 screen owner
//  ・このモジュールは condition-summary のみが使用する。
//  ・openDiseaseSettings()（設定モーダル）とは完全分離。
//  ・責務: 「疾患の理解」のための観察データ整理。
//    疾患の「選択・設定」は settings/disease-module が行う。
//
//  Exposed globals:
//    window.openConditionSummary()
//    window.closeConditionSummary()
// ================================================================

import './condition-summary.css';
import { DISEASE_CONFIG }  from '../../../constants/disease.js';
import { createProOverlay } from '../shared/pro-overlay-base.js';
import {
  getProState, esc,
  getLastNDays,
  calcFlareDays, calcPainDays, calcSleepPainCorr,
  calcDiseaseSymptomFreq,
} from '../shared/pro-metric-utils.js';
import {
  renderSummarySection,
  renderStatCard,
  renderAlertBox,
  renderEmptyState,
} from '../shared/render/index.js';

// ─── Constants ───────────────────────────────────────────────
const DAYS = 90;   // 疾患観察は90日スパンで見る

// ─── Module state ────────────────────────────────────────────
let _api = null;   // { overlay, body, open, close, ... }

// ─── Lazy init ───────────────────────────────────────────────
function _ensureOverlay() {
  if (_api) return;
  _api = createProOverlay({
    id:        'cos-overlay',
    ariaLabel: '疾患観察まとめ',
    title:     '疾患観察まとめ',
    subtitle:  '疾患ごとの症状・傾向を理解のために整理します（過去90日）',
    footer: [
      { id: 'cos-btn-close', label: '閉じる', cls: 'pob-btn pob-btn-full' },
    ],
    onClose: closeConditionSummary,
  });

  _api.getButton('cos-btn-close').addEventListener('click', closeConditionSummary);
}

// ─── Per-disease aggregation ─────────────────────────────────
function _aggregateDisease(disease, records90) {
  const cfg              = DISEASE_CONFIG[disease] ?? {};
  const specificSymptoms = cfg.specificSymptoms ?? [];

  // 全症状マップ
  const symMap = {};
  records90.forEach(r => {
    (r.symptoms || []).forEach(sym => {
      symMap[sym] = (symMap[sym] || 0) + 1;
    });
  });

  // 疾患固有症状のみ抽出（出現ゼロも含む）
  const relatedSymptoms = specificSymptoms.map(sym => ({
    sym,
    cnt: symMap[sym] ?? 0,
  }));

  // 全症状から頻度順に関連ありそうなものも追加（将来表示用）
  const extraSymptoms = Object.entries(symMap)
    .filter(([sym]) => !specificSymptoms.includes(sym))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sym, cnt]) => ({ sym, cnt, extra: true }));

  // 前半45日 vs 後半45日の症状比較
  const half = Math.floor(DAYS / 2);
  const now  = new Date();
  const cutMid  = new Date(now - half * 86400000);
  const cutFull = new Date(now - DAYS * 86400000);
  const recentHalf = records90.filter(r => new Date(r.date || r.record_date || '') >= cutMid);
  const prevHalf   = records90.filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutFull && d < cutMid;
  });
  const freqRecent = calcDiseaseSymptomFreq(recentHalf, specificSymptoms);
  const freqPrev   = calcDiseaseSymptomFreq(prevHalf,   specificSymptoms);
  const freqMap    = Object.fromEntries(freqPrev.map(({ sym, cnt }) => [sym, cnt]));
  const worsened   = freqRecent.filter(({ sym, cnt }) => cnt > (freqMap[sym] ?? 0) && cnt > 0)
    .sort((a, b) => b.cnt - a.cnt).slice(0, 3);
  const stable     = freqRecent.filter(({ sym, cnt }) => cnt <= (freqMap[sym] ?? 0) && cnt > 0)
    .sort((a, b) => b.cnt - a.cnt).slice(0, 3);

  // ルールベース観察メモ
  const obs = [];
  if (calcFlareDays(recentHalf, 4) > calcFlareDays(prevHalf, 4)) {
    obs.push('最近の期間でフレアが増加しています');
  }
  const recentSleepShort = recentHalf.filter(r => r.sleepHours > 0 && r.sleepHours < 6).length;
  if (recentSleepShort >= 3) {
    obs.push('睡眠6時間未満の日が増えています（症状悪化と関連しやすい傾向）');
  }
  if (worsened.length > 0) {
    obs.push(`${worsened[0].sym}が最近 ${worsened[0].cnt} 日と増加傾向です`);
  }

  return {
    cfg,
    disease,
    recordCount:     records90.length,
    relatedSymptoms,
    extraSymptoms,
    flareDays:       calcFlareDays(records90, 4),
    painDays:        calcPainDays(records90, 2),
    sleepCorr:       calcSleepPainCorr(records90),
    worsened,
    stable,
    observations:    obs,
  };
}

// ─── Disease card HTML ────────────────────────────────────────
function _buildDiseaseCard(disease, records90) {
  const d   = _aggregateDisease(disease, records90);
  const cfg = d.cfg;

  // 関連症状リスト（cos-sym-row は disease card 固有レイアウト）
  const hasSymData = d.relatedSymptoms.some(s => s.cnt > 0);
  let symHtml = '';
  if (d.recordCount < 7) {
    symHtml = `<div class="pob-no-data">記録が少ないため、傾向を計算できません。<br>7日以上の記録で表示されます。</div>`;
  } else if (!hasSymData) {
    symHtml = `<div class="pob-no-data">過去${DAYS}日間に関連症状の記録がありませんでした。</div>`;
  } else {
    symHtml = d.relatedSymptoms
      .filter(s => s.cnt > 0)
      .map(s => `
      <div class="cos-sym-row">
        <span>${esc(s.sym)}</span>
        <span class="cos-sym-count">${s.cnt}日 / ${DAYS}日中</span>
      </div>`).join('');
  }

  // フレア・痛み状況
  const flareHtml = d.flareDays > 0
    ? renderAlertBox('alert',
        `過去${DAYS}日のうち <strong>${d.flareDays}日</strong> に症状の強い日がありました。` +
        (d.painDays > d.flareDays ? `（痛みのある日は計 ${d.painDays}日）` : ''),
        'cos-card-status'
      )
    : renderAlertBox('good',
        `過去${DAYS}日間に強い症状はありませんでした。`,
        'cos-card-status'
      );

  // 睡眠相関
  const sleepHtml = d.sleepCorr !== null
    ? `<div class="pob-tip">😴 睡眠6時間未満の翌日に不調が出やすい傾向：約${d.sleepCorr}%</div>`
    : '';

  // トラッキングTip
  const tipHtml = cfg.trackingTips
    ? `<div class="pob-tip">💡 ${esc(cfg.trackingTips)}</div>`
    : '';

  // 最近悪化した項目
  let worsenedHtml = '';
  if (d.worsened.length > 0 && d.recordCount >= 14) {
    const rows = d.worsened.map(({ sym }) =>
      `<div class="cos-sym-row cos-sym-worsened"><span>▲ ${esc(sym)}</span><span class="cos-sym-count">増加傾向</span></div>`
    ).join('');
    worsenedHtml = renderSummarySection('最近悪化した項目', `<div class="cos-sym-list">${rows}</div>`);
  }

  // 安定している項目
  let stableHtml = '';
  if (d.stable.length > 0 && d.recordCount >= 14) {
    const rows = d.stable.map(({ sym }) =>
      `<div class="cos-sym-row cos-sym-stable"><span>✓ ${esc(sym)}</span><span class="cos-sym-count">安定</span></div>`
    ).join('');
    stableHtml = renderSummarySection('安定している項目', `<div class="cos-sym-list">${rows}</div>`);
  }

  // 疾患観察メモ
  let obsHtml = '';
  if (d.observations.length > 0) {
    const items = d.observations.map(o => `<li>${esc(o)}</li>`).join('');
    obsHtml = renderAlertBox('info',
      `<div class="pob-info-label">🔍 観察ポイント</div><ul style="margin:.4rem 0 0 1.2rem;padding:0;line-height:1.7">${items}</ul>`,
      'cos-card-status'
    );
  }

  return `
    <div class="cos-disease-card">
      <div class="cos-disease-header">
        <span class="cos-disease-icon">${esc(cfg.icon ?? '🔬')}</span>
        <span class="cos-disease-name">${esc(disease)}</span>
      </div>
      <div class="cos-label">関連症状の出現（過去${DAYS}日）</div>
      <div class="cos-sym-list">${symHtml}</div>
      ${flareHtml}
      ${worsenedHtml}
      ${stableHtml}
      ${obsHtml}
      ${sleepHtml}
      ${tipHtml}
    </div>`;
}

// ─── Content builder ─────────────────────────────────────────
function _buildContent() {
  const s        = getProState();
  const diseases = s?.myDiseases ?? (s?.myDisease ? [s.myDisease] : []);
  const allRec   = s?.records ?? [];
  const records90 = getLastNDays(allRec, DAYS);

  if (diseases.length === 0) {
    return renderEmptyState({
      icon:          '🔬',
      title:         '疾患が選択されていません',
      desc:          '設定画面の「追跡する疾患」で疾患を選ぶと、<br>ここに疾患ごとの観察まとめが表示されます。',
      actionLabel:   '疾患を選択する →',
      actionOnclick: "if(typeof window.openDiseaseSettings==='function')window.openDiseaseSettings()",
    });
  }

  return diseases.map(disease => _buildDiseaseCard(disease, records90)).join('');
}

// ─── Render ──────────────────────────────────────────────────
function _render() {
  _api.body.innerHTML = _buildContent();
}

// ─── Public API ──────────────────────────────────────────────
export function openConditionSummary() {
  _ensureOverlay();
  _api.open();
  _render();
}

export function closeConditionSummary() {
  _api?.close();
}

// ─── Expose globally ─────────────────────────────────────────
window.openConditionSummary  = openConditionSummary;
window.closeConditionSummary = closeConditionSummary;
