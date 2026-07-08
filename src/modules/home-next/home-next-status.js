// ============================================================
//  ippo – home-next-status.js v3
//  状態カード: 横4列 + SVG細線アイコン + 数値表示 + ミニ可視化
// ============================================================

// ── SVG アイコン定数 ──────────────────────────────────────
// 全て 1.4px stroke / currentColor / stroke-linecap round

const SVG_SLEEP = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17.5 12.5A7.5 7.5 0 019.5 5a5.5 5.5 0 00.5 1 6 6 0 007.5 6.5z"/>
</svg>`;

const SVG_PAIN = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M11 2.5L4.5 11H11L8.5 17.5L16.5 9H10L11 2.5z"/>
</svg>`;

const SVG_MOOD = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
  <circle cx="10" cy="10" r="7.5"/>
  <path d="M7 12.5c.7.9 1.8 1.5 3 1.5s2.3-.6 3-1.5"/>
  <circle cx="7.5" cy="8.5" r=".7" fill="currentColor" stroke="none"/>
  <circle cx="12.5" cy="8.5" r=".7" fill="currentColor" stroke="none"/>
</svg>`;

const SVG_DIAMOND = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2L18 10L10 18L2 10Z"/>
</svg>`;

const SVG_ENERGY = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2L6 11H12.5L10.5 18L18 9H11.5L13 2z"/>
</svg>`;

// SVG 気分フェイス (5段階: 0=悲, 1=やや悲, 2=中, 3=やや良, 4=良)
const MOOD_FACES = [
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 11.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5"/><circle cx="5.5" cy="7" r=".55" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7" r=".55" fill="currentColor" stroke="none"/></svg>`,
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 10.5c.5-.5 1.5-.8 2.5-.8s2 .3 2.5.8"/><circle cx="5.5" cy="7" r=".55" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7" r=".55" fill="currentColor" stroke="none"/></svg>`,
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 10.5h5"/><circle cx="5.5" cy="7" r=".55" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7" r=".55" fill="currentColor" stroke="none"/></svg>`,
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 9.5c.5.8 1.5 1.2 2.5 1.2s2-.4 2.5-1.2"/><circle cx="5.5" cy="7" r=".55" fill="currentColor" stroke="none"/><circle cx="10.5" cy="7" r=".55" fill="currentColor" stroke="none"/></svg>`,
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 9c.5 1.2 1.5 1.8 2.5 1.8s2-.6 2.5-1.8"/><circle cx="5.5" cy="6.5" r=".55" fill="currentColor" stroke="none"/><circle cx="10.5" cy="6.5" r=".55" fill="currentColor" stroke="none"/></svg>`,
];

// ── データ取得 ────────────────────────────────────────────

function getTodayRecord(records) {
  const today = new Date().toISOString().slice(0, 10);
  return (records || []).find(r => (r.date || r.record_date || '').slice(0, 10) === today) || null;
}

function getLatestRecord(records) {
  if (!records || !records.length) return null;
  return [...records].sort((a, b) =>
    new Date(b.date || b.record_date || '') - new Date(a.date || a.record_date || '')
  )[0];
}

function getRecentN(records, n) {
  return [...(records || [])]
    .sort((a, b) => new Date(b.date || b.record_date || '') - new Date(a.date || a.record_date || ''))
    .slice(0, n);
}

// ── 棒グラフ SVG (睡眠) ──────────────────────────────────

function buildBarChart(records) {
  return ''; // PHASE 1-B: 描画停止（関数・ロジック保持）
  const recent  = getRecentN(records, 4);
  const ordered = [...recent].reverse();
  const bars    = ordered.length === 0
    ? [60, 80, 70, 65]
    : ordered.map(r => Math.max(20, 100 - (r.sleepQuality ?? 2) * 20));

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = ordered.findIndex(r => (r.date || r.record_date || '').slice(0, 10) === todayStr);

  return `<div class="hn-sc-bars">
    ${bars.map((h, i) => `<div class="hn-sc-bar${i === todayIdx || (todayIdx === -1 && i === bars.length - 1) ? ' today' : ''}" style="height:${h}%"></div>`).join('')}
  </div>`;
}

// ── ドットスケール (痛み) ─────────────────────────────────

function buildDotScale(painLevel) {
  return ''; // PHASE 1-B: 描画停止（関数・ロジック保持）
  const level = painLevel ?? -1;
  let dots = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= level;
    const cls    = filled ? `hn-sc-dot pain-${Math.min(level, 4)}` : 'hn-sc-dot';
    dots += `<div class="${cls}"></div>`;
  }
  return `<div class="hn-sc-dots">${dots}</div>`;
}

// ── 気分 SVGフェイス行 ────────────────────────────────────

