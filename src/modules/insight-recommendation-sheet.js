// ============================================================
//  ippo – src/modules/insight-recommendation-sheet.js
//  Quick Recommendation Sheet & Thinking Sheet
//  "伴走型ナビゲーション" — user decides, never auto-redirected
// ============================================================

import './insight-recommendation-sheet.css';
import { resolveInsightDestination, resolveThinkingDestination } from './insight-resolver.js';

// ─── Thinking topics ──────────────────────────────────────
const THINKING_TOPICS = [
  { key: 'cycle',   label: '周期の乱れ' },
  { key: 'sleep',   label: '睡眠' },
  { key: 'stress',  label: 'ストレス' },
  { key: 'diet',    label: '食事' },
  { key: 'cold',    label: '冷え' },
  { key: 'symptom', label: '症状悪化' },
  { key: 'mood',    label: '気分の波' },
];

// ─── Feature navigation (mirrors pro-hub LEGACY_HANDLERS) ─
// Kept local to avoid circular imports with pro-hub.js.
//
// 設計ルール: 1 feature = 1 screen owner
// 未接続機能はここに登録しない。ハンドラが存在しない場合は
// openProHub() へフォールスルーし、ユーザーが自分で選択できるようにする。
//
// 絶対禁止:
//   - 別機能の overlay/screen を流用する
//   - 既存 screen への仮接続（temporary redirect）
//
// 未接続の機能（openProHub フォールスルー行き）:
//   'symptom-trends'   — 専用実装なし。insights/trends pane への仮接続も禁止
//   'condition-summary'— 専用実装なし。openDiseaseSettings() は設定モーダルのため流用禁止
//
function _navigate(key) {
  const HANDLERS = {
    'ai-pattern':        () => typeof window.openAIAnalysis        === 'function' && window.openAIAnalysis(),
    'bbt-pattern':       () => typeof window.openTempReport        === 'function' && window.openTempReport(),
    'flare-analysis':    () => typeof window.openFlareupReport     === 'function' && window.openFlareupReport(),
    'cycle-compare':     () => typeof window.openCyclePhaseReport  === 'function' && window.openCyclePhaseReport(),
    'experiments':       () => typeof window.openExperiments       === 'function' && window.openExperiments(),
    'factor-report':     () => typeof window.openCorrelationReport === 'function' && window.openCorrelationReport(),
    'body-summary':      () => typeof window.openDoctorSummary      === 'function' && window.openDoctorSummary(),
    'monthly-pdf':       () => typeof window.openMonthlyReport      === 'function' && window.openMonthlyReport(),
    // ── 専用実装完了済み ─────────────────────────────────────────────
    'doctor-summary':    () => typeof window.openDoctorVisitSummary === 'function' && window.openDoctorVisitSummary(),
    'condition-summary': () => typeof window.openConditionSummary   === 'function' && window.openConditionSummary(),
    'symptom-trends':    () => typeof window.openSymptomTrends === 'function' && window.openSymptomTrends(),
  };
  _log('recommendation_selected', { key });
  _hideAll();
  setTimeout(() => {
    const h = HANDLERS[key];
    if (h) h();
  }, 180);
}

// ─── Analytics ────────────────────────────────────────────
function _log(name, data) {
  try {
    if (typeof window.ippoTrack === 'function') window.ippoTrack(name, data);
  } catch (_) {}
}

// ─── DOM singleton ────────────────────────────────────────
let _backdrop = null;
let _sheet    = null;
let _thinkSheet = null;

function _ensureDOM() {
  if (_backdrop) return;

  _backdrop = document.createElement('div');
  _backdrop.className = 'irs-backdrop';
  _backdrop.addEventListener('click', () => { _log('no_action_close', {}); _hideAll(); });
  document.body.appendChild(_backdrop);

  _sheet = document.createElement('div');
  _sheet.className = 'irs-sheet';
  _sheet.setAttribute('role', 'dialog');
  _sheet.setAttribute('aria-modal', 'true');
  _sheet.setAttribute('aria-label', 'おすすめの見方');
  document.body.appendChild(_sheet);

  _thinkSheet = document.createElement('div');
  _thinkSheet.className = 'irs-sheet irs-think-sheet';
  _thinkSheet.setAttribute('role', 'dialog');
  _thinkSheet.setAttribute('aria-modal', 'true');
  _thinkSheet.setAttribute('aria-label', '気になっていること');
  document.body.appendChild(_thinkSheet);

  document.addEventListener('keydown', e => { if (e.key === 'Escape') _hideAll(); });
}

