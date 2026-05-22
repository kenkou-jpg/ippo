// ============================================================
//  ippo – src/modules/calendar-next.js
//  パターンA: やさしく見渡せるカレンダー
//  月の満ち欠け・旧暦・周期フェーズを表示するカレンダー
// ============================================================

import { getState } from '../store/state.js';
import { renderSharedHeader } from './shared-header.js';

// ─── 月の満ち欠け ────────────────────────────────────────────

const SYNODIC_MONTH = 29.530588861;
const KNOWN_NEW_MOON_JD = 2451550.09765; // 2000-01-06 18:14 UTC 付近

function toJD(year, month, day) {
  // 月相はその日の代表値として「ユーザーのローカル正午」で計算する。
  // UTC 0:00 固定にするとタイムゾーン境界で前日/翌日の月相に寄るため。
  const localNoon = new Date(year, month - 1, day, 12, 0, 0, 0);
  return localNoon.getTime() / 86400000 + 2440587.5;
}

// 月齢（0 = 新月、~14.77 = 満月）
function getMoonAge(year, month, day) {
  const jd = toJD(year, month, day);
  return ((jd - KNOWN_NEW_MOON_JD) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
}

function getMoonIllumination(age) {
  const phase = ((age % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const phaseAngle = phase * 2 * Math.PI;
  return {
    phase,
    phaseAngle,
    illumination: (1 - Math.cos(phaseAngle)) / 2,
    waxing: phase < 0.5,
  };
}

// 表示名用の分類。SVG描画には使わない。
function getMoonPhaseType(age) {
  const n = age / SYNODIC_MONTH;

  // 新月（かなり狭く）
  if (n < 0.025 || n >= 0.975) {
    return 'new';
  }

  // 三日月
  if (n < 0.235) {
    return 'waxing-crescent';
  }

  // 上弦
  if (n < 0.265) {
    return 'first-quarter';
  }

  // 十三夜
  if (n < 0.485) {
    return 'waxing-gibbous';
  }

  // 満月（かなり狭く）
  if (n < 0.515) {
    return 'full';
  }

  // 十六夜
  if (n < 0.735) {
    return 'waning-gibbous';
  }

  // 下弦
  if (n < 0.765) {
    return 'last-quarter';
  }

  // 二十七夜
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

// ─── 月相SVG 連続生成（illumination based renderer） ────────────────
//
// 重要:
// - カレンダーセルの描画では8フェーズ固定を使わない。
// - 毎日 illumination / waxing / waning から連続的に描画する。
// - ベース暗円は常に表示し、月が消えないようにする。
// - SVGは全て viewBox="0 0 24 24"、光学中心は cx=12, cy=12 固定。
// - defs は各SVG内に閉じ込め、外部sprite参照切れで月が消える事故を避ける。

function getMoonSVG(age, dateKey) {
  const { phase, phaseAngle, illumination, waxing } =
    getMoonIllumination(age);

  const isFullMoon = illumination > 0.985;
  const isNewMoon  = illumination < 0.06;

  const cosPhi    = Math.cos(phaseAngle);
  const visualCos = Math.max(0.18, Math.abs(cosPhi));
  const rx        = (visualCos * 9).toFixed(2);
  const moonRadius = isNewMoon ? 8.5 : 9;

  const outerSweep = waxing ? 1 : 0;
  const termSweep  = (waxing === (cosPhi > 0)) ? 0 : 1;

  const litPath =
    `M 12,3 A 9,9 0 0,${outerSweep} 12,21 A ${rx},9 0 0,${termSweep} 12,3 Z`;

  const uid = `ipm-${dateKey || ''}${Math.round(phase * 100000)}`;

  let litCenter, litMid, litOuter;
  if (illumination < 0.22) {
    litCenter = '#FFE8C5'; litMid = '#F0D098'; litOuter = '#D0A860';
  } else if (illumination < 0.55) {
    litCenter = '#FFEDCC'; litMid = '#FFE0A0'; litOuter = '#E0C070';
  } else if (illumination < 0.88) {
    litCenter = '#FFF3E0'; litMid = '#FFE8C5'; litOuter = '#EED090';
  } else {
    litCenter = '#FFEBCB'; litMid = '#FFE4AA'; litOuter = '#FFDDAA';
  }

  const sparkleData = [
    { x: 12,   y: 0.8,  s: 0.80, o: 0.28 },
    { x: 21.5, y: 6.5,  s: 0.62, o: 0.22 },
    { x: 2.5,  y: 18.5, s: 0.55, o: 0.18 },
  ];

  const sparkleSVG = isFullMoon ? sparkleData.map(({ x, y, s, o }) => {
    const hw = (s * 0.15).toFixed(2);
    const hl = (s * 1.25).toFixed(2);
    const rr = (s * 0.12).toFixed(2);
    return `<g transform="translate(${x},${y})" opacity="${o}">` +
      `<rect x="-${hw}" y="-${hl}" width="${(s * 0.30).toFixed(2)}" height="${(s * 2.5).toFixed(2)}" fill="#FFF6D8" rx="${rr}"/>` +
      `<rect x="-${hl}" y="-${hw}" width="${(s * 2.5).toFixed(2)}" height="${(s * 0.30).toFixed(2)}" fill="#FFF6D8" rx="${rr}"/>` +
      `</g>`;
  }).join('') : '';

  return `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${uid}-dark" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="#6A5447"/>
        <stop offset="48%"  stop-color="#4A372C"/>
        <stop offset="100%" stop-color="#3A2A20"/>
      </radialGradient>

      <radialGradient id="${uid}-lit" cx="7" cy="6" r="17" gradientUnits="userSpaceOnUse">
        <stop offset="0%"   stop-color="${litCenter}"/>
        <stop offset="34%"  stop-color="${litMid}"/>
        <stop offset="72%"  stop-color="${litOuter}"/>
        <stop offset="100%" stop-color="#8C7258"/>
      </radialGradient>

      <filter id="${uid}-soft" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0.4" stdDeviation="0.55" flood-color="#2A1C14" flood-opacity="0.12"/>
      </filter>


      <filter id="${uid}-newmoon" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="0.6" stdDeviation="0.9" flood-color="#2A1C14" flood-opacity="0.19"/>
      </filter>

      <filter id="${uid}-term" x="-2" y="-2" width="28" height="28" filterUnits="userSpaceOnUse">
        <feGaussianBlur stdDeviation="0.6"/>
      </filter>

      <clipPath id="${uid}-clip">
        <circle cx="12" cy="12" r="9"/>
      </clipPath>
    </defs>

    ${isFullMoon ? `<circle cx="12" cy="12" r="10.5" fill="rgba(255,224,150,0.18)"/><circle cx="12" cy="12" r="12.5" fill="rgba(255,224,150,0.07)"/>` : ``}

    <g filter="url(#${uid}-${isNewMoon ? 'newmoon' : 'soft'})">
      <circle cx="12" cy="12" r="${moonRadius}" fill="url(#${uid}-dark)"/>

      <g clip-path="url(#${uid}-clip)">
        <path d="${litPath}" fill="url(#${uid}-lit)" filter="url(#${uid}-term)"/>
      </g>

      <g clip-path="url(#${uid}-clip)" opacity="0.78">
        <ellipse cx="9.4"  cy="10.1" rx="1.55" ry="1.05" fill="rgba(48,30,18,0.028)" transform="rotate(-16,9.4,10.1)"/>
        <ellipse cx="14.6" cy="14.0" rx="1.05" ry="0.72"  fill="rgba(48,30,18,0.022)"/>
        <circle  cx="15.7" cy="9.6"  r="0.46"              fill="rgba(48,30,18,0.020)"/>
        <ellipse cx="8.4"  cy="8.0"  rx="2.2"  ry="1.35"  fill="rgba(255,248,228,0.065)" transform="rotate(-25,8.4,8)"/>
        <circle  cx="11.0" cy="14.8" r="0.62"              fill="rgba(48,30,18,0.018)"/>
        <ellipse cx="13.5" cy="8.5"  rx="0.78" ry="0.52"  fill="rgba(48,30,18,0.016)"/>
        <circle  cx="10.2" cy="12.5" r="0.35"              fill="rgba(48,30,18,0.014)"/>
      </g>

      <circle cx="12" cy="12" r="${moonRadius}" fill="none"
        stroke="${isFullMoon ? 'rgba(255,240,195,0.30)' : 'rgba(235,215,170,0.07)'}"
        stroke-width="0.4"/>

      ${isNewMoon ? `<circle cx="12" cy="12" r="9.3" fill="none" stroke="rgba(210,172,100,0.11)" stroke-width="0.6"/>` : ''}
    </g>

    ${sparkleSVG}
  </svg>`;
}

// ─── 月相SVGキャッシュ（月単位・パフォーマンス最適化） ──────────────────
// render毎の再計算を防ぐ。日付文字列をキーに結果をキャッシュ。
// 120件超で最古エントリを自動削除しメモリ増殖を防ぐ。
const _moonSVGCache = new Map();

function getMoonSVGCached(year, month, day) {
  const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if (_moonSVGCache.has(key)) return _moonSVGCache.get(key);
  const svg = getMoonSVG(getMoonAge(year, month, day), key);
  if (_moonSVGCache.size > 120) _moonSVGCache.delete(_moonSVGCache.keys().next().value);
  _moonSVGCache.set(key, svg);
  return svg;
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
  // 2027
  { g: [2027,  2,  6], lm:  1 }, { g: [2027,  3,  8], lm:  2 },
  { g: [2027,  4,  6], lm:  3 }, { g: [2027,  5,  6], lm:  4 },
  { g: [2027,  6,  4], lm:  5 }, { g: [2027,  7,  4], lm:  6 },
  { g: [2027,  8,  2], lm:  7 }, { g: [2027,  9,  1], lm:  8 },
  { g: [2027,  9, 30], lm:  9 }, { g: [2027, 10, 30], lm: 10 },
  { g: [2027, 11, 28], lm: 11 }, { g: [2027, 12, 28], lm: 12 },
  // 2028
  { g: [2028,  1, 26], lm:  1 }, { g: [2028,  2, 24], lm:  2 },
  { g: [2028,  3, 25], lm:  3 }, { g: [2028,  4, 23], lm:  4 },
  { g: [2028,  5, 23], lm:  5 }, { g: [2028,  6, 21], lm:  6 },
  { g: [2028,  7, 21], lm:  7 }, { g: [2028,  8, 19], lm:  8 },
  { g: [2028,  9, 18], lm:  9 }, { g: [2028, 10, 17], lm: 10 },
  { g: [2028, 11, 16], lm: 11 }, { g: [2028, 12, 15], lm: 12 },
  // 2029
  { g: [2029,  1, 14], lm: 12 }, { g: [2029,  2, 13], lm:  1 },
  { g: [2029,  3, 15], lm:  2 }, { g: [2029,  4, 13], lm:  3 },
  { g: [2029,  5, 13], lm:  4 }, { g: [2029,  6, 11], lm:  5 },
  { g: [2029,  7, 11], lm:  6 }, { g: [2029,  8,  9], lm:  7 },
  { g: [2029,  9,  8], lm:  8 }, { g: [2029, 10,  7], lm:  9 },
  { g: [2029, 11,  6], lm: 10 }, { g: [2029, 12,  5], lm: 11 },
  // 2030
  { g: [2030,  1,  4], lm: 12 }, { g: [2030,  2,  3], lm:  1 },
  { g: [2030,  3,  5], lm:  2 }, { g: [2030,  4,  4], lm:  3 },
  { g: [2030,  5,  3], lm:  4 }, { g: [2030,  6,  2], lm:  5 },
  { g: [2030,  7,  1], lm:  6 }, { g: [2030,  7, 31], lm:  7 },
  { g: [2030,  8, 29], lm:  8 }, { g: [2030,  9, 28], lm:  9 },
  { g: [2030, 10, 27], lm: 10 }, { g: [2030, 11, 26], lm: 11 },
  { g: [2030, 12, 25], lm: 12 },
  // sentinel for 2031
  { g: [2031,  1, 23], lm:  1 },
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
 const lunar = getLunarDate(year, month, day);

  const dayEl = document.createElement('div');
  dayEl.className = 'cn-cell-day';
  dayEl.textContent = String(day);

  const moonEl = document.createElement('span');
  moonEl.className = 'cn-moon';
  moonEl.innerHTML = getMoonSVGCached(year, month, day);

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
  const moonSVG  = getMoonSVGCached(today.getFullYear(), today.getMonth() + 1, today.getDate());
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
      <button class="cn-report-btn" onclick="if(typeof window.switchTab==='function')window.switchTab('insights')">レポートを見る</button>
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
