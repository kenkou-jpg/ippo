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

// ─── Disease tab renderer ─────────────────────────────────

function _renderDiseaseTabs(state, signals, sc) {
  const diseases  = state.myDiseases || [];
  const tabs      = diseases.length > 0 ? diseases : [];
  const tabsEl    = sc.querySelector('.ipr-dis-tabs');
  const titleEl   = sc.querySelector('.ipc.ipr-dis-card .ipr-card-title');
  const subheadEl = sc.querySelector('.ipr-dis-subhead');
  const listEl    = sc.querySelector('.ipr-dis-list');
  const noteEl    = sc.querySelector('.ipr-dis-note');
  if (!tabsEl || !listEl) return;

  // Update card title to reflect user's primary disease
  if (titleEl && diseases.length > 0) {
    titleEl.textContent = `${diseases[0]}と普段とのつながり`;
  }

  // If no diseases set, show generic content and return
  if (tabs.length === 0) {
    if (subheadEl) subheadEl.textContent = _LAYER1_DEFAULT.subhead;
    if (listEl) listEl.innerHTML = _LAYER1_DEFAULT.items.map(text => {
      const s = _layerStyle(1);
      return `<li><div class="ipr-dis-ico" style="background:${s.bg}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${s.stroke}" stroke-width="1.6" stroke-linecap="round">${s.path}</svg>
      </div>${_esc(text)}</li>`;
    }).join('');
    if (noteEl) noteEl.textContent = '疾患を設定すると、よりパーソナルな傾向が表示されます。';
    tabsEl.innerHTML = '';
    return;
  }

  // Render disease tabs
  tabsEl.innerHTML = tabs.map((d, i) =>
    `<button class="ipr-dis-tab${i === 0 ? ' active' : ''}">${_esc(d)}</button>`
  ).join('');

  function _showTab(idx) {
    tabsEl.querySelectorAll('.ipr-dis-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    const content = _buildDiseaseContent(tabs[idx] || '', signals);
    if (subheadEl) subheadEl.textContent = content.subhead;
    if (listEl) {
      listEl.innerHTML = content.items.map(item => {
        const s = _layerStyle(item.layer);
        return `<li><div class="ipr-dis-ico" style="background:${s.bg}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${s.stroke}" stroke-width="1.6" stroke-linecap="round">${s.path}</svg>
        </div>${_esc(item.text)}</li>`;
      }).join('');
    }
    if (noteEl) noteEl.textContent = content.note;
  }

  tabsEl.querySelectorAll('.ipr-dis-tab').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      _log('insight_rendered', { action: 'disease_tab', tab: tabs[i] });
      _showTab(i);
    });
  });

  // Override global tab switcher
  window._iprSwitchDisTab = (idx) => _showTab(idx);
  _showTab(0);
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
    h2El.textContent = 'まだ大きな傾向は見えていません';
    subEl.textContent = '記録を続けることで、少しずつ自分の傾向が見えてきます。もう少し記録を見ることもできます。';
  } else {
    h2El.textContent = '気になる動きはありません';
    subEl.textContent = '最近の記録からは、特定のパターンはまだ見えていません。これからも、気づいたことを記録してみてください。';
  }
}

// ─── Hints card renderer ─────────────────────────────────

function _renderHints(signals, sc) {
  const hintsEl = sc.querySelector('.ipr-hints-text');
  if (!hintsEl) return;

  // Prefer positive/improvement signal
  const posSig = signals.find(s => s.direction === 'positive' && s.confidence >= 0.35);
  if (posSig) {
    const text = _signalText(posSig);
    if (text) {
      hintsEl.textContent = text.replace('最近は、', '');
      return;
    }
  }

  // Recent improvement
  const impSig = signals.find(s => s.id === 'recentImprovement');
  if (impSig) {
    hintsEl.textContent = '過去1週間は、それ以前と比べて落ち着いている傾向があります。';
    return;
  }
}

// ─── Experiment card renderer ─────────────────────────────

