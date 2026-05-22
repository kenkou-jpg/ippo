// ============================================================
//  ippo – src/modules/insight-resolver.js
//  State-based recommendation resolver
//  Pure functions — no DOM, no router calls, no side effects.
//  Returns recommendation objects only.
// ============================================================

import { getState } from '../store/state.js';

// ─── Feature title registry ────────────────────────────────
const FEATURE_TITLES = {
  'ai-pattern':        'AIパターン解析',
  'bbt-pattern':       '体温パターン解析',
  'flare-analysis':    'フレアアップ分析',
  'cycle-compare':     '周期比較',
  'experiments':       'ヘルス実験',
  'factor-report':     '要因効果レポート',
  'body-summary':      'からだサマリー',
  'monthly-pdf':       '月次PDFレポート',
  'symptom-trends':    '症状推移グラフ',
  'condition-summary': '疾患観察まとめ',
};

function _title(key) { return FEATURE_TITLES[key] || key; }

// ─── State analysis ────────────────────────────────────────
function _analyze() {
  const s = (typeof window.getState === 'function' ? window.getState() : null) || getState();
  if (!s) return null;

  const records = s.records || [];
  const now = new Date();
  const r30 = records
    .filter(r => { const d = r.date || r.record_date; return d && (now - new Date(d)) / 86400000 <= 30; })
    .sort((a, b) => new Date(b.date || b.record_date) - new Date(a.date || a.record_date));

  const sleepR   = r30.filter(r => r.sleepHours > 0);
  const avgSleep = sleepR.length ? sleepR.reduce((a, r) => a + r.sleepHours, 0) / sleepR.length : null;
  const sleepHoursLow = avgSleep !== null && avgSleep < 6;

  const recent7 = r30.slice(0, 7);
  const older7  = r30.slice(7, 14);

  const _painAvg = arr => {
    const valid = arr.filter(r => r.painLevel > 0);
    return valid.length ? valid.reduce((a, r) => a + r.painLevel, 0) / valid.length : 0;
  };
  const symptomSeverityIncreasing = _painAvg(recent7) > _painAvg(older7) + 0.5;
  const headacheIncreasing = recent7.some(r =>
    (r.symptoms || []).some(sym => typeof sym === 'string' && sym.includes('頭痛'))
  );

  const tempR  = r30.filter(r => r.basalTemp > 0);
  const avgBBT = tempR.length ? tempR.reduce((a, r) => a + r.basalTemp, 0) / tempR.length : 0;
  const bbtVarianceHigh = tempR.length >= 5 &&
    Math.sqrt(tempR.reduce((a, r) => a + Math.pow(r.basalTemp - avgBBT, 2), 0) / tempR.length) > 0.28;

  const cycleVariationHigh = !!(s.cycleLength && (s.cycleLength < 24 || s.cycleLength > 35));
  const insightPatternDetected = r30.filter(r => r.mood > 0).length >= 5;

  return {
    hasData: r30.length >= 3,
    recordCount: r30.length,
    avgSleep, sleepHoursLow,
    symptomSeverityIncreasing, headacheIncreasing,
    bbtVarianceHigh, cycleVariationHigh,
    insightPatternDetected,
  };
}

// ─── Scoring helpers ───────────────────────────────────────
function _rank(entries) {
  const map = {};
  for (const e of entries) {
    if (!map[e.key]) map[e.key] = { key: e.key, score: 0, reason: null };
    map[e.key].score += e.score;
    if (e.reason && !map[e.key].reason) map[e.key].reason = e.reason;
  }
  return Object.values(map).sort((a, b) => b.score - a.score);
}

function _build(ranked) {
  if (!ranked.length) return null;
  const [top, ...rest] = ranked;
  return {
    primary: {
      score: Math.min(top.score, 1),
      key:   top.key,
      title: _title(top.key),
      reason: top.reason || '',
    },
    alternatives: rest.slice(0, 3).map(r => ({
      key:   r.key,
      title: _title(r.key),
      score: Math.min(r.score, 1),
    })),
  };
}

// ─── Surface resolvers ─────────────────────────────────────
// Each type corresponds to a status strip cell or section button.
// Priority weights are designed to allow future personalization tuning.