function buildMoodFaces(moodLevel) {
  return `<div class="hn-mood-row">
    ${MOOD_FACES.map((svg, i) =>
      `<div class="hn-mood-face${i === moodLevel ? ' active' : ''}">${svg}</div>`
    ).join('')}
  </div>`;
}

// ── スパークライン SVG ────────────────────────────────────

function buildSparkline(values, color = '#B0C2A8') {
  if (!values || values.length < 2) {
    return `<svg class="hn-sparkline" viewBox="0 0 60 24">
      <line x1="0" y1="12" x2="60" y2="12" stroke="${color}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.4"/>
    </svg>`;
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 60, h = 20;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return `<svg class="hn-sparkline" viewBox="0 0 60 24">
    <polyline points="${points}" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── 睡眠カード ────────────────────────────────────────────

function buildSleepCard(records) {
  const rec    = getTodayRecord(records) || getLatestRecord(records);
  const q      = rec?.sleepQuality ?? null;
  const hrs    = rec?.sleepHours   ?? null;

  // メイン表示: 時間があれば "6時間10分", なければ質ラベル
  let value, sub;
  if (hrs != null) {
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    value = m > 0 ? `${h}時間${m}分` : `${h}時間`;
    const qSubs = ['快眠', 'まあまあ', 'やや不足', '不足', '睡眠不足'];
    sub = q != null ? qSubs[Math.min(q, 4)] : '';
  } else if (q != null) {
    const labels = ['よく眠れた', 'まあまあ', 'やや浅い', '浅かった', '眠れなかった'];
    const subs   = ['質: 良い',   '質: 普通',  '質: やや不足', '質: 不足', '質: 不足'];
    value = labels[Math.min(q, 4)];
    sub   = subs[Math.min(q, 4)];
  } else {
    value = '未記録';
    sub   = '';
  }

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${SVG_SLEEP}</div>
    <div class="hn-sc-label">睡眠</div>
    <div class="hn-sc-value${hrs != null ? ' hn-sc-value-num' : ''}">${esc(value)}</div>
    ${sub ? `<div class="hn-sc-sub">${esc(sub)}</div>` : ''}
    ${buildBarChart(records)}
  </div>`;
}

// ── 痛み・不調カード ──────────────────────────────────────

function buildPainCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const pain     = rec?.painLevel ?? null;
  const symptoms = rec?.symptoms || [];

  const knownPainSymptoms = ['下腹部痛', '腰痛', '頭痛', '倦怠感', '吐き気', 'だるさ'];
  const painSymptoms = symptoms.filter(s => knownPainSymptoms.includes(s));

  const painLabels = ['痛みなし', '軽い痛み', '中程度', '強い', 'とても強い'];
  const subLabels  = ['安定', '気になる', 'やや強い', '強い', 'つらい'];

  let value, sub;
  if (pain != null) {
    value = painSymptoms.length ? painSymptoms.slice(0, 2).join('・') : painLabels[Math.min(pain, 4)];
    sub   = subLabels[Math.min(pain, 4)];
  } else {
    value = '未記録';
    sub   = '';
  }

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${SVG_PAIN}</div>
    <div class="hn-sc-label">痛み・不調</div>
    <div class="hn-sc-value">${esc(value)}</div>
    ${sub ? `<div class="hn-sc-sub">${esc(sub)}</div>` : ''}
    ${buildDotScale(pain)}
  </div>`;
}

// ── 気分カード ────────────────────────────────────────────

function buildMoodCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const mood     = rec?.mood ?? null;
  const symptoms = rec?.symptoms || [];

  let moodLevel = mood;
  if (moodLevel == null) {
    const bad = ['気分の落ち込み', 'イライラ', '不安感'].filter(s => symptoms.includes(s)).length;
    if (bad >= 2) moodLevel = 1;
    else if (bad === 1) moodLevel = 2;
    else if (symptoms.length > 0) moodLevel = 2;
  }

  const moodLabels = ['落ち込み', '不安定', '普通', '穏やか', '良好'];
  const subLabels  = ['つらい日', '波あり', 'まあまあ', 'やや穏やか', '良い調子'];

  const value = moodLevel != null ? moodLabels[Math.min(moodLevel, 4)] : '未記録';
  const sub   = moodLevel != null ? subLabels[Math.min(moodLevel, 4)] : '';

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${SVG_MOOD}</div>
    <div class="hn-sc-label">気分</div>
    <div class="hn-sc-value">${esc(value)}</div>
    ${sub ? `<div class="hn-sc-sub">${esc(sub)}</div>` : ''}
    ${buildMoodFaces(moodLevel)}
  </div>`;
}

// ── 症状カード ────────────────────────────────────────────

const SVG_SYMPTOM = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10" cy="7" r="3"/>
  <path d="M4 19v-1.5a6 6 0 0112 0V19"/>