function _renderExperiment(signals, sc) {
  const propEl = sc.querySelector('.ipr-exp-proposal');
  const bodyEl = sc.querySelector('.ipr-exp-body');
  if (!propEl || !bodyEl) return;

  const negSig = signals.find(s => s.direction === 'negative' && s.layer === 2 && s.confidence >= 0.35);
  if (!negSig) return;

  const EXP_MAP = {
    sleepPainCorrelation:    { prop: '今週の実験：睡眠時間を30分早く確保してみる',    body: '睡眠と翌日の体調のつながりが見られます。少しだけ早く休むことで、変化があるか試してみましょう。' },
    sleepFatigueCorrelation: { prop: '今週の実験：就寝時刻を30分早めてみる',         body: '睡眠の質と疲れのつながりが見られます。早めに休むことで、翌日の調子が変わるか試してみましょう。' },
    stressFlareRisk:         { prop: '今週の実験：ストレスを感じたら短い休憩を入れてみる', body: 'ストレスと体調のつながりが見られます。ひと息つく時間を意識的に作ってみましょう。' },
    cycleMoodLink:           { prop: '今週の実験：黄体期に予定を少し減らしてみる',    body: '生理前の時期に気分の変化が見られます。この時期は特に、無理をしない選択を大切に。' },
    coldSensitivity:         { prop: '今週の実験：冷えを感じたら温かい飲み物を取り入れる', body: '冷えと翌日の体調のつながりが見られます。体を温める工夫を試してみましょう。' },
  };

  const exp = EXP_MAP[negSig.id];
  if (exp) {
    propEl.textContent = exp.prop;
    bodyEl.textContent = exp.body;
  }
}

// ─── "他の見方" section ───────────────────────────────────

function _renderAlternativeViews(sc) {
  const insBottom = sc.querySelector('.ipr-ins-bottom');
  if (!insBottom || sc.querySelector('.ipr-ins-alt-views')) return;

  const altEl = document.createElement('div');
  altEl.className = 'ipr-ins-alt-views';
  altEl.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid rgba(139,127,214,.08);';
  altEl.innerHTML = `
    <div style="font-size:10px;color:#a0a8c0;margin-bottom:8px;letter-spacing:.04em;">他の見方</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <button class="ipr-alt-btn" data-type="ai-pattern"   style="padding:5px 11px;border-radius:99px;background:rgba(139,127,214,.08);border:1px solid rgba(139,127,214,.14);color:#8b7fd6;font-size:10.5px;cursor:pointer;font-family:inherit;">AIパターン解析</button>
      <button class="ipr-alt-btn" data-type="experiment"   style="padding:5px 11px;border-radius:99px;background:rgba(139,127,214,.08);border:1px solid rgba(139,127,214,.14);color:#8b7fd6;font-size:10.5px;cursor:pointer;font-family:inherit;">ヘルス実験</button>
      <button class="ipr-alt-btn" data-type="factor-report" style="padding:5px 11px;border-radius:99px;background:rgba(139,127,214,.08);border:1px solid rgba(139,127,214,.14);color:#8b7fd6;font-size:10.5px;cursor:pointer;font-family:inherit;">要因効果レポート</button>
    </div>
  `;

  altEl.querySelectorAll('.ipr-alt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      _log('alternative_selected', { key: type });
      if (typeof window.triggerInsightSurface === 'function') {
        window.triggerInsightSurface(type === 'ai-pattern' ? 'insight' : type);
      }
    });
  });

  insBottom.appendChild(altEl);
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

  // Disease tabs: always update (structural, not text)
  _renderDiseaseTabs(state, signals, sc);

  // "他の見方" section: always render (idempotent)
  _renderAlternativeViews(sc);

  // Comment stabilization: only update text content when signals change or expired
  if (_needsUpdate(fp)) {
    _renderMainInsight(insights, signals, records, sc);
    _renderHints(signals, sc);
    _renderExperiment(signals, sc);
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
