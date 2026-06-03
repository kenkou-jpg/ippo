// ============================================================
//  ippo – src/modules/pro-hub/pro-hub.js
//  PRO整理室: right-side slide-over panel
//  Phase 1–4: panel open/close + cards + recommendations + animation
// ============================================================

import './pro-hub.css';
import { getState } from '../../store/state.js';

// ─── SVG ──────────────────────────────────────────────────
const SVG_CLOSE   = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>`;
const SVG_CHEVRON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l4 5-4 5"/></svg>`;
const SVG_STAR    = `<svg viewBox="0 0 12 12" fill="currentColor"><polygon points="6 1 7.55 4.18 11 4.64 8.5 7.07 9.09 10.5 6 8.86 2.91 10.5 3.5 7.07 1 4.64 4.45 4.18"/></svg>`;

// ─── Section SVG icons (Phase 1 migration) ────────────────
// HOME準拠: stroke-width 1.4 / stroke-linecap round / fill none
const SVG_UNDERSTAND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>`;
const SVG_TRY        = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7.5l4 8a1 1 0 01-.9 1.5H5.9A1 1 0 015 18.5l4-8V3z"/><line x1="6.5" y1="8" x2="17.5" y2="8"/></svg>`;
const SVG_REFLECT    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-4.5-3-9-6.5-9-11a9 9 0 0 1 18 0c0 4.5-4.5 8-9 11z"/><circle cx="12" cy="10" r="2.5" fill="currentColor" opacity="0.2" stroke="none"/></svg>`;
const SVG_SHARE      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/><line x1="8" y1="8" x2="16" y2="8"/></svg>`;
const SVG_PROTECT    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L21 6.5 L21 13 C21 17.5 17 21 12 22.5 C7 21 3 17.5 3 13 L3 6.5 Z"/><polyline points="9 12.5 11.5 15.5 16 10"/></svg>`;

// ─── Feature data ──────────────────────────────────────────
// Journey sections: ① 理解する → ② 試してみる → ③ 振り返る → ④ 医師と共有する → ⑤ 記録を守る
// ─── Functional card SVG icons ────────────────────────────
// HOME準拠: viewBox 0 0 24 24 / stroke-width 1.4 / stroke-linecap round
// color は各セクションアクセント色を icoColor で指定
const _I = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

// ① 理解する
const ICO_AI_PATTERN  = _I(`<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`);
const ICO_FLARE       = _I(`<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`);
const ICO_FACTOR      = _I(`<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>`);
const ICO_CYCLE       = _I(`<circle cx="8.5" cy="12" r="5"/><circle cx="15.5" cy="12" r="5"/>`);
const ICO_BBT         = _I(`<path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>`);

// ② 試してみる
const ICO_EXPERIMENT  = _I(`<path d="M9 3h6v7.5l4 8a1 1 0 01-.9 1.5H5.9A1 1 0 015 18.5l4-8V3z"/><line x1="6.5" y1="8" x2="17.5" y2="8"/>`);

