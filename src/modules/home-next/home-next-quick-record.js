// ============================================================
//  ippo – home-next-quick-record.js v2
//  クイック記録: アイコングリッド6種 + トレンド一行 + 記録CTA
//  HOMEの主役にしない。最下部の静かな導線として機能させる。
// ============================================================

// ── クイック記録ボタン定義 ────────────────────────────────

const QUICK_ITEMS = [
  { icon: '⚡', label: '痛み・\n不調' },
  { icon: '☁', label: '気分' },
  { icon: '🌙', label: '睡眠' },
  { icon: '🍃', label: '食事' },
  { icon: '◎', label: '体温' },
  { icon: '✎', label: 'メモ' },
];

// ── 今日の記録状態 ────────────────────────────────────────

function getTodayRecord(records) {
  const today = new Date().toISOString().slice(0, 10);
  return (records || []).find(r =>
    (r.date || r.record_date || '').slice(0, 10) === today
  ) || null;
}

// ── トレンド一行テキスト ──────────────────────────────────
// インサイトの中で最もシンプルなものを1行で

function getTrendText(state) {
  const records = state.records || [];
  const diseases = state.myDiseases || [];

  if (records.length < 3) return '';

  // 直近7日
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const week = records.filter(r => new Date(r.date || r.record_date || '') >= cutoff);

  // 睡眠不足×痛みパターン
  const poorSleepPain = week.filter(r =>
    (r.sleepQuality ?? 0) >= 3 && (r.painLevel ?? 0) >= 2
  );
  if (poorSleepPain.length >= 2) {
    return '睡眠不足の翌日は、体調が崩れやすい傾向があります';
  }

  // 繰り返し症状
  const symCount = {};
  week.forEach(r => (r.symptoms || []).forEach(s => {
    symCount[s] = (symCount[s] || 0) + 1;
  }));
  const top = Object.entries(symCount).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3) {
    return `今週「${top[0]}」が${top[1]}日続いています`;
  }

  // 疾患別ヒント
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

// ── ミニ折れ線チャート (トレンド行右側) ──────────────────

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
  const openRecord = `if(typeof handleHomeCTA==='function'){handleHomeCTA();}else if(typeof openRecordScreen==='function'){openRecordScreen();}`;

  return QUICK_ITEMS.map(item => `
    <div class="hn-quick-item" onclick="${openRecord}">
      <div class="hn-quick-icon-wrap">${item.icon}</div>
      <div class="hn-quick-name">${item.label.replace(/\n/g, '<br>')}</div>
    </div>`).join('');
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
      : `<div class="hn-record-cta hn-anim-5" onclick="${openRecord}" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:13px 16px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.065);border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,0.035);margin-bottom:8px;">
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
