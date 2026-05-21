// ============================================================
//  ippo – home-next-daily-note.js
//  「今日の注意」: 疾患別・文脈別の静かなアウェアネスカード
//  病院UIや警告UIではなく、"状態"として伝える
// ============================================================

import {
  getCyclePhase,
  getHeroMessageKey,
  getTodayAwareness,
} from './home-next-config.js';

// ── 直近レコード集計 ─────────────────────────────────────

function getRecentStats(records, days = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const recent = (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff;
  });
  if (!recent.length) return { sleepAvg: null, painAvg: null };

  const sleepVals = recent.filter(r => r.sleepQuality != null).map(r => r.sleepQuality);
  const painVals  = recent.filter(r => r.painLevel  != null).map(r => r.painLevel);

  return {
    sleepAvg: sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : null,
    painAvg:  painVals.length  ? painVals.reduce((a, b) => a + b, 0)  / painVals.length  : null,
  };
}

// ── 観察サイン表示 ───────────────────────────────────────

function buildWatchSigns(watchSigns, records) {
  if (!watchSigns || !watchSigns.length) return '';

  const recent14 = (records || [])
    .filter(r => {
      const d = new Date(r.date || r.record_date || '');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);
      return d >= cutoff;
    });

  const triggered = [];

  if (watchSigns.includes('痛み増加速度') || watchSigns.includes('痛みの増加')) {
    const sorted = [...recent14].sort((a, b) =>
      new Date(a.date || a.record_date) - new Date(b.date || b.record_date)
    );
    if (sorted.length >= 4) {
      const early = sorted.slice(0, Math.floor(sorted.length / 2));
      const late  = sorted.slice(Math.floor(sorted.length / 2));
      const earlyAvg = early.reduce((s, r) => s + (r.painLevel ?? 0), 0) / early.length;
      const lateAvg  = late.reduce((s, r)  => s + (r.painLevel ?? 0), 0) / late.length;
      if (lateAvg - earlyAvg >= 1.5) triggered.push('痛みが増加傾向にあります');
    }
  }

  if (watchSigns.includes('疲労回復遅延') || watchSigns.includes('疲労・貧血症状')) {
    const fatigueDays = recent14.filter(r =>
      (r.energy != null && r.energy <= 2) ||
      (r.symptoms || []).some(s => ['倦怠感','だるさ'].includes(s))
    ).length;
    if (fatigueDays >= 5) triggered.push('疲労が続いています');
  }

  if (watchSigns.includes('睡眠悪化')) {
    const poorSleepDays = recent14.filter(r => (r.sleepQuality ?? 0) >= 3).length;
    if (poorSleepDays >= 5) triggered.push('睡眠が乱れやすい状態です');
  }

  if (watchSigns.includes('無排卵傾向') || watchSigns.includes('周期長期化')) {
    // 周期情報は state から判断するため、ここでは症状ベースで
    const irregSigns = recent14.filter(r =>
      (r.symptoms || []).some(s => ['周期の乱れ','無月経'].includes(s))
    ).length;
    if (irregSigns >= 2) triggered.push('周期の変化に気づいています');
  }

  if (triggered.length === 0) return '';

  return `<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
    ${triggered.map(sign => `
      <div style="display:flex;align-items:center;gap:7px;">
        <div style="width:5px;height:5px;border-radius:50%;background:rgba(44,36,31,0.28);flex-shrink:0;"></div>
        <span style="font-size:11px;color:rgba(44,36,31,0.52);line-height:1.5;">${esc(sign)}</span>
      </div>`).join('')}
  </div>`;
}

// ── デコレーション SVG ───────────────────────────────────

const DECO_SVG = `<svg style="position:absolute;right:10px;bottom:10px;width:56px;height:56px;opacity:0.15;" viewBox="0 0 56 56" fill="none" aria-hidden="true">
  <path d="M28 52 Q26 36 25 28" stroke="#9DB095" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="30" rx="7" ry="12" fill="#C8D8BE" opacity="0.9" transform="rotate(-16 20 30)"/>
  <ellipse cx="34" cy="25" rx="6" ry="10" fill="#B8C9AC" opacity="0.8" transform="rotate(20 34 25)"/>
  <ellipse cx="16" cy="18" rx="5" ry="9" fill="#C8D8BE" opacity="0.7" transform="rotate(-8 16 18)"/>
</svg>`;

// ── メインレンダリング ────────────────────────────────────

export function renderDailyNote(container, config, state) {
  const records = state.records || [];
  const diseases = state.myDiseases || [];

  // 疾患未設定 → 非表示
  if (!diseases.length || !config.todayAwareness) {
    container.innerHTML = '';
    return;
  }

  const { sleepAvg, painAvg } = getRecentStats(records);
  const phase    = getCyclePhase(state.lastPeriodDate, state.cycleLength);
  const msgKey   = getHeroMessageKey({ phase, recentSleepAvg: sleepAvg, recentPainAvg: painAvg, hour: new Date().getHours() });

  const message  = getTodayAwareness(config, { phase, recentPainAvg: painAvg, recentSleepAvg: sleepAvg });
  if (!message) {
    container.innerHTML = '';
    return;
  }

  const watchHtml = buildWatchSigns(config.watchSigns || [], records);

  container.innerHTML = `
    <div style="margin:0 16px 16px;background:rgba(255,255,255,0.82);border-radius:20px;padding:20px 20px 18px;border:1px solid rgba(0,0,0,0.03);box-shadow:0 1px 6px rgba(0,0,0,0.01);position:relative;overflow:hidden;">
      ${DECO_SVG}
      <div style="position:relative;z-index:1;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:11px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(44,36,31,0.38)" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span style="font-size:10.5px;color:rgba(44,36,31,0.42);font-weight:500;letter-spacing:0.03em;">今日の状態</span>
        </div>
        <div style="font-size:13.5px;color:#2C241F;line-height:1.85;font-weight:500;letter-spacing:-0.015em;">${esc(message)}</div>
        ${watchHtml}
      </div>
    </div>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