// ③ 振り返る
const ICO_BODY_SUMMARY  = _I(`<path d="M12 21c-4.5-3-9-7-9-11a9 9 0 0118 0c0 4-4.5 8-9 11z"/><line x1="12" y1="10" x2="12" y2="15"/><line x1="9.5" y1="13" x2="14.5" y2="13"/>`);
const ICO_SYMPTOM_TRENDS= _I(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`);
const ICO_CONDITION     = _I(`<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>`);

// ④ 医師と共有する
const ICO_DOCTOR      = _I(`<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>`);
const ICO_MONTHLY_PDF = _I(`<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/>`);

// ⑤ 記録を守る
const ICO_CLOUD_SYNC  = _I(`<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><line x1="12" y1="14" x2="12" y2="19"/><polyline points="9.5 16.5 12 14 14.5 16.5"/>`);
const ICO_BACKUP      = _I(`<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/><polyline points="9.5 17.5 12 20 14.5 17.5"/><line x1="12" y1="13" x2="12" y2="20"/>`);
const ICO_RESTORE     = _I(`<path d="M3 12a9 9 0 109-9 9.75 9.75 0 01-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/>`);
const ICO_DIAGNOSE    = _I(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`);
const ICO_EXPORT      = _I(`<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>`);

const FEATURES = {
  // ① 理解する: なぜこうなっているのか知りたい
  UNDERSTAND: [
    { key:'ai-pattern',       name:'AIパターン解析',   desc:'症状・睡眠・体温の関係など、記録だけでは見えにくい長期の傾向を見つけます',   ico:ICO_AI_PATTERN,   icoColor:'#8b7fd6', bg:'rgba(139,127,214,.12)' },
    { key:'flare-analysis',   name:'症状が強かった日の共通点', desc:'症状が強かった日に共通するきっかけや前兆を探します',              ico:ICO_FLARE,        icoColor:'#d4845a', bg:'rgba(212,132,90,.12)'  },
    { key:'factor-report',    name:'一緒に起きやすいこと',   desc:'睡眠・ストレスなど、どの習慣が体調と一緒に変わりやすいか整理します', ico:ICO_FACTOR,       icoColor:'#c8a040', bg:'rgba(200,160,64,.12)'  },
    { key:'cycle-compare',    name:'周期ごとの体調の違い',   desc:'調子の良かった周期と今を並べて、変化のヒントを探します',              ico:ICO_CYCLE,        icoColor:'#4a90c8', bg:'rgba(74,144,200,.12)'  },
    { key:'bbt-pattern',      name:'体温のリズム',           desc:'体温の変化から、あなた固有のリズムや排卵のタイミングを見つけます',    ico:ICO_BBT,          icoColor:'#d4849a', bg:'rgba(212,132,154,.12)' },
  ],
  // ② 試してみる: 専用セクション（experiments 単独）
  TRY: [
    { key:'experiments',      name:'ヘルス実験',        desc:'試してみたことが本当に自分に合っていたか、記録をもとに振り返れます',            ico:ICO_EXPERIMENT,   icoColor:'#5a9070', bg:'rgba(90,144,112,.12)'  },
  ],
  // ③ 振り返る: 今の自分の状態を整理したい
  REFLECT: [
    { key:'body-summary',     name:'からだサマリー',     desc:'今の状態をひと目で振り返れる形に整理します（自分向け）',                      ico:ICO_BODY_SUMMARY,  icoColor:'#5a9070', bg:'rgba(90,144,112,.12)'  },
    { key:'symptom-trends',   name:'症状推移グラフ',     desc:'複数の症状がどう推移しているか、周期と重ねてグラフで確認できます',             ico:ICO_SYMPTOM_TRENDS,icoColor:'#d4849a', bg:'rgba(212,132,154,.12)' },
    { key:'condition-summary',name:'疾患観察まとめ',     desc:'疾患ごとの症状の変化を、長い視点でまとめて振り返れます（疾患向け）',          ico:ICO_CONDITION,    icoColor:'#c8a040', bg:'rgba(200,160,64,.12)'  },
  ],
  // ④ 医師と共有する: 診察に持っていく形にしたい
  SHARE: [
    { key:'doctor-summary',   name:'受診用まとめ',       desc:'診察で伝えたい症状や変化を、医師に見せる形でまとめます（医師向け）',           ico:ICO_DOCTOR,       icoColor:'#4a90c8', bg:'rgba(74,144,200,.12)'  },
    { key:'monthly-pdf',      name:'月次PDFレポート',    desc:'1ヶ月の記録を印刷・共有できるPDFにまとめます',                               ico:ICO_MONTHLY_PDF,  icoColor:'#8b7fd6', bg:'rgba(139,127,214,.12)' },
  ],
  // ⑤ 記録を守る: 積み重ねた記録を失いたくない
  PROTECT: [
    { key:'cloud-sync',       name:'クラウド同期',       desc:'積み重ねた記録を、端末が変わっても安全に引き継げます',                        ico:ICO_CLOUD_SYNC,   icoColor:'#4a90c8', bg:'rgba(74,144,200,.12)'  },
    { key:'backup',           name:'バックアップ',       desc:'大切な記録をいつでもスナップショット保存しておけます',                         ico:ICO_BACKUP,       icoColor:'#8b7fd6', bg:'rgba(139,127,214,.12)' },
    { key:'restore',          name:'復元',              desc:'誤って消してしまった記録も、過去のバックアップから取り戻せます',               ico:ICO_RESTORE,      icoColor:'#5a9070', bg:'rgba(90,144,112,.12)'  },
    { key:'data-health',      name:'データ診断',         desc:'記録の抜けや矛盾を自動でチェックして、分析の精度を保ちます',                  ico:ICO_DIAGNOSE,     icoColor:'#c8a040', bg:'rgba(200,160,64,.12)'  },
    { key:'export',           name:'データ出力',         desc:'自分の記録をCSVやJSONで取り出して、外部でも活用できます',                     ico:ICO_EXPORT,       icoColor:'#d4845a', bg:'rgba(212,132,90,.12)'  },
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

// ─── Roadmap sections (P27) ───────────────────────────────
const SECTIONS = [
  { num:1, color:'#8b7fd6', title:'理解する',      sub:'原因やパターンを深く知る',  features:FEATURES.UNDERSTAND },
  { num:2, color:'#5a9070', title:'試してみる',    sub:'自分に合う方法を見つける',  features:FEATURES.TRY       },
  { num:3, color:'#d4845a', title:'振り返る',      sub:'これまでの記録を整理する',  features:FEATURES.REFLECT   },
  { num:4, color:'#d4849a', title:'医師と共有する', sub:'診察をスムーズにする',      features:FEATURES.SHARE     },
  { num:5, color:'#4a90c8', title:'記録を守る',    sub:'大切な記録を安心して残す', features:FEATURES.PROTECT   },
];

// ─── State ────────────────────────────────────────────────
let _isOpen = false;
let _previousScreen = null; // ページモード: どこから来たかを記憶
let _activeSection = 0;     // アコーディオン: 展開中のセクション index

// ─── Current Position ─────────────────────────────────────
function _getCurrentPosition(s) {
  const records     = s.records     || [];
  const experiments = s.experiments || [];

  // CASE 1: 記録が少ない
  if (records.length < 4) {
    return {
      caseNum: 1,
      message: '記録、続けていますね。<br>もう少し積み重なってきたら、ここに気づきが届きます。',
      recKey: null,
      recText: null,
    };
  }

  // CASE 3 / 4: 実験あり
  if (experiments.length > 0) {
    const dates = records
      .map(r => new Date(r.date || r.record_date))
      .filter(d => !isNaN(d.getTime()));
    const oldestMs = dates.length ? Math.min(...dates.map(d => d.getTime())) : Date.now();
    const spanDays  = (Date.now() - oldestMs) / 86400000;

    // CASE 4: 長期ユーザー（実験あり + 60日以上）
    if (spanDays >= 60) {
      return {
        caseNum: 4,
        message: '長く記録が続いています。<br>変化のパターンが見えやすくなってきた頃です。',
        recKey: null,
        recText: null,
      };
    }

    // CASE 3: 実験中（スパン < 60日）
    return {
      caseNum: 3,
      message: '実験、試してみているんですね。',
      recKey: 'experiments',
      recText: '続きはヘルス実験で確認できます。',
    };
  }

  // CASE 2: 記録は十分、実験なし
  return {
    caseNum: 2,
    message: '記録が積み重なって、少し傾向が見えてきました。',
    recKey: 'ai-pattern',
    recText: '気になることがあれば、AIパターン解析で深めてみましょう。',
  };
}

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
  const icoColorStyle = feat.icoColor ? `color:${feat.icoColor};` : '';
  return `<div class="pho-card${isRec ? ' pho-rec' : ''}" data-pro-key="${feat.key}" role="button" tabindex="0">
    <div class="pho-card-ico" style="background:${feat.bg};${icoColorStyle}">${feat.ico}</div>
    <div class="pho-card-body">
      <div class="pho-card-name">${feat.name}</div>
      <div class="pho-card-desc">${feat.desc}</div>
      ${isRec ? `<div class="pho-rec-tag">${SVG_STAR} おすすめ</div>` : ''}
    </div>
    <div class="pho-card-chevron">${SVG_CHEVRON}</div>
  </div>`;
}

function _section(num, title, userPsych, ico, bg, features, recKeys, color) {
  const colorStyle = color ? `color:${color};` : '';
  return `<div class="pho-section">
    <div class="pho-section-head">
      <div class="pho-section-icon" style="background:${bg};${colorStyle}">${ico}</div>
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
      <div class="pho-section-icon" style="background:rgba(90,144,112,.12);color:#5a9070">${SVG_TRY}</div>
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
  // src/modules/pro/symptom-trends/symptom-trends.js (P31)
  'symptom-trends':   () => typeof window.openSymptomTrends === 'function' && window.openSymptomTrends(),
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

// ─── P27-C: initial section from position case ────────────
function _getInitialSection(pos) {
  if (pos.caseNum === 3) return 1; // 試してみる
  if (pos.caseNum === 4) return 2; // 振り返る
  return 0;                        // 理解する (CASE1, CASE2)
}

// ─── P32-C: left column builder ───────────────────────────
function _buildLeftColumn(activeIdx) {
  const chev = (up) =>
    `<svg class="ph-road-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="${up ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}"/>
    </svg>`;

  const roadmapItems = SECTIONS.map((sec, i) => {
    const active = i === activeIdx;
    const numStyle = active
      ? `background:${sec.color};border-color:${sec.color};color:#fff`
      : `background:transparent;border-color:${sec.color};color:${sec.color}`;
    return `
      <div class="ph-road-item${active ? ' ph-road-active' : ''}" data-road-idx="${i}" role="button" tabindex="0" aria-expanded="${active}">
        <div class="ph-road-connector">
          <div class="ph-road-num" style="${numStyle}">${sec.num}</div>
          ${i < SECTIONS.length - 1 ? '<div class="ph-road-line"></div>' : ''}
        </div>
        <div class="ph-road-body">
          <div class="ph-road-row">
            <div class="ph-road-texts">
              <div class="ph-road-title">${sec.title}</div>
              <div class="ph-road-sub">${sec.sub}</div>
            </div>
            <div class="ph-road-meta">
              <span class="ph-road-count">${sec.features.length}項目</span>
              ${chev(active)}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  return `<div class="ph-left-card"><div class="ph-roadmap">${roadmapItems}</div></div>`;
}

// ─── P32-C: right column builder ──────────────────────────
function _buildRightColumn(activeIdx, recKeys) {
  const sec = SECTIONS[activeIdx];
  const chevRight = `<svg class="ph-detail-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3l4 5-4 5"/></svg>`;

  const detailCards = sec.features.map(feat => {
    const showRec = recKeys.has(feat.key);
    const recTag = showRec ? `<span class="ph-detail-rec-tag">おすすめ</span>` : '';
    return `
      <div class="ph-detail-card" data-pro-key="${feat.key}" role="button" tabindex="0">
        <div class="ph-detail-card-ico" style="background:${feat.bg};color:${feat.icoColor}">${feat.ico}</div>
        <div class="ph-detail-card-body">
          <div class="ph-detail-card-name">${feat.name}${recTag}</div>
          <div class="ph-detail-card-desc">${feat.desc}</div>
        </div>
        ${chevRight}
      </div>`;
  }).join('');

  return `<div class="ph-right-card">${detailCards}</div>`;
}

// ─── P27-B: partial DOM update for accordion ──────────────
function _refreshLayout(root, recs, pos, activeIdx) {
  _activeSection = activeIdx;
  const recKeys = new Set(recs.map(r => r.key));
  if (pos.caseNum === 2) recKeys.add('ai-pattern');

  const leftCol = root.querySelector('#ph-left-col');
  const rightCol = root.querySelector('#ph-right-col');
  if (leftCol)  leftCol.innerHTML  = _buildLeftColumn(activeIdx);
  if (rightCol) rightCol.innerHTML = _buildRightColumn(activeIdx, recKeys);
}

// ─── Page mode: content builder ───────────────────────────
function _buildPageContent(recs, pos, activeIdx) {
  const recKeys = new Set(recs.map(r => r.key));
  if (pos.caseNum === 2) recKeys.add('ai-pattern'); // P27-C CASE2

  return `
    <div class="ph-layout">
      <div class="ph-layout-left" id="ph-left-col">${_buildLeftColumn(activeIdx)}</div>
      <div class="ph-layout-right" id="ph-right-col">${_buildRightColumn(activeIdx, recKeys)}</div>
    </div>`;
}

// ─── Page mode: render & expose ───────────────────────────
export function renderProHubPage() {
  const root = document.getElementById('pro-hub-page-root');
  if (!root) return;

  const recs = _getRecs();
  const s = (typeof window.getState === 'function' ? window.getState() : null) || getState();
  const pos = _getCurrentPosition(s || {});

  // P27-C: initial section from current position
  _activeSection = _getInitialSection(pos);

  root.innerHTML = `<div class="pho-page-content">${_buildPageContent(recs, pos, _activeSection)}</div>`;

  // Unified click handler (accordion + feature navigation)
  if (root._clickHandler) root.removeEventListener('click', root._clickHandler);
  root._clickHandler = e => {
    // Accordion: left roadmap item
    const roadItem = e.target.closest('.ph-road-item[data-road-idx]');
    if (roadItem) {
      const idx = parseInt(roadItem.dataset.roadIdx);
      if (!isNaN(idx)) { _refreshLayout(root, recs, pos, idx); return; }
    }
    // Feature navigation
    const proKey = e.target.closest('[data-pro-key]');
    if (proKey) _navigateToPro(proKey.dataset.proKey);
  };
  root.addEventListener('click', root._clickHandler);

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