</svg>`;

function buildSymptomCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];
  const recent4  = getRecentN(records, 4);

  // 頻出症状トップ2を集計
  const symCount = {};
  recent4.forEach(r => (r.symptoms || []).forEach(s => {
    symCount[s] = (symCount[s] || 0) + 1;
  }));

  let value, sub;
  if (symptoms.length >= 1) {
    value = symptoms.slice(0, 2).join('・');
    sub   = symptoms.length > 2 ? `他${symptoms.length - 2}件` : '今日の症状';
  } else if (rec) {
    value = 'なし';
    sub   = '症状なし';
  } else {
    value = '未記録';
    sub   = '';
  }

  // 週の症状有無バー（あり=1/なし=0）
  const recentVals = getRecentN(records, 4).reverse()
    .map(r => (r.symptoms || []).length > 0 ? 1 : 0);

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${SVG_SYMPTOM}</div>
    <div class="hn-sc-label">症状</div>
    <div class="hn-sc-value">${esc(value)}</div>
    ${sub ? `<div class="hn-sc-sub">${esc(sub)}</div>` : ''}
    ${buildSparkline(recentVals, '#C4946A')}
  </div>`;
}

// ── 食事カード ────────────────────────────────────────────

const SVG_FOOD_CARD = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.5 7h.75A3 3 0 0115.25 13H14.5"/>
  <path d="M2 7H14v6.5A3 3 0 0111 16.5H5A3 3 0 012 13.5V7z"/>
  <line x1="5"  y1="1.5" x2="5"  y2="4"/>
  <line x1="8"  y1="1.5" x2="8"  y2="4"/>
  <line x1="11" y1="1.5" x2="11" y2="4"/>
</svg>`;

function buildFoodCard(records) {
  const rec       = getTodayRecord(records) || getLatestRecord(records);
  const mealCount = rec?.mealCount ?? null;
  const recent4   = getRecentN(records, 4).reverse()
    .map(r => r.mealCount != null ? r.mealCount : 0);

  let value, sub;
  if (mealCount != null) {
    value = `${mealCount}食`;
    sub   = mealCount >= 3 ? 'バランス良し' : mealCount >= 2 ? '通常' : '少なめ';
  } else if (rec) {
    value = '未記録';
    sub   = '食事を記録して';
  } else {
    value = '未記録';
    sub   = '';
  }

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${SVG_FOOD_CARD}</div>
    <div class="hn-sc-label">食事</div>
    <div class="hn-sc-value">${esc(value)}</div>
    ${sub ? `<div class="hn-sc-sub">${esc(sub)}</div>` : ''}
    ${buildSparkline(recent4)}
  </div>`;
}

// ── 体温 / むくみ / エネルギーカード ─────────────────────

