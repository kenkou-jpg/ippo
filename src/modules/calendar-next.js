// ============================================================
//  ippo – src/modules/calendar-next.js
//  パターンA: やさしく見渡せるカレンダー
//  月の満ち欠け・旧暦・周期フェーズを表示するカレンダー
// ============================================================

import { getState } from '../store/state.js';
import { renderSharedHeader } from './shared-header.js';

// ─── 月の満ち欠け ────────────────────────────────────────────

function toJD(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

// 月齢（0 = 新月、~14.77 = 満月）
function getMoonAge(year, month, day) {
  const jd = toJD(year, month, day);
  const knownNewMoon = 2451550.09765; // 2000-01-06.5 JD
  const synodic = 29.530588861;
  return ((jd - knownNewMoon) % synodic + synodic) % synodic;
}

function getMoonPhaseType(age) {
  const n = age / 29.530588861;
  if (n < 0.0625 || n >= 0.9375) return 'new';
  if (n < 0.1875) return 'waxing-crescent';
  if (n < 0.3125) return 'first-quarter';
  if (n < 0.4375) return 'waxing-gibbous';
  if (n < 0.5625) return 'full';
  if (n < 0.6875) return 'waning-gibbous';
  if (n < 0.8125) return 'last-quarter';
  return 'waning-crescent';
}

function getMoonPhaseName(age) {
  const names = {
    'new':            '新月',
    'waxing-crescent':'三日月',
    'first-quarter':  '上弦の月',
    'waxing-gibbous': '十三夜',
    'full':           '満月',
    'waning-gibbous': '十六夜',
    'last-quarter':   '下弦の月',
    'waning-crescent':'二十七夜',
  };
  return names[getMoonPhaseType(age)] || '';
}

// ─── 月相グラデーションスプライト（bodyに一度だけ注入） ──────────────────
// userSpaceOnUse: 24×24 viewBox 座標系。光源は左上 (7,6) 固定。
// editorial/matte トーン: ippo カラーパレット準拠。
const MOON_SPRITE_ID = 'cn-moon-sprite';

function _ensureMoonSprite() {
  if (document.getElementById(MOON_SPRITE_ID)) return;
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.id = MOON_SPRITE_ID;
  el.setAttribute('width', '0');
  el.setAttribute('height', '0');
  el.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  el.innerHTML = `<defs>
    <!-- 暗側ベース球体: かすかな球体感を保つ深みある暗褐色 -->
    <radialGradient id="ipm-dark" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#5B4638"/>
      <stop offset="40%"  stop-color="#3A2F28"/>
      <stop offset="80%"  stop-color="#2A211A"/>
      <stop offset="100%" stop-color="#1E1610"/>
    </radialGradient>
    <!-- 満月: 温かいクリーム〜深みあるタン、マット仕上げ -->
    <radialGradient id="ipm-full" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#F0E6CE"/>
      <stop offset="22%"  stop-color="#E9D8B8"/>
      <stop offset="50%"  stop-color="#D4BC92"/>
      <stop offset="76%"  stop-color="#BEA276"/>
      <stop offset="100%" stop-color="#AE9262"/>
    </radialGradient>
    <!-- 三日月〜細い月 -->
    <radialGradient id="ipm-crescent" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#DCCFB2"/>
      <stop offset="28%"  stop-color="#C9B39D"/>
      <stop offset="60%"  stop-color="#B09278"/>
      <stop offset="100%" stop-color="#987C5C"/>
    </radialGradient>
    <!-- 上弦・下弦付近 -->
    <radialGradient id="ipm-quarter" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#E6D9BE"/>
      <stop offset="28%"  stop-color="#D8C4A6"/>
      <stop offset="60%"  stop-color="#C2A682"/>
      <stop offset="100%" stop-color="#AC8E68"/>
    </radialGradient>
    <!-- 十三夜・十六夜 (大きい月) -->
    <radialGradient id="ipm-gibbous" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#EBE0C6"/>
      <stop offset="24%"  stop-color="#E2CFA4"/>
      <stop offset="54%"  stop-color="#CAAD80"/>
      <stop offset="84%"  stop-color="#B8966A"/>
      <stop offset="100%" stop-color="#AA8860"/>
    </radialGradient>
  </defs>`;
  document.body.insertBefore(el, document.body.firstChild);
}

// ─── 月相SVG 連続生成（数学的位相補間） ─────────────────────────────────
//
// 光源: 左上固定（グラデーション origin cx=7, cy=6）
// 構造: ベース暗円 + 照明パス + テクスチャ（クレーター・ハイライト）
//
// アーク法則（illumination = (1 - cos(φ)) / 2）:
//   外弧: waxing→右半円(sweep=1) / waning→左半円(sweep=0)
//   終端弧: 三日月系→同方向(sweep=1) / 大月系→逆方向(sweep=0)
//   判定式: termSweep = (waxing === (cosΦ > 0)) ? 1 : 0

function getMoonSVG(age) {
  _ensureMoonSprite();

  const synodic = 29.530588861;
  const phase   = ((age % synodic) + synodic) % synodic / synodic; // 0–1
  const phi     = phase * 2 * Math.PI;
  const cosΦ    = Math.cos(phi);
  const illum   = (1 - cosΦ) / 2; // 0=新月, 1=満月

  // 共通テクスチャ要素（光源左上、opacity 3–5%）
  const HL  = 'rgba(255,255,255,0.12)'; // ハイライト（極薄）
  const C1  = 'rgba(60,40,28,0.05)';   // クレーター暗
  const C2  = 'rgba(60,40,28,0.04)';   // クレーター極薄

  // ── 新月（照明面積 < 1.5%） ──────────────────────────────────────────
  if (illum < 0.015) {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="url(#ipm-dark)"/><ellipse cx="8.5" cy="8" rx="2.2" ry="1.5" fill="rgba(255,255,255,0.03)" transform="rotate(-22,8.5,8)"/></svg>`;
  }

  // ── 満月（照明面積 > 98.5%） ─────────────────────────────────────────
  if (illum > 0.985) {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="url(#ipm-full)"/><ellipse cx="9" cy="10" rx="1.9" ry="1.3" fill="${C1}" transform="rotate(-15,9,10)"/><ellipse cx="14.5" cy="14" rx="1.3" ry="0.9" fill="${C2}"/><circle cx="11" cy="7.5" r="0.8" fill="${C2}"/><circle cx="16" cy="10.5" r="0.55" fill="${C2}"/><ellipse cx="8.5" cy="8" rx="2.8" ry="1.8" fill="${HL}" transform="rotate(-25,8.5,8)"/></svg>`;
  }

  // ── 連続位相（三日月〜大月） ──────────────────────────────────────────
  const waxing     = phase < 0.5;
  const rx         = (Math.abs(cosΦ) * 9).toFixed(2);
  const outerSweep = waxing ? 1 : 0;
  const termSweep  = (waxing === (cosΦ > 0)) ? 1 : 0;

  // 照明量に応じたグラデーション選択
  let gradId;
  if      (illum < 0.25) gradId = 'ipm-crescent';
  else if (illum < 0.55) gradId = 'ipm-quarter';
  else if (illum < 0.88) gradId = 'ipm-gibbous';
  else                   gradId = 'ipm-full';

  // 照明パス: M top A outer-semicircle bottom A terminator top Z
  const litPath = `M 12,3 A 9,9 0 0,${outerSweep} 12,21 A ${rx},9 0 0,${termSweep} 12,3 Z`;

  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="url(#ipm-dark)"/><path d="${litPath}" fill="url(#${gradId})"/><ellipse cx="9.5" cy="10" rx="1.6" ry="1.1" fill="${C1}" transform="rotate(-15,9.5,10)"/><circle cx="14.5" cy="8.5" r="0.65" fill="${C2}"/><ellipse cx="8.5" cy="8" rx="2.2" ry="1.4" fill="${HL}" transform="rotate(-25,8.5,8)"/></svg>`;
}

// ─── 旧暦計算 ────────────────────────────────────────────────
// 各月の朔日（新月）グレゴリオ日付テーブル [year, month, day] + 旧暦月番号
const LUNAR_MONTHS_TABLE = [
  // 2024
  { g: [2024,  1, 11], lm: 12 }, { g: [2024,  2, 10], lm:  1 },
  { g: [2024,  3, 10], lm:  2 }, { g: [2024,  4,  9], lm:  3 },
  { g: [2024,  5,  8], lm:  4 }, { g: [2024,  6,  6], lm:  5 },
  { g: [2024,  7,  6], lm:  6 }, { g: [2024,  8,  4], lm:  7 },
  { g: [2024,  9,  3], lm:  8 }, { g: [2024, 10,  3], lm:  9 },
  { g: [2024, 11,  1], lm: 10 }, { g: [2024, 12,  1], lm: 11 },
  { g: [2024, 12, 31], lm: 12 },
  // 2025
  { g: [2025,  1, 29], lm:  1 }, { g: [2025,  2, 28], lm:  2 },
  { g: [2025,  3, 29], lm:  3 }, { g: [2025,  4, 28], lm:  4 },
  { g: [2025,  5, 27], lm:  5 }, { g: [2025,  6, 25], lm:  6 },
  { g: [2025,  7, 25], lm:  7 }, { g: [2025,  8, 23], lm:  8 },
  { g: [2025,  9, 21], lm:  9 }, { g: [2025, 10, 21], lm: 10 },
  { g: [2025, 11, 20], lm: 11 }, { g: [2025, 12, 20], lm: 12 },
  // 2026
  { g: [2026,  1, 19], lm: 12 }, { g: [2026,  2, 17], lm:  1 },
  { g: [2026,  3, 19], lm:  2 }, { g: [2026,  4, 17], lm:  3 },
  { g: [2026,  5, 16], lm:  4 }, { g: [2026,  6, 15], lm:  5 },
  { g: [2026,  7, 14], lm:  6 }, { g: [2026,  8, 13], lm:  7 },
  { g: [2026,  9, 11], lm:  8 }, { g: [2026, 10, 11], lm:  9 },
  { g: [2026, 11,  9], lm: 10 }, { g: [2026, 12,  9], lm: 11 },
  // sentinel for 2027
  { g: [2027,  1,  8], lm: 12 },
];

function getLunarDate(year, month, day) {
  const target = new Date(year, month - 1, day);
  let found = null;
  for (let i = LUNAR_MONTHS_TABLE.length - 1; i >= 0; i--) {
    const e = LUNAR_MONTHS_TABLE[i];
    const start = new Date(e.g[0], e.g[1] - 1, e.g[2]);
    if (target >= start) { found = { entry: e, start }; break; }
  }
  if (!found) return { lm: '—', ld: '—' };
  const ld = Math.floor((target - found.start) / 86400000) + 1;
  return { lm: found.entry.lm, ld };
}

// ─── 和暦・月名 ──────────────────────────────────────────────

function getWareki(year, month) {
  if (year < 2019) return '';
  const nen = year - 2018;
  const monthNames = ['睦月','如月','弥生','卯月','皐月','水無月',
                      '文月','葉月','長月','神無月','霜月','師走'];
  const readings   = ['むつき','きさらぎ','やよい','うづき','さつき','みなづき',
                      'ふみづき','はづき','ながつき','かんなづき','しもつき','しわす'];
  const m = month - 1;
  return `令和${nen}年 / ${monthNames[m]}（${readings[m]}）`;
}

// ─── 周期フェーズ ─────────────────────────────────────────────

function getCyclePhaseForDate(dateStr, lastPeriodDate, cycleLength, periodLength) {
  const last = new Date(lastPeriodDate);
  const target = new Date(dateStr);
  last.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - last) / 86400000);
  const cl = cycleLength || 28;
  const pl = periodLength || 5;
  const cycleDay = ((diff % cl) + cl) % cl + 1;
  const ovDay = Math.round(cl - 14);

  if (cycleDay <= pl)                              return 'period';
  if (cycleDay >= ovDay - 4 && cycleDay < ovDay)  return 'ovulation-pre';
  if (cycleDay === ovDay)                          return 'ovulation-day';
  if (cycleDay > ovDay && cycleDay <= ovDay + 3)  return 'fertile';
  if (cycleDay > ovDay + 3)                        return 'high-temp';
  return 'low-temp';
}

function getCycleDay(dateStr, lastPeriodDate, cycleLength) {
  const last = new Date(lastPeriodDate);
  const target = new Date(dateStr);
  last.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - last) / 86400000);
  const cl = cycleLength || 28;
  return ((diff % cl) + cl) % cl + 1;
}

function getTodayCareMessage(cycleDay, cycleLength) {
  if (!cycleDay) return 'リラックスを意識して、\n心と体を整えましょう。';
  const cl = cycleLength || 28;
  const ovDay = Math.round(cl - 14);
  const pl = 5;
  if (cycleDay <= pl)              return '無理をせず、温かくして\nゆっくり過ごしましょう。';
  if (cycleDay < ovDay - 3)       return '体が動きやすい時期です。\n軽い運動もおすすめです。';
  if (cycleDay <= ovDay + 1)      return '排卵期の変化に気づいて。\n体温や体調を確認して。';
  if (cycleDay <= cl - 7)         return '高温期です。疲れやすい\n時期。ゆっくり休んで。';
  return '生理前の時期。気分の波に\n寄り添いながら過ごして。';
}

// ─── 状態 ────────────────────────────────────────────────────

let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth() + 1; // 1-12

// ─── メインビルダー ──────────────────────────────────────────

export function buildCalendarNext() {
  const screen = document.getElementById('screen-calendar');
  if (!screen) return;

  const headerEl = document.getElementById('cal-header');
  if (headerEl) renderSharedHeader(headerEl);

  _wireNavButtons();
  _buildGrid();
  _buildBodyMemo();
  _buildMonthlySummary();
}

function _wireNavButtons() {
  const prevBtn  = document.getElementById('calPrevNew');
  const nextBtn  = document.getElementById('calNextNew');
  const todayBtn = document.getElementById('calTodayBtn');

  if (prevBtn && !prevBtn._cnWired) {
    prevBtn.addEventListener('click', () => {
      _calMonth--;
      if (_calMonth < 1) { _calMonth = 12; _calYear--; }
      _buildGrid();
      _buildMonthlySummary();
    });
    prevBtn._cnWired = true;
  }
  if (nextBtn && !nextBtn._cnWired) {
    nextBtn.addEventListener('click', () => {
      _calMonth++;
      if (_calMonth > 12) { _calMonth = 1; _calYear++; }
      _buildGrid();
      _buildMonthlySummary();
    });
    nextBtn._cnWired = true;
  }
  if (todayBtn && !todayBtn._cnWired) {
    todayBtn.addEventListener('click', () => {
      const now = new Date();
      _calYear  = now.getFullYear();
      _calMonth = now.getMonth() + 1;
      _buildGrid();
      _buildBodyMemo();
      _buildMonthlySummary();
    });
    todayBtn._cnWired = true;
  }
}

function _buildGrid() {
  const labelEl  = document.getElementById('calLabelNew');
  const wareikiEl = document.getElementById('calWarekilabel');
  const gridEl   = document.getElementById('calGridNew');
  if (!labelEl || !gridEl) return;

  labelEl.textContent  = `${_calYear}年${_calMonth}月`;
  if (wareikiEl) wareikiEl.textContent = getWareki(_calYear, _calMonth);

  const st = getState();
  const lastPeriod  = st.lastPeriodDate;
  const cycleLength = st.cycleLength || 28;
  const periodLength = st.periodLength || 5;
  const records     = st.records || [];

  const today  = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();

  const firstDow     = new Date(_calYear, _calMonth - 1, 1).getDay();
  const daysInMonth  = new Date(_calYear, _calMonth, 0).getDate();
  const prevMonthDays = new Date(_calYear, _calMonth - 1, 0).getDate();

  gridEl.innerHTML = '';

  // 前月末日
  for (let i = 0; i < firstDow; i++) {
    const pd = prevMonthDays - firstDow + 1 + i;
    const pm = _calMonth === 1 ? 12 : _calMonth - 1;
    const py = _calMonth === 1 ? _calYear - 1 : _calYear;
    gridEl.appendChild(_buildCell(py, pm, pd, true, lastPeriod, cycleLength, periodLength, records, todayY, todayM, todayD));
  }

  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    gridEl.appendChild(_buildCell(_calYear, _calMonth, d, false, lastPeriod, cycleLength, periodLength, records, todayY, todayM, todayD));
  }

  // 翌月頭
  const totalCells = firstDow + daysInMonth;
  const remainder  = totalCells % 7;
  if (remainder > 0) {
    const nm = _calMonth === 12 ? 1 : _calMonth + 1;
    const ny = _calMonth === 12 ? _calYear + 1 : _calYear;
    for (let i = 1; i <= 7 - remainder; i++) {
      gridEl.appendChild(_buildCell(ny, nm, i, true, lastPeriod, cycleLength, periodLength, records, todayY, todayM, todayD));
    }
  }
}

function _buildCell(year, month, day, isOther, lastPeriod, cycleLength, periodLength, records, todayY, todayM, todayD) {
  const cell = document.createElement('div');
  cell.className = 'cn-cell' + (isOther ? ' cn-cell--other' : '');

  const isToday = year === todayY && month === todayM && day === todayD;
  const dow = new Date(year, month - 1, day).getDay();

  if (isToday) cell.classList.add('cn-cell--today');
  if (dow === 0) cell.classList.add('cn-cell--sun');
  if (dow === 6) cell.classList.add('cn-cell--sat');

  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  if (lastPeriod) {
    const phase = getCyclePhaseForDate(dateStr, lastPeriod, cycleLength, periodLength);
    if (phase) cell.classList.add(`cn-cell--${phase}`);
  }

  const hasRecord = records.some(r => (r.date || r.record_date || '').slice(0, 10) === dateStr);
  if (hasRecord) cell.classList.add('cn-cell--has-record');

  const moonAge = getMoonAge(year, month, day);
  const lunar   = getLunarDate(year, month, day);

  const dayEl = document.createElement('div');
  dayEl.className = 'cn-cell-day';
  dayEl.textContent = String(day);

  const moonEl = document.createElement('span');
  moonEl.className = 'cn-moon';
  moonEl.innerHTML = getMoonSVG(moonAge);

  const lunarEl = document.createElement('div');
  lunarEl.className = 'cn-cell-lunar';
  lunarEl.textContent = `旧暦 ${lunar.lm}/${lunar.ld}`;

  cell.appendChild(dayEl);
  cell.appendChild(moonEl);
  cell.appendChild(lunarEl);

  cell.addEventListener('click', () => {
    // 既存の openDayDetail を利用
    window.calYear  = year;
    window.calMonth = month - 1;
    if (typeof window.openDayDetail === 'function') window.openDayDetail(day);
  });

  return cell;
}

function _buildBodyMemo() {
  const el = document.getElementById('calBodyMemo');
  if (!el) return;

  const st = getState();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const moonAge  = getMoonAge(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const moonName = getMoonPhaseName(moonAge);
  const moonSVG  = getMoonSVG(moonAge);
  const lunar    = getLunarDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const lastPeriod  = st.lastPeriodDate;
  const cycleLength = st.cycleLength || 28;
  const cycleDay    = lastPeriod ? getCycleDay(todayStr, lastPeriod, cycleLength) : null;
  const careMsg     = getTodayCareMessage(cycleDay, cycleLength);
  const careMsgHtml = careMsg.replace('\n', '<br>');

  el.innerHTML = `
    <div class="cn-section-header">
      <span class="cn-section-mark" aria-hidden="true">
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="rgba(42,35,32,0.45)" stroke-width="1.3" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg"><path d="M7 12 C7 12 2.5 8.5 2.5 5 A4.5 4.5 0 0 1 11.5 5 C11.5 8.5 7 12 7 12z"/><line x1="7" y1="12" x2="7" y2="7.5"/></svg>
      </span>
      <span class="cn-section-title">今日のからだメモ</span>
      <button class="cn-record-btn" onclick="state.editingDate=null; openRecordScreen()">記録する</button>
    </div>
    <div class="cn-memo-row">
      <div class="cn-memo-item">
        <div class="cn-memo-label">生理周期</div>
        <div class="cn-memo-value ${cycleDay ? 'cn-memo-value--cycle' : ''}">${cycleDay ? cycleDay + '<span style="font-size:13px;font-weight:400;color:rgba(42,35,32,0.45);">日目</span>' : '—'}</div>
      </div>
      <div class="cn-memo-item">
        <div class="cn-memo-label">月の満ち欠け</div>
        <div class="cn-memo-moon"><span class="cn-moon cn-moon--sm">${moonSVG}</span><span>${moonName}</span></div>
        <div class="cn-memo-sub">旧暦 ${lunar.lm}月${lunar.ld}日</div>
      </div>
      <div class="cn-memo-item">
        <div class="cn-memo-label">おすすめケア</div>
        <div class="cn-memo-care">${careMsgHtml}</div>
      </div>
    </div>`;
}

function _buildMonthlySummary() {
  const el = document.getElementById('calMonthlySummary');
  if (!el) return;

  const st = getState();
  const records     = st.records || [];
  const cycleLength = st.cycleLength || 28;
  const lastPeriod  = st.lastPeriodDate;

  // 平均生理期間の推定（記録から）
  const periodRecs = records.filter(r => r.menstrualCycle && r.menstrualCycle !== 'なし');
  const avgPeriodLen = periodRecs.length > 0 ? 5 : 5; // 将来改善可能

  // 排卵日予測
  let ovDateStr = '—';
  if (lastPeriod) {
    const ovDay  = Math.round(cycleLength - 14);
    const d      = new Date(lastPeriod);
    d.setDate(d.getDate() + ovDay - 1);
    ovDateStr = `${d.getMonth() + 1}/${d.getDate()}頃`;
  }

  el.innerHTML = `
    <div class="cn-section-header">
      <span class="cn-section-mark" aria-hidden="true">
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="rgba(42,35,32,0.45)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="4.5"/><line x1="7" y1="2" x2="7" y2="2.5"/><line x1="7" y1="11.5" x2="7" y2="12"/><line x1="2" y1="7" x2="2.5" y2="7"/><line x1="11.5" y1="7" x2="12" y2="7"/></svg>
      </span>
      <span class="cn-section-title">今月のふりかえり</span>
      <button class="cn-report-btn">レポートを見る</button>
    </div>
    <div class="cn-summary-row">
      <div class="cn-summary-item">
        <div class="cn-summary-label">周期の平均</div>
        <div class="cn-summary-value">${cycleLength}<span class="cn-summary-unit">日</span></div>
      </div>
      <div class="cn-summary-item">
        <div class="cn-summary-label">生理期間の平均</div>
        <div class="cn-summary-value">${avgPeriodLen}<span class="cn-summary-unit">日</span></div>
      </div>
      <div class="cn-summary-item">
        <div class="cn-summary-label">排卵日の平均</div>
        <div class="cn-summary-value cn-summary-value--accent">${ovDateStr}</div>
      </div>
    </div>`;
}

// ─── window 互換 ─────────────────────────────────────────────
window.buildCalendarNext = buildCalendarNext;
// 既存呼び出し互換: buildCalendar() が呼ばれたら新版を使う
// (旧 calendar.js も window.buildCalendar を設定するが、後からロードする本ファイルが上書き)
window.buildCalendar = buildCalendarNext;
