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

// ── メインレンダリング ────────────────────────────────────

export function renderStatusCards(container, config, state) {
  const records  = state.records || [];
  const priority = config.priorityCards || ['sleep', 'pain', 'mood', 'symptom'];

  const cards = priority.slice(0, 4).map(key => {
    switch (key) {
      case 'sleep':    return buildSleepCard(records);
      case 'pain':     return buildPainCard(records);
      case 'mood':     return buildMoodCard(records);
      case 'swelling': return buildTempOrEnergyCard(records, 'swelling');
      default:         return buildTempOrEnergyCard(records, key);
    }
  }).join('');

  container.innerHTML = `
    <div class="hn-anim-2">
      <div class="hn-section-row">
        <span class="hn-section-title">あなたの状態</span>
        <span class="hn-section-edit" onclick="if(typeof window.switchTab==='function')window.switchTab('record',null)">編集</span>
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
