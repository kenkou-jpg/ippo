// ============================================================
//  ippo – src/modules/pro-hub/pro-hub.js
//  PRO整理室: right-side slide-over panel
//  Phase 1–4: panel open/close + cards + recommendations + animation
// ============================================================

import './pro-hub.css';
import { getState } from '../../store/state.js';

// ─── SVG ──────────────────────────────────────────────────
const SVG_CLOSE = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>`;
const SVG_CHEVRON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l4 5-4 5"/></svg>`;
const SVG_STAR = `<svg viewBox="0 0 12 12" fill="currentColor"><polygon points="6 1 7.55 4.18 11 4.64 8.5 7.07 9.09 10.5 6 8.86 2.91 10.5 3.5 7.07 1 4.64 4.45 4.18"/></svg>`;

// ─── Feature data ──────────────────────────────────────────
const FEATURES = {
  A: [
    { key:'ai-pattern',      name:'AIパターン解析',    desc:'長期データからあなたの特徴を解析',        ico:'🔮', bg:'rgba(139,127,214,.12)' },
    { key:'bbt-pattern',     name:'体温パターン解析',   desc:'体温変化からあなたのリズムを分析',         ico:'🌡', bg:'rgba(212,132,154,.10)' },
    { key:'flare-analysis',  name:'フレアアップ分析',   desc:'症状が強まる要因とパターンを分析',         ico:'🔥', bg:'rgba(212,132,90,.10)'  },
    { key:'cycle-compare',   name:'周期比較',           desc:'周期ごとの変化を比較・可視化',             ico:'📊', bg:'rgba(74,144,200,.10)'  },
    { key:'experiments',     name:'ヘルス実験',         desc:'生活習慣の調整が体に与える影響を検証',      ico:'🧪', bg:'rgba(90,144,112,.10)'  },
    { key:'factor-report',   name:'要因効果レポート',   desc:'要因ごとの影響度をレポートで確認',         ico:'📋', bg:'rgba(200,160,64,.10)'  },
  ],
  B: [
    { key:'cloud-sync',      name:'クラウド同期',       desc:'端末変更でも安全に記録を引き継ぐ',         ico:'☁',  bg:'rgba(74,144,200,.10)'  },
    { key:'backup',          name:'バックアップ',        desc:'大切な記録を定期的に保存',                 ico:'💾', bg:'rgba(139,127,214,.12)' },
    { key:'restore',         name:'復元',               desc:'過去のバックアップから記録を復元',          ico:'🔄', bg:'rgba(90,144,112,.10)'  },
    { key:'data-health',     name:'データ診断',          desc:'記録の状態をチェックし最適化をサポート',   ico:'🔍', bg:'rgba(200,160,64,.10)'  },
    { key:'export',          name:'データ出力',          desc:'CSV / JSON形式でデータを出力',            ico:'📤', bg:'rgba(212,132,90,.10)'  },
  ],
  C: [
    { key:'body-summary',    name:'からだサマリー',      desc:'あなたの状態の概要をわかりやすくまとめる',  ico:'🌿', bg:'rgba(90,144,112,.10)'  },
    { key:'monthly-pdf',     name:'月次PDFレポート',     desc:'1ヶ月の記録PDFをまとめて出力',             ico:'📄', bg:'rgba(139,127,214,.12)' },
    { key:'doctor-summary',  name:'受診用まとめ',        desc:'受診時に医師へ見せるまとめを作成',          ico:'🏥', bg:'rgba(74,144,200,.10)'  },
    { key:'symptom-trends',  name:'症状推移グラフ',      desc:'症状の推移をグラフでわかりやすく表示',      ico:'📈', bg:'rgba(212,132,154,.10)' },
    { key:'condition-summary',name:'疾患観察まとめ',     desc:'疾患ごとの観察ポイントを整理して確認',      ico:'🔬', bg:'rgba(200,160,64,.10)'  },
  ],
};

const ALL_FEATURES = [...FEATURES.A, ...FEATURES.B, ...FEATURES.C];