function buildTempOrEnergyCard(records, priorityKey) {
  const rec     = getTodayRecord(records) || getLatestRecord(records);
  const recent4 = getRecentN(records, 4);

  if (priorityKey === 'swelling') {
    const hasSwell = (rec?.symptoms || []).includes('むくみ');
    const values   = recent4.map(r => (r.symptoms || []).includes('むくみ') ? 1 : 0);
    return `<div class="hn-status-card">
      <div class="hn-sc-icon">${SVG_DIAMOND}</div>
      <div class="hn-sc-label">むくみ</div>
      <div class="hn-sc-value">${rec ? (hasSwell ? 'あり' : 'なし') : '未記録'}</div>
      <div class="hn-sc-sub">${rec ? (hasSwell ? '確認して' : '問題なし') : ''}</div>
      ${buildSparkline(values.reverse(), '#C4946A')}
    </div>`;
  }

  // 体温: temp フィールドがあれば数値表示
  const temp = rec?.temperature ?? rec?.temp ?? null;
  if (temp != null) {
    const recent4temps = recent4.map(r => r.temperature ?? r.temp ?? null).filter(v => v != null);
    return `<div class="hn-status-card">
      <div class="hn-sc-icon">${SVG_ENERGY}</div>
      <div class="hn-sc-label">体温</div>
      <div class="hn-sc-value hn-sc-value-num">${temp.toFixed(2)}<span style="font-size:9px;font-weight:400">℃</span></div>
      <div class="hn-sc-sub">いつも通り</div>
      ${buildSparkline(recent4temps.reverse())}
    </div>`;
  }

  // エネルギー / 倦怠感
  const hasFatigue = (rec?.symptoms || []).includes('倦怠感');
  const energyVals = recent4.map(r => {
    const e = r.energy ?? null;
    if (e != null) return e;
    return (r.symptoms || []).includes('倦怠感') ? 1 : 3;
  });

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${SVG_ENERGY}</div>
    <div class="hn-sc-label">エネルギー</div>
    <div class="hn-sc-value">${rec ? (hasFatigue ? 'だるさあり' : '問題なし') : '未記録'}</div>
    <div class="hn-sc-sub">${rec ? (hasFatigue ? '休息を' : '良い調子') : ''}</div>
    ${buildSparkline(energyVals.reverse())}
  </div>`;
}

// ── 週間ストリップ ────────────────────────────────────────
// PR-EXP-04 (Home Weekly Progress Migration, 2026-07-07): PHASE 1-B（2026-06-07,
// commit 29047a1「HOME画面情報密度削減」）で return '' により描画停止されていたが、
// GENERAL_RELEASE_EXPERIENCE_COUNCIL.md（絶対修正3件中の推奨修正）・
// PHASE2_GOVERNANCE.md（Home最大6ブロックの一員として明記）・
// PHASE2_ARCHITECTURE_FREEZE.md（Final Visionまで不変の骨格要素）・
// PHASE2_IMPLEMENTATION_COUNCIL.md（Phase2 hn-experiment-cardの前提条件）の
// 4件のLEVEL-1文書がいずれも週間行をHomeの恒久的構成要素として要求しており、
// 別途 docs/HOME_WEEK_ROW_REMOVAL_AUDIT.md の監査（判定: C. Migrate）を経て
// Founder承認により再有効化した。ロジック・見た目（レイアウト・配色・CSS）は
// PHASE 1-B以前の実装から一切変更していない（UI仕様変更なし）。
// レガシー版 src/modules/home-renderer.js の buildHomeWeekRow() は、home-next
// 無効時（disableHomeNext()）のフォールバック画面（screen-home）専用として
// 引き続き独立に存在し、本関数とは責務が完全に分離している（後述コメント参照）。

function buildWeekStrip(records) {
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dow      = today.getDay();
  const monday   = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));

  const labels = ['月', '火', '水', '木', '金', '土', '日'];
  let days = '';

  for (let i = 0; i < 7; i++) {
    const d       = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds      = d.toISOString().slice(0, 10);
    const isToday = ds === todayStr;
    const isFuture = ds > todayStr;
    const rec     = (records || []).find(r => (r.date || r.record_date || '').slice(0, 10) === ds);
    const hasRec  = !!rec;

    let cls = 'hn-week-dot';
    if (isToday && hasRec)  cls += ' is-today has-record';
    else if (isToday)       cls += ' is-today';
    else if (hasRec)        cls += ' has-record';
    else if (isFuture)      cls += ' future';

    const click = !isFuture
      ? ` onclick="if(typeof openDayDetailByDate==='function')openDayDetailByDate('${ds}')" style="cursor:pointer"`
      : '';

    days += `<div class="hn-week-day"${click}>
      <span class="hn-week-label${isToday ? ' today' : ''}">${labels[i]}</span>
      <div class="${cls}">${hasRec ? '✓' : (isToday ? '+' : '')}</div>
    </div>`;
  }

  return `<div class="hn-week-card hn-anim-3">
    <div class="hn-week-grid">${days}</div>
  </div>`;
}

// ── 疾患別カード共通ベース ────────────────────────────────

function buildDiseaseCard({ icon, label, value, sub, viz }) {
  return `<div class="hn-status-card">
    <div class="hn-sc-icon">${icon}</div>
    <div class="hn-sc-label">${esc(label)}</div>
    <div class="hn-sc-value">${esc(value)}</div>
    ${sub ? `<div class="hn-sc-sub">${esc(sub)}</div>` : ''}
    ${viz || ''}
  </div>`;
}

// ── 血糖安定度カード (PCOS) ───────────────────────────────

const SVG_GLYCEMIC = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2C10 2 5 6 5 11a5 5 0 0010 0c0-5-5-9-5-9z"/>
  <path d="M7 13c.5 1 1.5 1.5 3 1.5"/>
</svg>`;

function buildGlycemicCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];
  const energy   = rec?.energy  ?? null;
  const recent4  = getRecentN(records, 4);

  const instabilitySigns = ['食後の眠気', 'だるさ', '倦怠感', '午後の眠気'].filter(s => symptoms.includes(s)).length;

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (instabilitySigns >= 2 || (energy != null && energy <= 1)) {
    value = 'やや不安定'; sub = '食後に注意して';
  } else if (instabilitySigns === 1 || (energy != null && energy <= 3)) {
    value = '注意状態';   sub = 'からだの様子を見て';
  } else {
    value = '安定';       sub = '今日は良い状態';
  }

  const vals = recent4.reverse().map(r => {
    const s = (r.symptoms || []).filter(x => ['食後の眠気','だるさ','倦怠感'].includes(x)).length;
    return 3 - Math.min(s * 1.5, 2);
  });

  return buildDiseaseCard({ icon: SVG_GLYCEMIC, label: '血糖安定度', value, sub, viz: buildSparkline(vals, '#9DB095') });
}

// ── 排卵推定安定度カード (PCOS) ──────────────────────────

