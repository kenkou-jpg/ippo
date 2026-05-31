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
// Journey sections: ① 理解する → ② 試してみる → ③ 振り返る → ④ 医師と共有する → ⑤ 記録を守る
const FEATURES = {
  // ① 理解する: なぜこうなっているのか知りたい
  UNDERSTAND: [
    { key:'ai-pattern',      name:'AIパターン解析',    desc:'症状・睡眠・体温の関係など、記録だけでは見えにくい長期の傾向を見つけます',      ico:'🔮', bg:'rgba(139,127,214,.12)' },
    { key:'flare-analysis',  name:'フレアアップ分析',   desc:'症状が強かった日に共通するきっかけや前兆を探します',                           ico:'🔥', bg:'rgba(212,132,90,.10)'  },
    { key:'factor-report',   name:'要因効果レポート',   desc:'睡眠・ストレスなど、どの要因が症状に影響していそうか整理します',                ico:'📋', bg:'rgba(200,160,64,.10)'  },
    { key:'cycle-compare',   name:'周期比較',           desc:'調子の良かった周期と今を並べて、変化のヒントを探します',                        ico:'📊', bg:'rgba(74,144,200,.10)'  },
    { key:'bbt-pattern',     name:'体温パターン解析',   desc:'体温の変化から、あなた固有のリズムや排卵のタイミングを見つけます',              ico:'🌡', bg:'rgba(212,132,154,.10)' },
  ],
  // ② 試してみる: 専用セクション（experiments 単独）
  TRY: [
    { key:'experiments',     name:'ヘルス実験',         desc:'試してみたことが本当に自分に合っていたか、記録をもとに振り返れます',             ico:'🧪', bg:'rgba(90,144,112,.10)'  },
  ],
  // ③ 振り返る: 今の自分の状態を整理したい
  REFLECT: [
    { key:'body-summary',    name:'からだサマリー',      desc:'今の状態をひと目で振り返れる形に整理します（自分向け）',                       ico:'🌿', bg:'rgba(90,144,112,.10)'  },
    { key:'symptom-trends',  name:'症状推移グラフ',      desc:'複数の症状がどう推移しているか、周期と重ねてグラフで確認できます',              ico:'📈', bg:'rgba(212,132,154,.10)' },
    { key:'condition-summary',name:'疾患観察まとめ',     desc:'疾患ごとの症状の変化を、長い視点でまとめて振り返れます（疾患向け）',           ico:'🔬', bg:'rgba(200,160,64,.10)'  },
  ],
  // ④ 医師と共有する: 診察に持っていく形にしたい
  SHARE: [
    { key:'doctor-summary',  name:'受診用まとめ',        desc:'診察で伝えたい症状や変化を、医師に見せる形でまとめます（医師向け）',            ico:'🏥', bg:'rgba(74,144,200,.10)'  },
    { key:'monthly-pdf',     name:'月次PDFレポート',     desc:'1ヶ月の記録を印刷・共有できるPDFにまとめます',                                ico:'📄', bg:'rgba(139,127,214,.12)' },
  ],
  // ⑤ 記録を守る: 積み重ねた記録を失いたくない
  PROTECT: [
    { key:'cloud-sync',      name:'クラウド同期',        desc:'積み重ねた記録を、端末が変わっても安全に引き継げます',                         ico:'☁',  bg:'rgba(74,144,200,.10)'  },
    { key:'backup',          name:'バックアップ',        desc:'大切な記録をいつでもスナップショット保存しておけます',                          ico:'💾', bg:'rgba(139,127,214,.12)' },
    { key:'restore',         name:'復元',               desc:'誤って消してしまった記録も、過去のバックアップから取り戻せます',                ico:'🔄', bg:'rgba(90,144,112,.10)'  },
    { key:'data-health',     name:'データ診断',          desc:'記録の抜けや矛盾を自動でチェックして、分析の精度を保ちます',                   ico:'🔍', bg:'rgba(200,160,64,.10)'  },
    { key:'export',          name:'データ出力',          desc:'自分の記録をCSVやJSONで取り出して、外部でも活用できます',                      ico:'📤', bg:'rgba(212,132,90,.10)'  },
  ],
};

const ALL_FEATURES = [
  ...FEATURES.UNDERSTAND,
  ...FEATURES.TRY,
  ...FEATURES.REFLECT,
  ...FEATURES.SHARE,
  ...FEATURES.PROTECT,
];

