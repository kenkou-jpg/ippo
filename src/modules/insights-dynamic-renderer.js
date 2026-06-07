// ============================================================
//  ippo – src/modules/insights-dynamic-renderer.js
//  Dynamic Insight Renderer
//
//  【設計原則】
//  - signal → resolver → template rendering パイプライン
//  - comment stabilization: 3〜7日の安定ウィンドウ
//  - 不安を煽らない。強制感を消す。静かに整理できる
//  - 禁止語: 異常・危険・深刻・悪化しています・問題があります
// ============================================================

import { extractSignals, signalFingerprint } from '../services/insight-signals.js';

// ─── Comment stabilization ────────────────────────────────
const _STABLE_KEY    = 'ippo_insight_render_v1';
const _MIN_STABLE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const _MAX_STABLE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function _readStable() {
  try { return JSON.parse(localStorage.getItem(_STABLE_KEY) || 'null'); } catch { return null; }
}

function _writeStable(fp) {
  try {
    localStorage.setItem(_STABLE_KEY, JSON.stringify({
      fp,
      at: new Date().toISOString(),
    }));
  } catch {}
}

function _needsUpdate(fp) {
  const stored = _readStable();
  if (!stored) return true;
  const age = Date.now() - new Date(stored.at).getTime();
  if (age > _MAX_STABLE_MS) return true;
  if (age < _MIN_STABLE_MS) return false;
  return stored.fp !== fp;
}

// ─── Analytics ────────────────────────────────────────────
function _log(name, data) {
  try { if (typeof window.ippoTrack === 'function') window.ippoTrack(name, data || {}); } catch {}
}

// ─── Disease Layer 1 (固定知識) ──────────────────────────
const _LAYER1 = {
  '子宮内膜症': {
    subhead: '子宮内膜症の傾向として知られていること',
    items: [
      '排卵前後に下腹部の張りや違和感が出やすい時期があります',
      '冷えや疲労が続いた後に、症状が増えることがあります',
      '睡眠が浅い時期に、体の重さや不快感が増しやすい傾向があります',
    ],
  },
  '卵巣嚢腫': {
    subhead: '卵巣嚢腫の傾向として知られていること',
    items: [
      '排卵前後に張り感が出やすい傾向があります',
      '冷えや疲労後に違和感が増えることがあります',
      '睡眠不足時に下腹部の違和感が増えることがあります',
    ],
  },
  'PMS': {
    subhead: 'PMSの傾向として知られていること',
    items: [
      '黄体期後半（生理前7〜10日）に気分変動が出やすい傾向があります',
      '生理前に体のサイン（胸の張り、むくみ）が現れやすい時期があります',
      '睡眠の乱れと症状が連動しやすいことがあります',
    ],
  },
  'PMS/PMDD': {
    subhead: 'PMS/PMDDの傾向として知られていること',
    items: [
      '黄体期後半に気分の波が出やすい傾向があります',
      '生理前に気持ちの揺れが出やすい時期があります',
      '睡眠の変化と気分が連動しやすいことがあります',
    ],
  },
  'PMDD': {
    subhead: 'PMDDの傾向として知られていること',
    items: [
      '黄体期後半に感情の波が大きくなりやすい傾向があります',
      '生理前に気持ちの揺れが出やすい時期があります',
      '日常生活に影響を感じやすい時期があります',
    ],
  },
  'PCOS': {
    subhead: 'PCOSの傾向として知られていること',
    items: [
      '周期が定まりにくく、体のリズムをつかみにくいことがあります',
      'エネルギーの波が出やすい傾向があります',
      '気分の変動と周期が連動することがあります',
    ],
  },
  '子宮筋腫': {
    subhead: '子宮筋腫の傾向として知られていること',
    items: [
      '生理時の出血量が多くなる時期があります',
      '倦怠感や貧血の症状と連動することがあります',
      '腹部の圧迫感が出やすい時期があります',
    ],
  },
  '子宮腺筋症': {
    subhead: '子宮腺筋症の傾向として知られていること',
    items: [
      '生理前後に痛みが強くなりやすい傾向があります',
      '冷えや疲労後に症状が増えることがあります',
      '疲労の蓄積が症状に影響しやすいことがあります',
    ],
  },
  '更年期障害': {
    subhead: '更年期の傾向として知られていること',
    items: [
      '体温の調節がしにくくなる時期があります',
      '睡眠の質が変化しやすい傾向があります',
      '気分の揺れが出やすい時期があります',
    ],
  },
  '慢性骨盤痛': {
    subhead: '慢性骨盤痛の傾向として知られていること',
    items: [
      'ストレスや疲労と症状が連動しやすい傾向があります',
      '睡眠の質が症状に影響することがあります',
      '冷えと症状が関連することがあります',
    ],
  },
  '不妊症': {
    subhead: '不妊治療中の体の傾向',
    items: [
      '周期ごとに体の状態が変わりやすいことがあります',
      'ストレスと体調が連動しやすい傾向があります',
      '体温の変化に体が敏感になることがあります',
    ],
  },
};