const FLOW_STEPS = [
  { num:1, text:'最近の気づき',  sub:'症状・体調のパターンに気づく',    key:'ai-pattern'     },
  { num:2, text:'傾向分析',      sub:'AIパターン解析で深く理解する',    key:'ai-pattern'     },
  { num:3, text:'周期比較',      sub:'過去との変化を比較・確認する',    key:'cycle-compare'  },
  { num:4, text:'小さく試す',    sub:'ヘルス実験で改善策を試す',        key:'experiments'    },
  { num:5, text:'効果確認',      sub:'要因効果レポートで検証する',      key:'factor-report'  },
  { num:6, text:'記録を守る',    sub:'クラウド保存・バックアップ',      key:'cloud-sync'     },
  { num:7, text:'受診に活かす',  sub:'からだサマリー・受診用まとめ',    key:'body-summary'   },
];

// ─── State ────────────────────────────────────────────────
let _isOpen = false;

// ─── Recommendations ──────────────────────────────────────
function _getRecs() {
  const s = (typeof window.getState === 'function' ? window.getState() : null) || getState();
  if (!s) return [];
  const records = s.records || [];
  const now = new Date();
  const r30 = records.filter(r => (now - new Date(r.date)) / 86400000 <= 30);
  const recs = [];

  // 睡眠低下 → フレアアップ分析
  const sleepR = r30.filter(r => r.sleepHours > 0);
  if (sleepR.length >= 3) {
    const avg = sleepR.reduce((s, r) => s + r.sleepHours, 0) / sleepR.length;
    if (avg < 6.5) recs.push({ key:'flare-analysis', reason:'睡眠が短い日が続いています' });
  }

  // 周期乱れ → 周期比較
  if (s.cycleLength && (s.cycleLength < 24 || s.cycleLength > 35))
    recs.push({ key:'cycle-compare', reason:'周期に変化があります' });

  // 体温変動増加 → 体温パターン解析
  const tempR = r30.filter(r => r.basalTemp);
  if (tempR.length >= 5) {
    const avg = tempR.reduce((a, r) => a + r.basalTemp, 0) / tempR.length;
    const sd = Math.sqrt(tempR.reduce((a, r) => a + Math.pow(r.basalTemp - avg, 2), 0) / tempR.length);
    if (sd > 0.28) recs.push({ key:'bbt-pattern', reason:'体温の変動が大きい時期です' });
  }

  // 記録継続25日以上 → クラウド同期
  if (r30.length >= 22) recs.push({ key:'cloud-sync', reason:'記録が充実してきました' });

  return recs.slice(0, 3);
}

// ─── HTML builders ────────────────────────────────────────
function _card(feat, recKeys) {
  const isRec = recKeys.has(feat.key);
  return `<div class="pho-card${isRec ? ' pho-rec' : ''}" data-pro-key="${feat.key}" role="button" tabindex="0">
    <div class="pho-card-ico" style="background:${feat.bg}">${feat.ico}</div>
    <div class="pho-card-body">
      <div class="pho-card-name">${feat.name}</div>
      <div class="pho-card-desc">${feat.desc}</div>
      ${isRec ? `<div class="pho-rec-tag">${SVG_STAR} おすすめ</div>` : ''}
    </div>
    <div class="pho-card-chevron">${SVG_CHEVRON}</div>
  </div>`;
}

function _section(title, ico, bg, features, letter, recKeys) {
  return `<div class="pho-section">
    <div class="pho-section-head">
      <div class="pho-section-icon" style="background:${bg}">${ico}</div>
      <span class="pho-section-title">${letter}. ${title}</span>
    </div>
    <div class="pho-cards">${features.map(f => _card(f, recKeys)).join('')}</div>
  </div>`;
}