// FLOW_STEPSはジャーニー順 (理解→試す→振り返る→共有→守る) と一致させる
const FLOW_STEPS = [
  { num:1, text:'理解する',      sub:'パターン・要因を深く知る',        key:'ai-pattern'     },
  { num:2, text:'試してみる',    sub:'ヘルス実験で改善策を試す',        key:'experiments'    },
  { num:3, text:'振り返る',      sub:'からだの状態を整理・確認する',    key:'body-summary'   },
  { num:4, text:'共有する',      sub:'受診用まとめ・PDFレポート',       key:'doctor-summary'  },
  { num:5, text:'記録を守る',    sub:'クラウド保存・バックアップ',      key:'cloud-sync'     },
];

// ─── State ────────────────────────────────────────────────
let _isOpen = false;
let _previousScreen = null; // ページモード: どこから来たかを記憶

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

function _section(num, title, userPsych, ico, bg, features, recKeys) {
  return `<div class="pho-section">
    <div class="pho-section-head">
      <div class="pho-section-icon" style="background:${bg}">${ico}</div>
      <div class="pho-section-head-text">
        <span class="pho-section-num">${num}</span>
        <span class="pho-section-title">${title}</span>
        <span class="pho-section-psych">${userPsych}</span>
      </div>
    </div>
    <div class="pho-cards">${features.map(f => _card(f, recKeys)).join('')}</div>
  </div>`;
}

function _sectionExperiments(feat, recKeys) {
  const isRec = recKeys.has(feat.key);
  return `<div class="pho-section pho-section-try">
    <div class="pho-section-head">
      <div class="pho-section-icon" style="background:rgba(90,144,112,.10)">🧪</div>
      <div class="pho-section-head-text">
        <span class="pho-section-num">②</span>
        <span class="pho-section-title">試してみる</span>
        <span class="pho-section-psych">変えたことが本当に合っているか確かめたい</span>
      </div>
    </div>
    <div class="pho-try-bridge">理解したことを、小さく試してみましょう</div>
    <div class="pho-cards">${_card(feat, recKeys)}</div>
  </div>`;
}