const SVG_OVULATION = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10" cy="10" r="5"/>
  <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" opacity="0.5"/>
  <path d="M10 3V1M10 19v-2M3 10H1M19 10h-2M5.22 5.22L3.81 3.81M16.19 16.19l-1.41-1.41M5.22 14.78l-1.41 1.41M16.19 3.81l-1.41 1.41"/>
</svg>`;

function buildOvulationEstCard(records, state) {
  const irregular  = state?.cycleIrregular;
  const cycleLen   = state?.cycleLength || 28;
  const lastPeriod = state?.lastPeriodDate;
  const recent4    = getRecentN(records, 4);

  const temps = recent4.map(r => r.temperature ?? r.temp ?? null).filter(v => v != null);
  const hasTemp = temps.length >= 2;

  let value, sub;
  if (irregular) { value = 'やや不安定'; sub = '周期が乱れやすい状態'; }
  else if (!lastPeriod) { value = '確認中'; sub = '生理日を記録して'; }
  else if (hasTemp) { value = '観察中'; sub = '体温を継続記録中'; }
  else { value = '推定安定'; sub = `周期${cycleLen}日`; }

  return buildDiseaseCard({
    icon: SVG_OVULATION, label: '排卵推定', value, sub,
    viz: buildSparkline(temps.length >= 2 ? temps.reverse() : [3, 3, 3, 3], '#B0C2A8'),
  });
}

// ── 炎症負荷カード (子宮内膜症・子宮腺筋症) ───────────────

const SVG_INFLAMMATION = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2c0 0-7 5-7 9.5a7 7 0 0014 0C17 7 10 2 10 2z"/>
  <path d="M7 12c.3 1.5 1.5 2.5 3 2.5"/>
</svg>`;

function buildInflammationCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const pain     = rec?.painLevel    ?? 0;
  const sleep    = rec?.sleepQuality ?? 0;
  const symptoms = rec?.symptoms     || [];
  const fatigue  = ['倦怠感', 'だるさ', '疲労感'].filter(s => symptoms.includes(s)).length;
  const recent4  = getRecentN(records, 4);

  const score = (pain >= 3 ? 2 : pain >= 1 ? 1 : 0) +
                (sleep >= 3 ? 1 : 0) +
                (fatigue >= 1 ? 1 : 0);

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (score >= 3) { value = 'やや高い'; sub = '今日は休息を優先して'; }
  else if (score >= 1) { value = '中程度';   sub = 'からだの様子を見て'; }
  else                 { value = '低い';      sub = '安定しています'; }

  const vals = recent4.reverse().map(r => {
    const p = r.painLevel    ?? 0;
    const s = r.sleepQuality ?? 0;
    const f = (r.symptoms || []).filter(x => ['倦怠感','だるさ','疲労感'].includes(x)).length;
    return 3 - Math.min((p >= 2 ? 1 : 0) + (s >= 3 ? 1 : 0) + (f >= 1 ? 1 : 0), 2);
  });

  return buildDiseaseCard({ icon: SVG_INFLAMMATION, label: '炎症負荷', value, sub, viz: buildSparkline(vals, '#C4946A') });
}

// ── 骨盤痛リスクカード (子宮内膜症) ─────────────────────

const SVG_PELVIS = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 12c0 0 1-4 6-4s6 4 6 4"/>
  <path d="M4 12c0 3 2.5 5 6 5s6-2 6-5"/>
  <path d="M10 8V5"/>
  <circle cx="10" cy="4" r="1.2" fill="currentColor" stroke="none"/>
</svg>`;

function buildPelvisPainCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const pain     = rec?.painLevel ?? null;
  const location = rec?.painLocation || [];
  const type     = rec?.painType || [];
  const hasPelvis = location.some(l => ['左下腹部','右下腹部','下腹部','骨盤'].includes(l));
  const recent4   = getRecentN(records, 4);

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (pain != null && pain >= 3 && hasPelvis) { value = '高い';   sub = '今日は無理せずに'; }
  else if (pain != null && pain >= 2)               { value = '中程度'; sub = '様子を観察して'; }
  else if (pain != null && pain >= 1)               { value = '低め';   sub = 'からだの声を聴いて'; }
  else                                               { value = '安定';   sub = '今日は落ち着いた状態'; }

  const dots = (rec && pain != null)
    ? buildDotScale(pain)
    : buildDotScale(null);

  return buildDiseaseCard({ icon: SVG_PELVIS, label: '骨盤痛リスク', value, sub, viz: dots });
}

// ── 疲労蓄積カード (複数疾患) ────────────────────────────

const SVG_FATIGUE = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 17V3"/>
  <path d="M6 7l4-4 4 4"/>
  <path d="M5 14h10"/>
  <path d="M7 17h6"/>
</svg>`;