function _buildPanelHTML(recs) {
  const recKeys = new Set(recs.map(r => r.key));

  const recChips = recs.length ? `<div class="pho-recommend">${
    recs.map(r => {
      const f = ALL_FEATURES.find(f => f.key === r.key);
      return f ? `<div class="pho-rec-chip" data-pro-key="${f.key}">
        <div class="pho-rec-chip-dot"></div>${f.name}
        <span class="pho-rec-reason">— ${r.reason}</span>
      </div>` : '';
    }).join('')
  }</div>` : '';

  const flowHTML = FLOW_STEPS.map(step => `
    <div class="pho-flow-item" data-pro-key="${step.key}" role="button" tabindex="0">
      <div class="pho-flow-num">${step.num}</div>
      <div>
        <div class="pho-flow-text">${step.text}</div>
        <div class="pho-flow-sub">${step.sub}</div>
      </div>
    </div>`).join('');

  return `
<div class="pho-backdrop" id="pho-backdrop"></div>
<div class="pho-panel" id="pho-panel" role="dialog" aria-modal="true" aria-label="PRO整理室">
  <div class="pho-header">
    <div class="pho-header-row">
      <div>
        <div class="pho-header-badge">${SVG_STAR} PRO整理室</div>
        <div class="pho-header-title">あなたの記録を、<br>もっと深く整理する</div>
        <div class="pho-header-sub">気になるテーマから、必要な機能を選んでご活用ください。</div>
      </div>
      <button class="pho-header-close" id="pho-close" aria-label="閉じる">${SVG_CLOSE}</button>
    </div>
  </div>
  ${recChips}
  <div class="pho-body" id="pho-body">
    ${_section('深く理解する', '🔬', 'rgba(139,127,214,.10)', FEATURES.A, 'A', recKeys)}
    ${_section('記録を守る・整理する', '🛡', 'rgba(74,144,200,.10)', FEATURES.B, 'B', recKeys)}
    ${_section('医療相談に活かす', '🌿', 'rgba(90,144,112,.10)', FEATURES.C, 'C', recKeys)}
    <div class="pho-flow">
      <div class="pho-flow-label">おすすめの活用フロー</div>
      <div class="pho-flow-steps">${flowHTML}</div>
    </div>
  </div>
</div>`;
}

// ─── Init ─────────────────────────────────────────────────
function _init() {
  if (document.getElementById('pho-backdrop')) return;

  const recs = _getRecs();
  const wrap = document.createElement('div');
  wrap.innerHTML = _buildPanelHTML(recs);
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  const backdrop = document.getElementById('pho-backdrop');
  const panel    = document.getElementById('pho-panel');
  const closeBtn = document.getElementById('pho-close');

  closeBtn.addEventListener('click', closeProHub);
  backdrop.addEventListener('click', closeProHub);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _isOpen) closeProHub();
  });

  // Unified click delegation for all [data-pro-key] elements inside the panel
  panel.addEventListener('click', e => {
    const target = e.target.closest('[data-pro-key]');
    if (target) _navigateToPro(target.dataset.proKey);
  });
  // Also handle recommendation chips (they're outside the panel element)
  backdrop.parentElement?.querySelectorAll('.pho-recommend .pho-rec-chip').forEach(chip => {
    chip.addEventListener('click', () => _navigateToPro(chip.dataset.proKey));
  });
}

// ─── Open / Close ──────────────────────────────────────────
export function openProHub() {
  _init();
  _isOpen = true;
  const backdrop = document.getElementById('pho-backdrop');
  const panel    = document.getElementById('pho-panel');
  backdrop.classList.add('pho-open');
  panel.classList.add('pho-open');
  document.body.style.overflow = 'hidden';
  document.getElementById('pho-body')?.scrollTo(0, 0);
  // Re-attach chip listeners each open (chips are inside pho-panel now via recommend div)
}

export function closeProHub() {
  _isOpen = false;
  document.getElementById('pho-backdrop')?.classList.remove('pho-open');
  document.getElementById('pho-panel')?.classList.remove('pho-open');
  setTimeout(() => { if (!_isOpen) document.body.style.overflow = ''; }, 260);
}