const _LAYER1_DEFAULT = {
  subhead: 'からだの傾向として知られていること',
  items: [
    '睡眠の乱れと体調が連動しやすい傾向があります',
    'ストレスと症状が関連することがあります',
    '冷えや疲労が蓄積すると体の変化が出やすくなります',
  ],
};

// ─── Template rendering (signal → text) ───────────────────

function _signalText(sig) {
  if (!sig) return null;
  switch (sig.id) {
    case 'sleepPainCorrelation':
    case 'sleepFatigueCorrelation':
      return `最近は、${sig.trigger}に${sig.symptom}が増える傾向があります`;
    case 'stressFlareRisk':
      return `最近は、${sig.trigger}に${sig.symptom}が集中しやすい傾向があります`;
    case 'cycleMoodLink':
      return `最近は、${sig.trigger}に${sig.symptom}が出やすい傾向があります`;
    case 'coldSensitivity':
      return `最近は、${sig.trigger}に${sig.symptom}が増える傾向があります`;
    case 'improvementSleep':
      return `最近は、${sig.trigger}は${sig.symptom}`;
    default:
      return null;
  }
}

function _recentChangeText(sig) {
  if (!sig) return null;
  switch (sig.id) {
    case 'recentFlare':
      return '過去1週間は、気になる動きがあります。もう少し見ることもできます';
    case 'recentImprovement':
      return '過去1週間は、それ以前と比べて落ち着いている傾向があります';
    case 'bbtVariance':
      return `過去30日の体温に変化が見られます（平均 ${sig.avg}℃）`;
    default:
      return null;
  }
}

// ─── Build disease card content (3-layer) ─────────────────

function _buildDiseaseContent(diseaseName, signals) {
  const l1     = _LAYER1[diseaseName] || _LAYER1_DEFAULT;
  const l2     = signals
    .filter(s => s.layer === 2 && s.confidence >= 0.35)
    .map(_signalText).filter(Boolean).slice(0, 2);
  const l3     = signals
    .filter(s => s.layer === 3)
    .map(_recentChangeText).filter(Boolean).slice(0, 1);

  const allItems = [
    ...l1.items.map(text => ({ text, layer: 1 })),
    ...l2.map(text      => ({ text, layer: 2 })),
    ...l3.map(text      => ({ text, layer: 3 })),
  ];

  const hasPersonalData = l2.length > 0 || l3.length > 0;
  const note = hasPersonalData
    ? 'あなたの記録から見えてきた傾向も含まれています。'
    : '記録が増えると、あなた自身の傾向も見えてきます。';

  return { subhead: l1.subhead, items: allItems, note };
}

// ─── Icon config by layer ─────────────────────────────────

