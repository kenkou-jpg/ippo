// ============================================================
//  ippo – home-next-personalize.js
//  「あなたに合わせた表示」セクション
//  疾患タグ + 重視項目テキスト + 設定調整リンク
// ============================================================

// ── 疾患ラベル設定 ────────────────────────────────────────
// profileKey → { label, color, bg }

const DISEASE_DISPLAY = {
  pcos:                { label: 'PCOS',       color: '#9DB095', bg: '#EEF3EB' },
  endometriosis:       { label: '子宮内膜症', color: '#B87F6A', bg: '#F5EDE3' },
  ovarian_cyst:        { label: '卵巣嚢腫',   color: '#C4946A', bg: '#F5EDE3' },
  pms:                 { label: 'PMS/PMDD',   color: '#7A9BB0', bg: '#EBF2F5' },
  uterine_fibroid:     { label: '子宮筋腫',   color: '#A08AB0', bg: '#F0ECF5' },
  adenomyosis:         { label: '子宮腺筋症', color: '#B87F6A', bg: '#F5EDE3' },
  menopause:           { label: '更年期障害', color: '#B09070', bg: '#F5EEE3' },
  chronic_pelvic_pain: { label: '慢性骨盤痛', color: '#C07080', bg: '#F5ECF0' },
  infertility:         { label: '不妊症',     color: '#9DB095', bg: '#EEF3EB' },
};

// 日本語疾患名 → profileKey マッピング
const DISEASE_TO_PROFILE = {
  '子宮内膜症':  'endometriosis',
  'PCOS':        'pcos',
  '卵巣嚢腫':   'ovarian_cyst',
  'PMS/PMDD':   'pms',
  '子宮筋腫':   'uterine_fibroid',
  '子宮腺筋症': 'adenomyosis',
  '更年期障害': 'menopause',
  '慢性骨盤痛': 'chronic_pelvic_pain',
  '不妊症':     'infertility',
};

// ── 優先カード → 重視項目テキスト ────────────────────────

const CARD_LABELS = {
  sleep:    '睡眠',
  pain:     '痛み',
  mood:     '気分',
  swelling: 'むくみ',
  symptom:  '症状',
  food:     '食事',
  temp:     '体温',
};

function buildPriorityText(priorityCards) {
  const labels = (priorityCards || []).slice(0, 4)
    .map(k => CARD_LABELS[k] || k)
    .filter(Boolean);
  if (!labels.length) return '';
  return labels.join('・') + 'を重視して表示しています';
}

// ── 疾患タグ HTML ─────────────────────────────────────────

function buildDiseaseTags(myDiseases) {
  if (!myDiseases || !myDiseases.length) return '';

  return myDiseases.map(disease => {
    const profileKey = DISEASE_TO_PROFILE[disease] || disease;
    const display    = DISEASE_DISPLAY[profileKey];
    const color      = display ? display.color : '#9DB095';
    const bg         = display ? display.bg    : '#EEF3EB';
    const label      = display ? display.label : disease;

    return `<span class="hn-ptag" style="--ptag-color:${color};--ptag-bg:${bg}">
      <span class="hn-ptag-dot"></span>${esc(label)}
    </span>`;
  }).join('');
}

// ── メインレンダリング ────────────────────────────────────

export function renderPersonalizeSection(container, config, state) {
  const diseases     = state.myDiseases || [];
  const priorityText = buildPriorityText(config.priorityCards);

  // 疾患未設定かつ優先テキストもなければ非表示
  if (!diseases.length && !priorityText) {
    container.innerHTML = '';
    return;
  }

  const tagsHtml = buildDiseaseTags(diseases);

  const settingsLink = `
    <button class="hn-psettings"
      onclick="if(typeof window.switchTab==='function')window.switchTab('settings',null)">
      設定を調整する &rsaquo;
    </button>`;

  container.innerHTML = `
    <div class="hn-personalize hn-anim-3">
      ${tagsHtml ? `<div class="hn-ptags-row">${tagsHtml}</div>` : ''}
      ${priorityText ? `<div class="hn-ppriority">${esc(priorityText)}</div>` : ''}
      ${settingsLink}
    </div>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