// ─── Map: feature key → dedicated window function ─────────
//
// 設計ルール: 1 feature = 1 screen owner
// このマップに登録できるのは「専用実装が完成している機能」のみ。
//
// 未完成機能はここに登録しない。
// → _navigateToPro() が pro-feature fallback 画面へ安全に遷移する。
//
// 絶対禁止:
//   - 別機能の overlay/screen を流用する
//   - 既存 screen への仮接続（temporary redirect）
//   - title だけ差し替えた擬似 screen
//
// 新規 PRO 機能を追加する際は下記チェックリストをクリアしてから登録すること:
//   1. 専用 screen / overlay が存在するか
//   2. 専用 render / mount が存在するか
//   3. close 処理が存在するか
//   4. 他 feature の screen・overlay・state を流用していないか
//   5. 未達なら pro-feature fallback（このマップから除外）
//
const LEGACY_HANDLERS = {
  'ai-pattern':       () => typeof window.openAIAnalysis       === 'function' && window.openAIAnalysis(),
  'bbt-pattern':      () => typeof window.openTempReport       === 'function' && window.openTempReport(),
  'flare-analysis':   () => typeof window.openFlareupReport     === 'function' && window.openFlareupReport(),
  'cycle-compare':    () => typeof window.openCyclePhaseReport  === 'function' && window.openCyclePhaseReport(),
  'experiments':      () => typeof window.openExperiments       === 'function' && window.openExperiments(),
  'factor-report':    () => typeof window.openCorrelationReport === 'function' && window.openCorrelationReport(),
  'cloud-sync':       () => typeof window.openSyncModal         === 'function' && window.openSyncModal(),
  'backup':           () => typeof window.cloudBackupAll        === 'function' ? window.cloudBackupAll()
                          : typeof window.exportJSON            === 'function' && window.exportJSON(),
  'data-health':      () => typeof window.showDiagnosisUI       === 'function' && window.showDiagnosisUI(),
  'restore':          () => typeof window.openRestoreUI         === 'function' && window.openRestoreUI(),
  'export':           () => typeof window.showExportMenu        === 'function' ? window.showExportMenu()
                          : typeof window.exportCSV             === 'function' && window.exportCSV(),
  'body-summary':     () => typeof window.openDoctorSummary       === 'function' && window.openDoctorSummary(),
  'monthly-pdf':      () => typeof window.openMonthlyReport       === 'function' && window.openMonthlyReport(),
  // ── 専用実装完了済み: 以下はそれぞれ独立モジュールを持つ ───────────
  // src/modules/pro/doctor-summary/doctor-summary.js
  'doctor-summary':   () => typeof window.openDoctorVisitSummary  === 'function' && window.openDoctorVisitSummary(),
  // src/modules/pro/condition-summary/condition-summary.js
  'condition-summary':() => typeof window.openConditionSummary    === 'function' && window.openConditionSummary(),
  // insights へ遷移し「症状・体調の推移」セクションへスクロール
  // 旧 switchInsTab('trends') は ins-tab-btn-* 廃止により no-op のため使わない
  'symptom-trends':   () => {
    if (typeof window.switchTab !== 'function') return;
    const p = window.switchTab('insights', null);
    const _afterSwitch = () => {
      // PRO サマリーを .ipr-graph-card の直後に注入
      if (typeof window.renderProSymptomTrends === 'function') window.renderProSymptomTrends();
      // .ipr-graph-card = insights画面の「症状・体調の推移」セクション
      const graph = document.querySelector('.ipr-graph-card');
      if (graph) graph.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (p && typeof p.then === 'function') p.then(_afterSwitch);
    else _afterSwitch();
  },
};

// ─── Navigate to PRO feature screen ───────────────────────
async function _navigateToPro(key) {
  if (!key) return;
  const feat = ALL_FEATURES.find(f => f.key === key);
  window._proCurrentFeature = feat || { key, name: key, desc: '', ico: '★', bg: '#ede8ff' };

  // If there's an existing legacy handler, call it after closing panel
  const handler = LEGACY_HANDLERS[key];
  if (handler) {
    closeProHub();
    await new Promise(r => setTimeout(r, 260));
    handler();
    return;
  }

  // Otherwise navigate to the generic pro-feature screen
  closeProHub();
  await new Promise(r => setTimeout(r, 260));
  if (typeof window.showScreen === 'function') {
    await window.showScreen('pro-feature');
  }
  if (typeof window.hydrateProFeature === 'function') {
    window.hydrateProFeature(window._proCurrentFeature);
  } else {
    setTimeout(() => {
      if (typeof window.hydrateProFeature === 'function')
        window.hydrateProFeature(window._proCurrentFeature);
    }, 120);
  }
}

// ─── Expose globally ──────────────────────────────────────
window.openProHub  = openProHub;
window.closeProHub = closeProHub;
