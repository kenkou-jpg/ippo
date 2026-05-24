// ============================================================
//  ippo – home-next-quick-record.js v3
//  クイック記録: SVG細線アイコン6種 + トレンド一行 + 記録CTA
// ============================================================

// ── SVG アイコン定義 (1.4px stroke / stroke-linecap round) ──

const ICON_PERIOD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 4C12 4 6.5 10.5 6.5 14.5a5.5 5.5 0 0011 0C17.5 10.5 12 4 12 4z"/>
</svg>`;

const ICON_MOOD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
  <circle cx="12" cy="12" r="9"/>
  <path d="M8.5 15c.8 1.2 2 1.8 3.5 1.8s2.7-.6 3.5-1.8"/>
  <circle cx="9.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/>
  <circle cx="14.5" cy="10.5" r=".9" fill="currentColor" stroke="none"/>
</svg>`;

const ICON_SYMPTOM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="6" r="3.5"/>
  <path d="M5 21v-2a7 7 0 0114 0v2"/>
</svg>`;

const ICON_FOOD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8h1a4 4 0 010 8h-1"/>
  <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
  <line x1="6" y1="1" x2="6" y2="4"/>
  <line x1="10" y1="1" x2="10" y2="4"/>
  <line x1="14" y1="1" x2="14" y2="4"/>
</svg>`;

const ICON_TEMP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z"/>
</svg>`;

const ICON_NOTE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 20h9"/>
  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
</svg>`;

// ── クイック記録ボタン定義 ────────────────────────────────

const QUICK_ITEMS = [
  { icon: ICON_PERIOD,  label: '生理',  bg: '#F5EAEA', target: 'period'  },
  { icon: ICON_MOOD,    label: '気分',  bg: '#EEF3EB', target: 'mood'    },
  { icon: ICON_SYMPTOM, label: '症状',  bg: '#F5EDE3', target: 'symptom' },
  { icon: ICON_FOOD,    label: '食事',  bg: '#EEF3EB', target: 'food'    },
  { icon: ICON_TEMP,    label: '体温',  bg: '#F2EDE6', target: 'temp'    },
  { icon: ICON_NOTE,    label: 'メモ',  bg: '#EEF3EB', target: 'note'    },
];

// ── 今日の記録状態 ────────────────────────────────────────

function getTodayRecord(records) {
  const today = new Date().toISOString().slice(0, 10);
  return (records || []).find(r =>
    (r.date || r.record_date || '').slice(0, 10) === today
  ) || null;
}

// ── トレンド一行テキスト ──────────────────────────────────

function getTrendText(state) {
  const records  = state.records || [];
  const diseases = state.myDiseases || [];

  if (records.length < 3) return '';

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const week = records.filter(r => new Date(r.date || r.record_date || '') >= cutoff);

  const poorSleepPain = week.filter(r =>
    (r.sleepQuality ?? 0) >= 3 && (r.painLevel ?? 0) >= 2
  );
  if (poorSleepPain.length >= 2) {
    return '睡眠不足の翌日は、体調が崩れやすい傾向があります';
  }

  const symCount = {};
  week.forEach(r => (r.symptoms || []).forEach(s => {
    symCount[s] = (symCount[s] || 0) + 1;
  }));
  const top = Object.entries(symCount).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3) {
    return `今週「${top[0]}」が${top[1]}日続いています`;
  }

  if (diseases.includes('子宮内膜症') || diseases.includes('子宮腺筋症')) {
    return '生理開始後は、下腹部の張りが強くなりやすい傾向があります';
  }
  if (diseases.includes('PCOS')) {
    return '食事と睡眠の記録を続けると、体調パターンが見えてきます';
  }
  if (diseases.includes('PMS/PMDD')) {
    return '生理前の気分の波は、周期の一部かもしれません';
  }

  return '';
}

// ── ミニ折れ線チャート ────────────────────────────────────

function buildTrendMiniChart(records) {
  const recent = [...(records || [])]
    .sort((a, b) => new Date(a.date || a.record_date) - new Date(b.date || b.record_date))
    .slice(-5);

  if (recent.length < 2) {
    return `<svg class="hn-quick-trend-chart" viewBox="0 0 52 24">
      <line x1="0" y1="12" x2="52" y2="12" stroke="#C8D8BE" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.5"/>
    </svg>`;
  }

  const vals = recent.map(r => r.painLevel ?? 0);
  const max  = Math.max(...vals, 1);
  const w = 52, h = 20;
  const step = w / (vals.length - 1);

  const points = vals.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `<svg class="hn-quick-trend-chart" viewBox="0 0 52 24">
    <polyline points="${points}" stroke="#B8CAA8" stroke-width="1.5" fill="none"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ── アイコングリッドHTML ──────────────────────────────────

function buildQuickGrid() {
  return QUICK_ITEMS.map(item => {
    const openRecord = `window.__ippoQuickRecordTarget='${item.target}';if(typeof openRecordScreen==='function'){openRecordScreen();}`;
    return `
    <div class="hn-quick-item" onclick="${openRecord}">
      <div class="hn-quick-icon-wrap" style="background:${item.bg}">${item.icon}</div>
      <div class="hn-quick-name">${item.label}</div>
    </div>`;
  }).join('');
}

// ── メインレンダリング ────────────────────────────────────

export function renderQuickRecord(container, state) {
  const records   = state.records || [];
  const todayRec  = getTodayRecord(records);
  const trendText = getTrendText(state);
  const isDone    = !!todayRec;

  const openRecord = `if(typeof handleHomeCTA==='function'){handleHomeCTA();}else if(typeof openRecordScreen==='function'){openRecordScreen();}`;

  const trendRow = trendText ? `
    <div class="hn-quick-trend" onclick="${openRecord}" style="cursor:pointer">
      <div class="hn-quick-trend-text">${esc(trendText)}</div>
      ${buildTrendMiniChart(records)}
    </div>` : '';

  container.innerHTML = `
    <div class="hn-quick-card hn-anim-5">
      <div class="hn-quick-title">クイック記録</div>
      <div class="hn-quick-row">${buildQuickGrid()}</div>
      ${trendRow}
    </div>

    ${isDone
      ? `<div class="hn-record-done hn-anim-5" onclick="${openRecord}" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(157,176,149,0.10);border-radius:14px;margin-bottom:8px;">
          <span style="font-size:15px;color:#9DB095;">✓</span>
          <div>
            <div style="font-family:'Noto Sans JP',sans-serif;font-size:13px;font-weight:500;color:#9DB095;">今日の記録完了</div>
            <div style="font-size:11px;color:#AFA298;margin-top:1px;">内容を確認・編集できます</div>
          </div>
          <span style="margin-left:auto;color:#AFA298;font-size:16px;">›</span>
        </div>`
      : `<div class="hn-record-cta hn-anim-5" onclick="${openRecord}" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:13px 16px;background:#FFFFFF;border:1px solid #EEE9E4;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,0.035);margin-bottom:8px;">
          <div style="width:32px;height:32px;border-radius:10px;background:#EEF3EB;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">+</div>
          <div>
            <div style="font-family:'Noto Sans JP',sans-serif;font-size:13px;font-weight:500;color:#2A2320;">今日を記録する</div>
            <div style="font-size:11px;color:#AFA298;margin-top:1px;">今日はまだ記録していません</div>
          </div>
          <span style="margin-left:auto;color:#AFA298;font-size:16px;">›</span>
        </div>`
    }`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