// ─── Show recommendation sheet ────────────────────────────
export function showRecommendationSheet(rec) {
  _ensureDOM();
  _log('recommendation_shown', { key: rec?.primary?.key || null });

  if (!rec) {
    _sheet.innerHTML = `
      <div class="irs-handle"></div>
      <div class="irs-header">まだ大きな傾向は見えていません</div>
      <p class="irs-fallback-body">もう少し記録を続けると、あなたの傾向が見えてきます。<br>気になる動きが出てきたら、また確認してみましょう。</p>
      <button class="irs-close-btn">閉じる</button>
    `;
    _sheet.querySelector('.irs-close-btn')?.addEventListener('click', () => {
      _log('no_action_close', {});
      _hideAll();
    });
    _open(_sheet);
    return;
  }

  const altsHTML = rec.alternatives.length ? `
    <div class="irs-alts-label">他の見方</div>
    <div class="irs-alts">
      ${rec.alternatives.map(a => `
        <button class="irs-alt-btn" data-key="${a.key}">${a.title}</button>
      `).join('')}
    </div>
  ` : '';

  _sheet.innerHTML = `
    <div class="irs-handle"></div>
    <div class="irs-header">最近の記録から、<br>こうした見方もできます</div>
    <div class="irs-primary">
      <div class="irs-primary-title">${rec.primary.title}</div>
      ${rec.primary.reason
        ? `<p class="irs-primary-reason">${rec.primary.reason.replace(/\n/g, '<br>')}</p>`
        : ''}
      <button class="irs-primary-cta" data-key="${rec.primary.key}">
        確認する
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    ${altsHTML}
  `;

  _sheet.querySelector('.irs-primary-cta')?.addEventListener('click', e => {
    _navigate(e.currentTarget.dataset.key);
  });

  _sheet.querySelectorAll('.irs-alt-btn').forEach(btn => {
    btn.addEventListener('mouseenter',  () => _preload(btn.dataset.key));
    btn.addEventListener('touchstart',  () => _preload(btn.dataset.key), { passive: true });
    btn.addEventListener('click', e => {
      _log('alternative_selected', { key: e.currentTarget.dataset.key });
      _navigate(e.currentTarget.dataset.key);
    });
  });

  _open(_sheet);
}

// ─── Show thinking sheet ──────────────────────────────────
export function showThinkingSheet() {
  _ensureDOM();
  _log('insight_surface_click', { type: 'thinking' });

  _thinkSheet.innerHTML = `
    <div class="irs-handle"></div>
    <div class="irs-header">最近、<br>気になっていることはありますか？</div>
    <div class="irs-topics">
      ${THINKING_TOPICS.map(t => `
        <button class="irs-topic-btn" data-topic="${t.key}">${t.label}</button>
      `).join('')}
    </div>
  `;

  _thinkSheet.querySelectorAll('.irs-topic-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const topic = e.currentTarget.dataset.topic;
      _log('insight_surface_click', { type: 'thinking_topic', topic });
      const rec = resolveThinkingDestination(topic);
      _hideAll();
      setTimeout(() => showRecommendationSheet(rec), 80);
    });
  });

  _open(_thinkSheet);
}

// ─── Surface trigger ──────────────────────────────────────
// Called from _wireInsightsScreen() for status strip cells and cards.
export function triggerInsightSurface(type) {
  _log('insight_surface_click', { type });
  const rec = resolveInsightDestination(type);
  showRecommendationSheet(rec);
}

// ─── Helpers ──────────────────────────────────────────────
function _open(el) {
  _log('recommendation_shown', {});
  _backdrop.classList.add('irs-open');
  el.classList.add('irs-open');
  document.body.style.overflow = 'hidden';
}

function _hideAll() {
  _log('sheet_closed', {});
  _backdrop?.classList.remove('irs-open');
  _sheet?.classList.remove('irs-open');
  _thinkSheet?.classList.remove('irs-open');
  setTimeout(() => {
    if (!_sheet?.classList.contains('irs-open') && !_thinkSheet?.classList.contains('irs-open')) {
      document.body.style.overflow = '';
    }
  }, 250);
}

// Hint to preload screen on hover/touch — lightweight, non-blocking.
function _preload(key) {
  try {
    if (typeof window.ensureScreenLoaded === 'function') window.ensureScreenLoaded('pro-feature');
  } catch (_) {}
}

// ─── Direct navigation (no sheet) ────────────────────────
// アイデア①+③: Recommendation Sheet を経由せず直接遷移する。
// resolver の primary.key を使い、ユーザーに選択させない。
export function navigateInsightDirect(type) {
  const rec = resolveInsightDestination(type);
  if (rec?.primary?.key) {
    _log('direct_navigate', { key: rec.primary.key, type });
    _navigate(rec.primary.key);
  }
}

// キーを直接指定して遷移（固定導線用）
export function navigateToPro(key) {
  _log('direct_navigate', { key, type: 'fixed' });
  _navigate(key);
}

// ─── Public window API ────────────────────────────────────
window.showInsightRecommendationSheet = showRecommendationSheet;
window.showInsightThinkingSheet       = showThinkingSheet;
window.triggerInsightSurface          = triggerInsightSurface;
window.navigateInsightDirect          = navigateInsightDirect;
window.navigateToPro                  = navigateToPro;
