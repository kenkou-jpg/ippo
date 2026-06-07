// ============================================================
//  ippo – home-next-hero.js v2
//  ヒーローカード: 植物装飾 + "今日のあなた" + 状態メッセージ + サイクル情報
// ============================================================

import {
  getCyclePhase,
  getCycleDayNum,
  getHeroMessageKey,
  pickHeroMessage,
  CYCLE_PHASES,
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

// ── 説明サブテキスト ─────────────────────────────────────

function buildHeroDesc(msgKey, phase, sleepAvg, painAvg) {
  if (msgKey === 'highPain') {
    return '強い痛みが続いています。\n今日は無理せず、記録して過ごしてください。';
  }
  if (msgKey === 'lowSleep') {
    return '睡眠時間がいつもより短く、\n頭痛やだるさが出やすい日かもしれません。';
  }
  if (phase === 'menstrual') {
    return '生理期間中です。からだの声を最優先にして。\n症状を記録しておくと次の診察に役立ちます。';
  }
  if (phase === 'luteal') {
    return '生理前の時期に入っています。\n気分の波や体調の変化に気づいていきましょう。';
  }
  if (phase === 'ovulation') {
    return '排卵期の可能性があります。\nからだの変化を観察してみましょう。';
  }
  return '';
}

// ── サイクル情報 ─────────────────────────────────────────

function buildCycleText(state, phase) {
  if (!state.lastPeriodDate || !state.cycleLength) return '';
  const last    = new Date(state.lastPeriodDate + 'T00:00:00');
  const today   = new Date();
  const dayNum  = Math.floor((today - last) / 86400000) + 1;
  const cl      = state.cycleLength;
  const left    = cl - dayNum;

  if (phase === 'menstrual') {
    return `生理期間 周期${dayNum}日目`;
  }
  if (left > 0) return `次の生理まで約${left}日`;
  return '生理予定日頃';
}

// ── フェーズラベル ────────────────────────────────────────

function buildPhaseLabel(phase) {
  if (!phase) return '';
  const info = CYCLE_PHASES[phase];
  if (!info) return '';
  return `${info.icon || ''}${info.label}`;
}

// ── ヒーローカードHTML ────────────────────────────────────

export function renderHero(container, config, state) {
  // PHASE 1-A: バナー描画停止（ロジック・getTodayAwareness は保持）
  container.innerHTML = '';
  return;

  const records               = state.records || [];
  const hour                  = new Date().getHours();
  const phase                 = getCyclePhase(state.lastPeriodDate, state.cycleLength);
  const { sleepAvg, painAvg } = getRecentStats(records);

  const msgKey  = getHeroMessageKey({ phase, recentSleepAvg: sleepAvg, recentPainAvg: painAvg, hour });
  const message = pickHeroMessage(config.heroMessages, msgKey);
  const desc    = buildHeroDesc(msgKey, phase, sleepAvg, painAvg);
  const cycleText = buildCycleText(state, phase);
  const phaseLabel = buildPhaseLabel(phase);

  container.innerHTML = `
    <div class="hn-hero hn-anim-1">
      <span class="hn-hero-tag">今日のあなた</span>
      <div class="hn-hero-body">
        <div class="hn-hero-message">${escMsg(message)}</div>
        ${desc ? `<div class="hn-hero-desc">${esc(desc)}</div>` : ''}
      </div>
      <div class="hn-hero-footer">
        <button class="hn-hero-link" onclick="if(typeof window.switchTab==='function')window.switchTab('insights',null)">
          詳しく見る &rsaquo;
        </button>
        ${cycleText ? `<span class="hn-hero-cycle">${phaseLabel ? phaseLabel + '・' : ''}${esc(cycleText)}</span>` : ''}
      </div>
    </div>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}

// メッセージ専用: \n を除去してCSSに自然な折り返しを委ねる
function escMsg(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '');
}