function buildFatigueLevelCard(records) {
  const recent4  = getRecentN(records, 4);
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];

  const fatigueCount = recent4.filter(r =>
    (r.energy != null && r.energy <= 2) ||
    (r.symptoms || []).some(s => ['倦怠感', 'だるさ', '疲労感'].includes(s))
  ).length;

  let value, sub;
  if (!recent4.length) { value = '未記録'; sub = ''; }
  else if (fatigueCount >= 3) { value = '蓄積あり'; sub = '今日は回復を優先して'; }
  else if (fatigueCount >= 1) { value = 'やや蓄積'; sub = 'こまめに休んで'; }
  else                        { value = '回復中';   sub = '良い調子です'; }

  const vals = recent4.reverse().map(r => {
    const e = r.energy ?? null;
    const f = (r.symptoms || []).some(s => ['倦怠感','だるさ'].includes(s));
    if (e != null) return e;
    return f ? 1 : 4;
  });

  return buildDiseaseCard({ icon: SVG_FATIGUE, label: '疲労蓄積', value, sub, viz: buildSparkline(vals, '#B0A8C0') });
}

// ── 睡眠回復率カード (複数疾患) ────────────────────────────

function buildSleepRecoveryCard(records) {
  const recent4 = getRecentN(records, 4);
  const goodSleep = recent4.filter(r => (r.sleepQuality ?? 4) <= 1).length;
  const rec = getTodayRecord(records) || getLatestRecord(records);
  const q = rec?.sleepQuality ?? null;

  let value, sub;
  if (!recent4.length) { value = '未記録'; sub = ''; }
  else if (goodSleep >= 3) { value = '回復良好'; sub = '睡眠が整っています'; }
  else if (goodSleep >= 1) { value = '回復中';   sub = '引き続き睡眠を大切に'; }
  else                     { value = '不足気味'; sub = '睡眠が体に影響しています'; }

  return buildDiseaseCard({
    icon: SVG_SLEEP, label: '睡眠回復率', value, sub, viz: buildBarChart(records),
  });
}

// ── 下腹部張りスコアカード (卵巣嚢腫) ────────────────────

const SVG_TENSION = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="10" cy="12" rx="7" ry="5"/>
  <path d="M6 9c0-2 1.5-4 4-4s4 2 4 4"/>
  <path d="M10 5V3"/>
</svg>`;

function buildTensionCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];
  const pain     = rec?.painLevel ?? 0;
  const recent4  = getRecentN(records, 4);

  const tensionSigns = ['腹部膨満', 'むくみ', 'お腹の張り', '下腹部の張り'].filter(s => symptoms.includes(s)).length;
  const hasPelvisPain = (rec?.painLocation || []).some(l => ['下腹部','左下腹部','右下腹部'].includes(l));

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (tensionSigns >= 2 || (pain >= 2 && hasPelvisPain)) { value = '張りあり'; sub = '無理しないで'; }
  else if (tensionSigns === 1 || (pain >= 1 && hasPelvisPain)){ value = 'やや張り'; sub = '様子を観察して'; }
  else { value = '問題なし'; sub = '今日は安定'; }

  const vals = recent4.reverse().map(r => {
    const t = (r.symptoms || []).filter(x => ['腹部膨満','むくみ','お腹の張り'].includes(x)).length;
    return 3 - Math.min(t, 2);
  });

  return buildDiseaseCard({ icon: SVG_TENSION, label: '下腹部張り', value, sub, viz: buildSparkline(vals, '#C4946A') });
}

// ── 腹部圧迫感カード (卵巣嚢腫) ──────────────────────────

const SVG_PRESSURE = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 4C6 4 3 7 3 10.5S6 17 10 17s7-3 7-6.5S14 4 10 4z"/>
  <path d="M10 8v2l1.5 1.5"/>
</svg>`;

function buildPressureSenseCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];
  const dc       = rec?.diseaseCheck || {};
  const bloating = dc['卵巣嚢腫__bloating'] || '';
  const abdom    = dc['卵巣嚢腫__abdom_pain'] || '';

  const heavyBloating = ['中程度','つらい'].includes(bloating);
  const heavyAbdom    = ['中程度','つらい'].includes(abdom);
  const pressureSigns = ['腹部膨満', '圧迫感', '頻尿'].filter(s => symptoms.includes(s)).length;

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (heavyBloating || heavyAbdom || pressureSigns >= 2) { value = '圧迫感あり'; sub = '無理しないで'; }
  else if (pressureSigns === 1) { value = 'やや感じる'; sub = '様子を観察して'; }
  else { value = '問題なし'; sub = '今日は安定'; }

  return buildDiseaseCard({
    icon: SVG_PRESSURE, label: '腹部圧迫感', value, sub,
    viz: buildSparkline([2,2,2,2], '#B0C2A8'),
  });
}

// ── 情緒安定度カード (PMS/PMDD) ──────────────────────────

