// ============================================================
//  ippo – home-next-status.js v2
//  状態カード: 横4列 + ミニ可視化 (棒グラフ/ドット/絵文字行/スパークライン)
// ============================================================

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
// sleepQuality: 0=最良, 4=最悪 → 高さに変換 (0→100%, 4→20%)

function buildBarChart(records) {
  const recent = getRecentN(records, 4);
  // 古い順に並べる
  const ordered = [...recent].reverse();
  const bars = (ordered.length === 0)
    ? [40, 60, 55, 50]
    : ordered.map(r => {
        const q = r.sleepQuality ?? 2;
        return Math.max(20, 100 - q * 20); // 0→100%, 4→20%
      });

  // 今日のバーを今色にする
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = ordered.findIndex(r => (r.date || r.record_date || '').slice(0, 10) === todayStr);

  return `<div class="hn-sc-bars">
    ${bars.map((h, i) => `<div class="hn-sc-bar${i === todayIdx || (todayIdx === -1 && i === bars.length - 1) ? ' today' : ''}" style="height:${h}%"></div>`).join('')}
  </div>`;
}

// ── ドットスケール (痛み) ─────────────────────────────────
// painLevel 0-4、ドット5個

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

// ── 気分 絵文字行 ─────────────────────────────────────────
// moodLevel 0=😢, 1=😕, 2=😐, 3=🙂, 4=😊
// 記録なし → 全フェード

function buildMoodRow(moodLevel) {
  const emojis = ['😢', '😕', '😐', '🙂', '😊'];
  return `<div class="hn-mood-row">
    ${emojis.map((e, i) =>
      `<span class="${i === moodLevel ? 'active' : ''}">${e}</span>`
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
  const today  = getTodayRecord(records) || getLatestRecord(records);
  const q      = today?.sleepQuality ?? null;

  const labels  = ['よく眠れた', 'まあまあ', 'やや浅い', '浅かった', '眠れなかった'];
  const subLabels = ['質: 良い', '質: 普通', '質: やや不足', '質: 不足', '質: 不足'];

  const value = q != null ? labels[Math.min(q, 4)] : '未記録';
  const sub   = q != null ? subLabels[Math.min(q, 4)] : '記録してみて';

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">🌙</div>
    <div class="hn-sc-label">睡眠</div>
    <div class="hn-sc-value">${value}</div>
    <div class="hn-sc-sub">${sub}</div>
    ${buildBarChart(records)}
  </div>`;
}

// ── 痛み・不調カード ──────────────────────────────────────

function buildPainCard(records) {
  const today = getTodayRecord(records) || getLatestRecord(records);
  const pain  = today?.painLevel ?? null;

  // 症状チップから主な症状を取得
  const symptoms = today?.symptoms || [];
  const painSymptoms = symptoms.filter(s =>
    ['下腹部痛', '腰痛', '頭痛', '倦怠感', '吐き気'].includes(s)
  );

  const painLabels = ['痛みなし', '軽い痛み', '中程度', '強い', 'とても強い'];
  const subLabels  = ['安定', '気になる', 'やや強い', '強い', 'つらい'];

  let value, sub;
  if (pain != null) {
    value = painSymptoms.length ? painSymptoms.slice(0, 2).join('・') : painLabels[Math.min(pain, 4)];
    sub   = subLabels[Math.min(pain, 4)];
  } else {
    value = '未記録';
    sub   = '今日の記録を';
  }

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">◎</div>
    <div class="hn-sc-label">痛み・不調</div>
    <div class="hn-sc-value">${esc(value)}</div>
    <div class="hn-sc-sub">${esc(sub)}</div>
    ${buildDotScale(pain)}
  </div>`;
}

// ── 気分カード ────────────────────────────────────────────

function buildMoodCard(records) {
  const today    = getTodayRecord(records) || getLatestRecord(records);
  const mood     = today?.mood ?? null;
  const symptoms = today?.symptoms || [];

  // 症状から気分を推定
  let moodLevel = mood;
  if (moodLevel == null) {
    const bad = ['気分の落ち込み', 'イライラ', '不安感'].filter(s => symptoms.includes(s)).length;
    if (bad >= 2) moodLevel = 1;
    else if (bad === 1) moodLevel = 2;
    else if (symptoms.length > 0) moodLevel = 2; // 記録あり、症状なし → まあまあ
  }

  const moodLabels = ['落ち込み', '不安定', '普通', '穏やか', '良好'];
  const subLabels  = ['つらい日', '少し波あり', 'まあまあ', 'やや穏やか', '良い調子'];

  const value = moodLevel != null ? moodLabels[Math.min(moodLevel, 4)] : '未記録';
  const sub   = moodLevel != null ? subLabels[Math.min(moodLevel, 4)] : '記録してみて';

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">♡</div>
    <div class="hn-sc-label">気分</div>
    <div class="hn-sc-value">${esc(value)}</div>
    <div class="hn-sc-sub">${esc(sub)}</div>
    ${buildMoodRow(moodLevel)}
  </div>`;
}

// ── 体温 / 倦怠感カード ───────────────────────────────────

function buildTempOrEnergyCard(records, priorityKey) {
  const today   = getTodayRecord(records) || getLatestRecord(records);
  const recent4 = getRecentN(records, 4);

  if (priorityKey === 'swelling') {
    const hasSwell = (today?.symptoms || []).includes('むくみ');
    const values   = recent4.map(r => (r.symptoms || []).includes('むくみ') ? 1 : 0);
    return `<div class="hn-status-card">
      <div class="hn-sc-icon">◇</div>
      <div class="hn-sc-label">むくみ</div>
      <div class="hn-sc-value">${today ? (hasSwell ? 'あり' : 'なし') : '未記録'}</div>
      <div class="hn-sc-sub">${today ? (hasSwell ? '確認して' : '問題なし') : '記録してみて'}</div>
      ${buildSparkline(values.reverse(), '#C4946A')}
    </div>`;
  }

  // エネルギー / 倦怠感
  const hasFatigue = (today?.symptoms || []).includes('倦怠感');
  const energyVals = recent4.map(r => {
    const f = (r.symptoms || []).includes('倦怠感');
    const e = r.energy ?? null;
    if (e != null) return e;
    return f ? 1 : 3;
  });

  const value = today ? (hasFatigue ? 'だるさあり' : '問題なし') : '未記録';
  const sub   = today ? (hasFatigue ? '休息を' : '良い調子') : '記録してみて';

  return `<div class="hn-status-card">
    <div class="hn-sc-icon">⚡</div>
    <div class="hn-sc-label">エネルギー</div>
    <div class="hn-sc-value">${esc(value)}</div>
    <div class="hn-sc-sub">${esc(sub)}</div>
    ${buildSparkline(energyVals.reverse())}
  </div>`;
}

// ── 週間ストリップ ────────────────────────────────────────

function buildWeekStrip(records) {
  const today     = new Date();
  const todayStr  = today.toISOString().slice(0, 10);
  const dow       = today.getDay();
  const monday    = new Date(today);
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
    if (isToday && hasRec)     cls += ' is-today has-record';
    else if (isToday)          cls += ' is-today';
    else if (hasRec)           cls += ' has-record';
    else if (isFuture)         cls += ' future';

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

  // 4枚選択
  const four = priority.slice(0, 4);

  const cards = four.map(key => {
    switch (key) {
      case 'sleep':   return buildSleepCard(records);
      case 'pain':    return buildPainCard(records);
      case 'mood':    return buildMoodCard(records);
      case 'swelling':return buildTempOrEnergyCard(records, 'swelling');
      default:        return buildTempOrEnergyCard(records, key);
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