function _buildPanelHTML(recs) {
  const recKeys = new Set(recs.map(r => r.key));

  const recChips = recs.length
    ? `<div class="pho-recommend">${
        recs.map(r => {
          const f = ALL_FEATURES.find(f => f.key === r.key);
          return f ? `<div class="pho-rec-chip" data-pro-key="${f.key}">
            <div class="pho-rec-chip-dot"></div>${f.name}
            <span class="pho-rec-reason">— ${r.reason}</span>
          </div>` : '';
        }).join('')
      }</div>`
    : `<div class="pho-recommend-empty">
        <div class="pho-recommend-empty-text">
          睡眠・気分・症状を記録すると<br>あなたへのおすすめが表示されます
        </div>
      </div>`;

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
        <div class="pho-header-title">記録から、理解へ。</div>
        <div class="pho-header-sub">理解し、試し、振り返るための場所です。</div>
      </div>
      <button class="pho-header-close" id="pho-close" aria-label="閉じる">${SVG_CLOSE}</button>
    </div>
  </div>
  ${recChips}
  <div class="pho-body" id="pho-body">
    <div class="pho-flow">
      <div class="pho-flow-label">体験の流れ</div>
      <div class="pho-flow-steps">${flowHTML}</div>
    </div>
    ${_section('①', '理解する', 'なぜこうなっているのか知りたい', '🔮', 'rgba(139,127,214,.10)', FEATURES.UNDERSTAND, recKeys)}
    ${_sectionExperiments(FEATURES.TRY[0], recKeys)}
    ${_section('③', '振り返る', '今の自分の状態を整理したい', '🌿', 'rgba(90,144,112,.10)', FEATURES.REFLECT, recKeys)}
    ${_section('④', '医師と共有する', '診察に持っていく形にしたい', '🏥', 'rgba(74,144,200,.10)', FEATURES.SHARE, recKeys)}
    ${_section('⑤', '記録を守る', '積み重ねた記録を失いたくない', '🛡', 'rgba(200,160,64,.10)', FEATURES.PROTECT, recKeys)}
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

// ─── Overlay open (ロールバック用・通常導線では使わない) ──
function _openOverlay() {
  _init();
  _isOpen = true;
  const backdrop = document.getElementById('pho-backdrop');
  const panel    = document.getElementById('pho-panel');
  backdrop.classList.add('pho-open');
  panel.classList.add('pho-open');
  document.body.style.overflow = 'hidden';
  document.getElementById('pho-body')?.scrollTo(0, 0);
}

// ─── Open: 標準導線 → 独立ページ ──────────────────────────
export function openProHub() {
  // 前画面を記憶（戻るボタン用）
  _previousScreen = typeof window.getCurrentScreen === 'function'
    ? window.getCurrentScreen()
    : null;

  if (typeof window.showScreen === 'function') {
    window.showScreen('pro-hub').then(() => { renderProHubPage(); });
    return;
  }
  // showScreen が未ロードの場合のフォールバック（通常は発生しない）
  _openOverlay();
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

  // Overlayが開いている場合のみ閉じる（ページモードではスキップ）
  if (_isOpen) {
    closeProHub();
    await new Promise(r => setTimeout(r, 260));
  }

  const handler = LEGACY_HANDLERS[key];
  if (handler) {
    handler();
    return;
  }

  // Generic pro-feature screen へ遷移
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

// ─── Page mode: content builder ───────────────────────────
// Overlay用の _buildPanelHTML とは独立して、ページ用コンテンツのみを生成する。
// Hero・backdrop・panel wrapper は pro-hub.html 側が持つため含めない。
function _buildPageContent(recs) {
  const recKeys = new Set(recs.map(r => r.key));

  const recChips = recs.length
    ? `<div class="pho-recommend">${
        recs.map(r => {
          const f = ALL_FEATURES.find(f => f.key === r.key);
          return f ? `<div class="pho-rec-chip" data-pro-key="${f.key}">
            <div class="pho-rec-chip-dot"></div>${f.name}
            <span class="pho-rec-reason">— ${r.reason}</span>
          </div>` : '';
        }).join('')
      }</div>`
    : `<div class="pho-recommend-empty">
        <div class="pho-recommend-empty-text">
          睡眠・気分・症状を記録すると<br>あなたへのおすすめが表示されます
        </div>
      </div>`;

  const flowHTML = FLOW_STEPS.map(step => `
    <div class="pho-flow-item" data-pro-key="${step.key}" role="button" tabindex="0">
      <div class="pho-flow-num">${step.num}</div>
      <div>
        <div class="pho-flow-text">${step.text}</div>
        <div class="pho-flow-sub">${step.sub}</div>
      </div>
    </div>`).join('');

  return `
    <div class="pho-flow">
      <div class="pho-flow-label">体験の流れ</div>
      <div class="pho-flow-steps">${flowHTML}</div>
    </div>
    ${recChips}
    ${_section('①', '理解する', 'なぜこうなっているのか知りたい', '🔮', 'rgba(139,127,214,.10)', FEATURES.UNDERSTAND, recKeys)}
    ${_sectionExperiments(FEATURES.TRY[0], recKeys)}
    ${_section('③', '振り返る', '今の自分の状態を整理したい', '🌿', 'rgba(90,144,112,.10)', FEATURES.REFLECT, recKeys)}
    ${_section('④', '医師と共有する', '診察に持っていく形にしたい', '🏥', 'rgba(74,144,200,.10)', FEATURES.SHARE, recKeys)}
    ${_section('⑤', '記録を守る', '積み重ねた記録を失いたくない', '🛡', 'rgba(200,160,64,.10)', FEATURES.PROTECT, recKeys)}
  `;
}

// ─── Page mode: render & expose ───────────────────────────
export function renderProHubPage() {
  const root = document.getElementById('pro-hub-page-root');
  if (!root) return;

  const recs = _getRecs();
  root.innerHTML = `<div class="pho-page-content">${_buildPageContent(recs)}</div>`;

  // 重複リスナー防止: 既存ハンドラを解除してから再登録
  if (root._clickHandler) root.removeEventListener('click', root._clickHandler);
  root._clickHandler = e => {
    const target = e.target.closest('[data-pro-key]');
    if (target) _navigateToPro(target.dataset.proKey);
  };
  root.addEventListener('click', root._clickHandler);

  // ページ先頭へスクロール
  window.scrollTo(0, 0);

  document.dispatchEvent(new CustomEvent('ippo:pro-hub-ready'));
}

// ─── Expose globally ──────────────────────────────────────
window.openProHub       = openProHub;
window.closeProHub      = closeProHub;
window.renderProHubPage = renderProHubPage;

// 開発用: Overlay を直接開く（通常導線からは到達しない）
window.openProHubOverlay = _openOverlay;

// 開発用: 独立ページを直接開く（openProHub と同じ動作）
window.openProHubPage = openProHub;

// 戻るボタン用: 前画面へ戻る（pro-hub.html の back btn が呼ぶ）
window.goBackFromProHub = function() {
  const prev = _previousScreen;
  if (!prev || !window.switchTab) {
    if (typeof window.switchTab === 'function') window.switchTab('insights', null);
    return;
  }
  // home-next / home → home タブへ
  if (prev === 'home-next' || prev === 'home') {
    window.switchTab('home', null);
  } else {
    // insights / その他 → insights タブへ
    window.switchTab(prev, null);
  }
};