const SVG_EMOTIONAL = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10" cy="10" r="7.5"/>
  <path d="M7 13c.7.9 1.8 1.5 3 1.5s2.3-.6 3-1.5"/>
  <path d="M7 7.5c.5-.5 1-.5 1.5 0M11.5 7.5c.5-.5 1-.5 1.5 0"/>
</svg>`;

function buildEmotionalCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const mood     = rec?.mood ?? null;
  const symptoms = rec?.symptoms || [];
  const recent4  = getRecentN(records, 4);

  const moodSymptoms = ['気分の落ち込み', 'イライラ', '不安感', '情緒不安定'].filter(s => symptoms.includes(s)).length;

  let value, sub, level;
  if (!rec) { value = '未記録'; sub = ''; level = null; }
  else if (mood != null && mood <= 1 || moodSymptoms >= 2) { value = '不安定';   sub = '自分を責めないで'; level = 0; }
  else if (mood != null && mood <= 2 || moodSymptoms === 1){ value = 'やや波あり'; sub = 'からだのサインです'; level = 2; }
  else { value = '安定';     sub = '今日は落ち着いた状態'; level = 4; }

  return buildDiseaseCard({
    icon: SVG_EMOTIONAL, label: '情緒安定度', value, sub,
    viz: level != null ? buildMoodFaces(level) : '',
  });
}

// ── 刺激感受性カード (PMS/PMDD) ──────────────────────────

const SVG_SENSITIVITY = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2l2 5h5l-4 3 1.5 5L10 12l-4.5 3L7 10 3 7h5z"/>
</svg>`;

function buildSensitivityCard(records, state) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];

  const sensitivitySigns = ['イライラ', '不安感', '過敏', '感情的になりやすい'].filter(s => symptoms.includes(s)).length;
  const mood = rec?.mood ?? null;

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (sensitivitySigns >= 2 || (mood != null && mood <= 1)) { value = '高い';   sub = '刺激を避けて過ごして'; }
  else if (sensitivitySigns === 1 || (mood != null && mood <= 2)){ value = 'やや高め'; sub = '自分のペースで'; }
  else { value = '安定';   sub = '今日は穏やかな状態'; }

  const recent4 = getRecentN(records, 4);
  const vals = recent4.reverse().map(r => {
    const s = (r.symptoms || []).filter(x => ['イライラ','不安感','過敏'].includes(x)).length;
    return 3 - Math.min(s, 2);
  });

  return buildDiseaseCard({ icon: SVG_SENSITIVITY, label: '刺激感受性', value, sub, viz: buildSparkline(vals, '#7A9BB0') });
}

// ── イライラ傾向カード (PMS/PMDD) ─────────────────────────

function buildIrritabilityCard(records) {
  const recent7 = getRecentN(records, 7);
  const irriDays = recent7.filter(r =>
    (r.symptoms || []).some(s => ['イライラ','怒り','感情的'].includes(s))
  ).length;
  const rec = getTodayRecord(records) || getLatestRecord(records);

  let value, sub;
  if (!recent7.length) { value = '未記録'; sub = ''; }
  else if (irriDays >= 4) { value = '多め';  sub = '周期的なパターンかも'; }
  else if (irriDays >= 2) { value = 'やや多い'; sub = 'からだのサインです'; }
  else                    { value = '少ない'; sub = '今週は落ち着いています'; }

  const vals = recent7.reverse().map(r =>
    (r.symptoms || []).some(s => ['イライラ','怒り'].includes(s)) ? 1 : 0
  );

  return buildDiseaseCard({
    icon: SVG_MOOD, label: 'イライラ傾向', value, sub, viz: buildSparkline(vals, '#A08AB0'),
  });
}

// ── 出血負荷カード (子宮筋腫・子宮腺筋症) ────────────────

const SVG_BLEEDING = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2C10 2 5 8 5 12a5 5 0 0010 0C15 8 10 2 10 2z"/>
</svg>`;

function buildBleedingLoadCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const flow     = rec?.menstrualCycle || 'none';
  const recent4  = getRecentN(records, 4);

  const flowScore = { none: 0, spotting: 1, light: 1, normal: 2, heavy: 3, very_heavy: 4 };
  const score     = flowScore[flow] ?? 0;

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (score >= 3)  { value = '多め';   sub = '鉄分に注意して'; }
  else if (score >= 2)  { value = '普通量'; sub = '様子を観察して'; }
  else if (score >= 1)  { value: '少なめ'; value = '少なめ'; sub = '変化があれば記録して'; }
  else                  { value = '生理外'; sub = ''; }

  const vals = recent4.reverse().map(r => flowScore[r.menstrualCycle || 'none'] ?? 0);

  return buildDiseaseCard({ icon: SVG_BLEEDING, label: '出血負荷', value, sub, viz: buildSparkline(vals, '#C07080') });
}

// ── 鉄不足リスクカード (子宮筋腫) ────────────────────────

const SVG_IRON = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="10" cy="10" r="7.5"/>
  <path d="M10 6v4l3 2"/>
  <path d="M7 10h.5"/>
</svg>`;

function buildIronRiskCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];
  const flow     = rec?.menstrualCycle || 'none';
  const recent4  = getRecentN(records, 4);

  const ironSymptoms = ['めまい', '頭痛', '倦怠感', 'だるさ', '動悸'].filter(s => symptoms.includes(s)).length;
  const heavyFlow = ['heavy', 'very_heavy'].includes(flow);

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if ((ironSymptoms >= 2 && heavyFlow) || ironSymptoms >= 3) { value = 'リスク高め'; sub = '鉄分・休息を意識して'; }
  else if (ironSymptoms >= 1 || heavyFlow) { value = 'やや注意'; sub = '食事で鉄分を補って'; }
  else { value = '問題なし'; sub = '今日は安定'; }

  const vals = recent4.reverse().map(r => {
    const s = (r.symptoms || []).filter(x => ['めまい','頭痛','倦怠感'].includes(x)).length;
    return Math.min(s, 3);
  });

  return buildDiseaseCard({ icon: SVG_IRON, label: '鉄不足リスク', value, sub, viz: buildSparkline(vals, '#C4946A') });
}

// ── 冷え傾向カード (子宮筋腫) ────────────────────────────

const SVG_COLD = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2v16M2 10h16M4.93 4.93l10.14 10.14M15.07 4.93L4.93 15.07"/>
  <circle cx="10" cy="10" r="2" fill="currentColor" stroke="none" opacity="0.4"/>
</svg>`;

function buildColdnessCard(records) {
  const rec      = getTodayRecord(records) || getLatestRecord(records);
  const symptoms = rec?.symptoms || [];
  const recent4  = getRecentN(records, 4);

  const coldSigns  = ['冷え', '手足の冷え', '冷え性'].filter(s => symptoms.includes(s)).length;
  const temp       = rec?.temperature ?? null;

  let value, sub;
  if (!rec) { value = '未記録'; sub = ''; }
  else if (coldSigns >= 1)                    { value = '冷えあり'; sub = '温めることを意識して'; }
  else if (temp != null && temp < 36.0)       { value = '低め';    sub = '温活を意識して'; }
  else                                         { value = '問題なし'; sub = '今日は安定'; }

  const vals = recent4.reverse().map(r => {
    const c = (r.symptoms || []).some(s => ['冷え','手足の冷え'].includes(s));
    const t = r.temperature ?? null;
    if (c) return 1;
    if (t != null && t < 36.0) return 1.5;
    return 3;
  });

  return buildDiseaseCard({ icon: SVG_COLD, label: '冷え傾向', value, sub, viz: buildSparkline(vals, '#9BB0C2') });
}

// ── メインレンダリング ────────────────────────────────────

import { getStatusCardKeys } from './home-next-config.js';

export function renderStatusCards(container, config, state) {
  const records  = state.records || [];
  const priority = getStatusCardKeys(config);

  const cards = priority.slice(0, 4).map(key => {
    switch (key) {
      case 'sleep':          return buildSleepCard(records);
      case 'pain':           return buildPainCard(records);
      case 'mood':           return buildMoodCard(records);
      case 'symptom':        return buildSymptomCard(records);
      case 'food':           return buildFoodCard(records);
      case 'swelling':       return buildTempOrEnergyCard(records, 'swelling');
      // 疾患別カード
      case 'glycemic':       return buildGlycemicCard(records);
      case 'ovulation_est':  return buildOvulationEstCard(records, state);
      case 'inflammation':   return buildInflammationCard(records);
      case 'pelvis_pain':    return buildPelvisPainCard(records);
      case 'fatigue_level':  return buildFatigueLevelCard(records);
      case 'sleep_recovery': return buildSleepRecoveryCard(records);
      case 'tension':        return buildTensionCard(records);
      case 'pressure_sense': return buildPressureSenseCard(records);
      case 'emotional':      return buildEmotionalCard(records);
      case 'sensitivity':    return buildSensitivityCard(records, state);
      case 'irritability':   return buildIrritabilityCard(records);
      case 'bleeding_load':  return buildBleedingLoadCard(records);
      case 'iron_risk':      return buildIronRiskCard(records);
      case 'coldness':       return buildColdnessCard(records);
      default:               return buildTempOrEnergyCard(records, key);
    }
  }).join('');

  container.innerHTML = `
    <div class="hn-anim-2">
      <div class="hn-section-row">
        <span class="hn-section-title">あなたの状態</span>
        <span class="hn-section-edit" onclick="if(typeof window.openRecordScreen==='function')window.openRecordScreen();else if(typeof window.switchTab==='function')window.switchTab('record',null)">編集</span>
      </div>
      <div class="hn-sc-row">${cards}</div>
    </div>
    ${buildWeekStrip(records)}`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