export function resolveInsightDestination(type) {
  const d = _analyze();
  if (!d || !d.hasData) return null;

  const MAPS = {
    sleep: [
      d.sleepHoursLow && d.headacheIncreasing
        ? { key: 'flare-analysis', score: 0.82, reason: '睡眠が短い日に、頭痛が出やすい傾向があります' }
        : { key: 'flare-analysis', score: d.sleepHoursLow ? 0.70 : 0.55 },
      { key: 'ai-pattern',    score: 0.55 },
      { key: 'experiments',   score: 0.50 },
      { key: 'factor-report', score: 0.45 },
    ],
    cycle: [
      { key: 'cycle-compare', score: d.cycleVariationHigh ? 0.80 : 0.62,
        reason: d.cycleVariationHigh ? '周期に変化が見られます' : null },
      { key: 'bbt-pattern',   score: 0.52 },
      { key: 'monthly-pdf',   score: 0.44 },
      { key: 'ai-pattern',    score: 0.40 },
    ],
    symptom: [
      { key: 'flare-analysis',   score: d.symptomSeverityIncreasing ? 0.80 : 0.60,
        reason: d.symptomSeverityIncreasing ? '症状に変化が見られます' : null },
      { key: 'symptom-trends',   score: 0.54 },
      { key: 'condition-summary',score: 0.46 },
      { key: 'factor-report',    score: 0.44 },
    ],
    bbt: [
      { key: 'bbt-pattern',   score: d.bbtVarianceHigh ? 0.82 : 0.62,
        reason: d.bbtVarianceHigh ? '体温の変動が大きい時期です' : null },
      { key: 'cycle-compare', score: 0.50 },
      { key: 'ai-pattern',    score: 0.44 },
    ],
    insight: [
      { key: 'ai-pattern',    score: d.insightPatternDetected ? 0.78 : 0.58,
        reason: d.insightPatternDetected ? '気になる動きがあります' : null },
      { key: 'flare-analysis',score: 0.50 },
      { key: 'factor-report', score: 0.44 },
    ],
    experiment: [
      { key: 'experiments',   score: 0.80, reason: '小さな変化を、試してみましょう' },
      { key: 'factor-report', score: 0.52 },
      { key: 'monthly-pdf',   score: 0.42 },
    ],
  };

  const entries = MAPS[type];
  if (!entries) return null;
  return _build(_rank(entries));
}

// ─── Thinking resolver ─────────────────────────────────────
// Used when user selects a topic from the Thinking Sheet.

const THINKING_MAP = {
  sleep:   { key: 'experiments',    reason: '睡眠時間を少し変えた時の\n変化を観察できます',         alts: ['ai-pattern', 'flare-analysis', 'factor-report'] },
  cycle:   { key: 'cycle-compare',  reason: '周期ごとの変化を\n比較・確認できます',                 alts: ['bbt-pattern', 'monthly-pdf', 'ai-pattern'] },
  stress:  { key: 'flare-analysis', reason: 'ストレスと症状の\nつながりを確認できます',             alts: ['factor-report', 'experiments', 'ai-pattern'] },
  diet:    { key: 'experiments',    reason: '食事の変化が\nからだに与える影響を確認できます',       alts: ['factor-report', 'ai-pattern'] },
  cold:    { key: 'factor-report',  reason: '冷えと症状の\n関係を確認できます',                     alts: ['experiments', 'ai-pattern'] },
  symptom: { key: 'flare-analysis', reason: '症状が強まる\nパターンを確認できます',                 alts: ['symptom-trends', 'condition-summary', 'factor-report'] },
  mood:    { key: 'ai-pattern',     reason: '気分の波の\nパターンを確認できます',                   alts: ['experiments', 'body-summary'] },
};

export function resolveThinkingDestination(topic) {
  const m = THINKING_MAP[topic];
  if (!m) return null;
  return {
    primary: {
      score: 0.78,
      key:   m.key,
      title: _title(m.key),
      reason: m.reason,
    },
    alternatives: m.alts.map(key => ({ key, title: _title(key), score: 0 })),
  };
}