function _layerStyle(layer) {
  if (layer === 1) return { bg: '#ede8ff', stroke: '#8b7fd6', path: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' };
  if (layer === 2) return { bg: '#e8f4ff', stroke: '#5a8ec4', path: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' };
  return                  { bg: '#edf5ef', stroke: '#5a9070', path: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' };
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Know card renderer (④ 自分について知る) ──────────────

function _renderDiseaseTabs(state, signals, sc) {
  const diseases  = state.myDiseases || [];
  const tabs      = diseases.length > 0 ? diseases : [];
  const subheadEl = sc.querySelector('#ins-know-subhead') || sc.querySelector('.ipr-dis-subhead');
  const listEl    = sc.querySelector('#ins-know-list')    || sc.querySelector('.ipr-dis-list');
  const noteEl    = sc.querySelector('#ins-know-note')    || sc.querySelector('.ipr-dis-note');
  if (!listEl) return;

  // Use primary disease or default
  const primary  = tabs[0] || '';
  const content  = primary
    ? _buildDiseaseContent(primary, signals)
    : { subhead: _LAYER1_DEFAULT.subhead, items: _LAYER1_DEFAULT.items.map(t => ({ text: t, layer: 1 })), note: '疾患を設定すると、よりパーソナルな傾向が表示されます。' };

  if (subheadEl) subheadEl.textContent = content.subhead;
  listEl.innerHTML = content.items.map(item => {
    const s = _layerStyle(item.layer);
    return `<li><div class="ipr-dis-ico" style="background:${s.bg}">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${s.stroke}" stroke-width="1.6" stroke-linecap="round">${s.path}</svg>
    </div>${_esc(item.text)}</li>`;
  }).join('');
  if (noteEl) noteEl.textContent = content.note;
}

// ─── Main insight card renderer ───────────────────────────

function _renderMainInsight(insights, signals, records, sc) {
  const h2El  = sc.querySelector('#ins-main-insight-text, .ipr-ins-h2');
  const subEl = sc.querySelector('#ins-main-insight-sub, .ipr-ins-body');
  if (!h2El || !subEl) return;

  // Use top signal from engine
  const top = insights[0];
  if (top) {
    h2El.textContent = top.main;
    subEl.textContent = top.sub;
    return;
  }

  // Fall back to top high-confidence signal
  const topSig = signals.find(s => s.layer === 2 && s.confidence >= 0.40);
  if (topSig) {
    const text = _signalText(topSig);
    if (text) {
      h2El.textContent = text;
      subEl.textContent = topSig.pct
        ? `過去30日の記録から、約${topSig.pct}%の確率で見られます。断定はできませんが、気になる動きがあります。`
        : '記録が続くと、傾向がより明確になります。';
      return;
    }
  }

  // Low data or no signal: calm fallback
  const recCount = records.length;
  if (recCount < 5) {
    h2El.textContent = '記録が増えると、ここに気づきが届きます';
    subEl.textContent = '記録を続けることで、少しずつ自分の傾向が見えてきます。';
  } else {
    h2El.textContent = '気になる動きはありません';
    subEl.textContent = '最近の記録からは、特定のパターンはまだ見えていません。これからも、気づいたことを記録してみてください。';
  }
}


// ─── Main public function ─────────────────────────────────

/**
 * インサイト画面の動的コンテンツをレンダリングする。
 * comment stabilization により 3〜7日は同じテキストを維持する。
 */
export function renderInsightsDynamic(state, sc) {
  if (!sc) sc = document.getElementById('screen-insights');
  if (!sc) return;

  const records = state.records || [];
  const signals = extractSignals(records, state);
  const fp      = signalFingerprint(signals);

  // Get insights from engine (already cached internally)
  let insights = [];
  try {
    if (window.ippoInsightEngine) insights = window.ippoInsightEngine.getInsights() || [];
  } catch {}

  // ④ 自分について知る: disease knowledge (structural, always update)
  _renderDiseaseTabs(state, signals, sc);

  // Comment stabilization: only update text content when signals change or expired
  if (_needsUpdate(fp)) {
    _renderMainInsight(insights, signals, records, sc);
    _writeStable(fp);
  }

  // Analytics
  _log('insight_rendered', {
    signalCount:    signals.length,
    hasHighConf:    signals.some(s => s.confidence >= 0.6),
    topSignal:      signals[0]?.id || null,
    diseaseCount:   (state.myDiseases || []).length,
    dataPoints:     records.length,
  });
}

// ─── Window 公開 ─────────────────────────────────────────

window.renderInsightsDynamic = renderInsightsDynamic;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('insights-dynamic-renderer-loaded');
}
