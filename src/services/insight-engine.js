// ============================================================
//  ippo – src/services/insight-engine.js
//  Record データから軽量な "気づき" を生成する Insight Engine
//
//  【設計原則】
//  - render毎計算禁止。post-save hook 経由、saveState()後のみ更新
//  - 全インサイトは explainable: reason + ruleId フィールド必須
//  - Engine (_runEngine) は純粋関数。副作用なし
//  - FREE/PRO tier 判定は UI injection 時に行う。Engine は tier を設定するだけ
//  - 50ms タイムアウトガード: ルール実行が超過したら残りをスキップ
// ============================================================

import { addPostSaveHook, getState }     from '../store/state.js';
import {
  getHomeConfiguration,
  getCyclePhase,
  getCycleDayNum,
} from '../modules/home-next/home-next-config.js';
import {
  matchVocabulary,
  getObservations,
} from '../data/disease-contexts.js';

import {
  computeTendencyInsights,
  filterByProfile,
} from './insight-tendency.js';

// ─────────────────────────────────────────────────────────────
//  Cache
// ─────────────────────────────────────────────────────────────

const _CACHE_KEY = 'ippo_insight_cache';
const _CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const _ENGINE_TIMEOUT_MS = 50;

export function invalidateInsightCache() {
  try { localStorage.removeItem(_CACHE_KEY); } catch (_) {}
}

function _readCache() {
  try {
    const raw = localStorage.getItem(_CACHE_KEY);
    if (!raw) return null;
    const { insights, generatedAt, ttlMs } = JSON.parse(raw);
    if (Date.now() - new Date(generatedAt).getTime() > ttlMs) return null;
    return insights;
  } catch (_) { return null; }
}

function _writeCache(insights, ttlMs = _CACHE_TTL) {
  try {
    localStorage.setItem(_CACHE_KEY, JSON.stringify({
      insights,
      generatedAt: new Date().toISOString(),
      ttlMs,
    }));
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
//  Record helpers
// ─────────────────────────────────────────────────────────────

function _sliceDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

function _sortByDate(records) {
  return records.slice().sort((a, b) =>
    new Date(a.date || a.record_date) - new Date(b.date || b.record_date)
  );
}

function _computeStats(records) {
  const count = records.length;
  if (!count) return { count: 0, avgPain: 0, avgSleep: 0, avgEnergy: 0, symptomFreq: {}, painDays: 0, highPainDays: 0, poorSleepDays: 0, heavyFlowDays: 0 };

  let totalPain = 0, totalSleep = 0, totalEnergy = 0;
  const symFreq = {};
  let painDays = 0, highPain = 0, poorSleep = 0, heavyFlow = 0;

  for (const r of records) {
    totalPain   += (r.painLevel    ?? 0);
    totalSleep  += (r.sleepQuality ?? 0);
    totalEnergy += (r.energy       ?? 0);
    if ((r.painLevel    ?? 0) >= 2) painDays++;
    if ((r.painLevel    ?? 0) >= 3) highPain++;
    if ((r.sleepQuality ?? 0) >= 3) poorSleep++;
    if (['heavy', 'very_heavy'].includes(r.menstrualCycle || '')) heavyFlow++;
    for (const s of (r.symptoms || [])) {
      symFreq[s] = (symFreq[s] || 0) + 1;
    }
  }

  return {
    count,
    avgPain:       totalPain   / count,
    avgSleep:      totalSleep  / count,
    avgEnergy:     totalEnergy / count,
    symptomFreq:   symFreq,
    painDays,
    highPainDays:  highPain,
    poorSleepDays: poorSleep,
    heavyFlowDays: heavyFlow,
  };
}

// ─────────────────────────────────────────────────────────────
//  Disease Context
// ─────────────────────────────────────────────────────────────

function _buildContext(state) {
  const diseases = state.myDiseases || [];
  const config   = getHomeConfiguration(diseases);
  const records  = (state.records || []).slice(-365);

  return {
    profileKey:      config.profileKey,
    diseaseNames:    diseases,
    isMultiDisease:  diseases.length > 1,
    cyclePhase:      getCyclePhase(state.lastPeriodDate, state.cycleLength),
    cycleDayNum:     getCycleDayNum(state.lastPeriodDate),
    cycleLength:     state.cycleLength    || 28,
    cycleIrregular:  state.cycleIrregular || false,
    lastPeriodDate:  state.lastPeriodDate || null,
    stats: {
      last7:  _computeStats(_sliceDays(records, 7)),
      last30: _computeStats(_sliceDays(records, 30)),
      last90: _computeStats(_sliceDays(records, 90)),
    },
    insightPriority: config.insightPriority || [],
    watchSigns:      config.watchSigns     || [],
    // PHASE 3: displayStyle / priorityFocus (from settingsProfile if configured)
    displayStyle:    (state.settingsProfile && state.settingsProfile.displayStyle)  || 'balanced',
    priorityFocus:   (state.settingsProfile && state.settingsProfile.priorityFocus) || null,
  };
}

// ─────────────────────────────────────────────────────────────
//  Score computation
//  base(20-40) + diseaseBonus(0-25) + recencyBonus(0-15) + confBonus(0-15) = max 95
// ─────────────────────────────────────────────────────────────

function _computeScore({ base, priorityKey, context, evidenceDays, windowDays, confidence }) {
  const diseaseBonus = (context.insightPriority || []).includes(priorityKey) ? 25 : 0;
  const recencyBonus = Math.min(15, Math.round((evidenceDays / (windowDays || 7)) * 15));
  const confBonus    = Math.round((confidence || 0) * 15);
  return Math.min(100, base + diseaseBonus + recencyBonus + confBonus);
}

// ─────────────────────────────────────────────────────────────
//  Symptom sets (SYMPTOM_LAYERS と一致させる)
// ─────────────────────────────────────────────────────────────

const _SYM_FATIGUE  = ['倦怠感', 'だるさ', '眠気', '疲れ'];
const _SYM_HEADACHE = ['頭痛', '頭が重い', '偏頭痛'];
const _SYM_MOOD     = ['気分の落ち込み', 'イライラ', '不安感', '情緒不安定', '怒り', '過敏'];
const _SYM_STRESS   = ['イライラ', '不安感', '怒り', 'ストレス', '緊張'];
const _SYM_SOMATIC  = ['頭痛', '吐き気', '腹部膨満', '下腹部痛', '倦怠感', '腰痛'];

function _hasSym(r, list) {
  return (r.symptoms || []).some(s => list.includes(s));
}

// ─────────────────────────────────────────────────────────────
//  Rule helpers
// ─────────────────────────────────────────────────────────────

// 連続2レコード間のペア相関を計算する
// condition(today) が true の日の翌日に outcome(next) が true になる率を返す
function _pairCorrelation(sortedRecords, condition, outcome) {
  let match = 0, total = 0;
  for (let i = 0; i < sortedRecords.length - 1; i++) {
    if (condition(sortedRecords[i])) {
      total++;
      if (outcome(sortedRecords[i + 1])) match++;
    }
  }
  return { match, total, rate: total > 0 ? match / total : 0 };
}

// 黄体期レコードを抽出するフィルター生成
function _isLuteal(r, lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return false;
  const d       = new Date(r.date || r.record_date || '');
  const last    = new Date(lastPeriodDate + 'T00:00:00');
  const dayNum  = Math.floor((d - last) / 86400000) + 1;
  // 複数周期対応: modulo で正規化
  const normDay = ((dayNum - 1) % cycleLength) + 1;
  return normDay >= (cycleLength - 7) && normDay <= cycleLength;
}

// ─────────────────────────────────────────────────────────────
//  Disease Vocabulary Matcher
//  symptom タグ + 数値フィールド(sleep/energy) + cycle 状態 を組み合わせて
//  疾患別の active vocabulary を特定する
// ─────────────────────────────────────────────────────────────

function _activeVocab(records, context, contextKey) {
  const recent   = _sliceDays(records, 14);
  const symptoms = [...new Set(recent.flatMap(r => r.symptoms || []))];
  const matched  = new Set(matchVocabulary(symptoms, contextKey));

  // sleepQuality 数値フィールド → sleepRelation vocab
  if (context.stats.last7.poorSleepDays >= 1 && contextKey === 'endometriosis') {
    matched.add('sleepRelation');
  }

  // energy / _SYM_FATIGUE フィールド → fatigueFlow / energyInstability vocab
  const week        = _sliceDays(records, 7);
  const fatigueDays = week.filter(r =>
    _hasSym(r, _SYM_FATIGUE) || (r.energy != null && r.energy <= 2)
  ).length;
  if (fatigueDays >= 2) {
    if (contextKey === 'endometriosis') matched.add('fatigueFlow');
    if (contextKey === 'pcos')          matched.add('energyInstability');
  }

  // PCOS の cycleIrregularity は symptom タグではなく状態から判定
  if (contextKey === 'pcos' && (context.cycleIrregular || context.cycleLength > 35)) {
    matched.add('cycleIrregularity');
  }

  return [...matched];
}

// ─────────────────────────────────────────────────────────────
//  Rules
// ─────────────────────────────────────────────────────────────

const RULES = {};

// ── FREE: SLEEP_SUMMARY ────────────────────────────────────
// 直近7日の睡眠状況サマリー

RULES.sleep_summary = function(records, context) {
  const s = context.stats.last7;
  if (s.count < 3) return null;
  if (s.avgSleep < 2.5) return null; // 睡眠良好 → insight不要

  const isSevere = s.avgSleep >= 3.5;
  return {
    id:          'sleep_summary',
    type:        'summary',
    tier:        'free',
    priorityKey: 'sleep_pain',
    main:        isSevere ? '今週は睡眠の質が低めです' : '睡眠が少し短めです',
    sub:         isSevere
      ? '睡眠が浅い状態が続いています。休息を優先できる日を作ってみて。'
      : '今週は睡眠の質にやや波があります。からだを休める時間を確保してみて。',
    action:      null,
    reason:      `avg_sleep=${s.avgSleep.toFixed(2)} >= 2.5 over last_7d (${s.count} records)`,
    ruleId:      'RULE_SLEEP_SUMMARY',
    evidenceDays: s.poorSleepDays,
    confidence:  Math.min(1, s.poorSleepDays / 5),
    diseaseKey:  null,
  };
};

// ── FREE: FATIGUE_SUMMARY ─────────────────────────────────
// 直近7日の疲労感サマリー

RULES.fatigue_summary = function(records, context) {
  const week = _sliceDays(records, 7);
  if (week.length < 3) return null;

  const fatigueDays = week.filter(r =>
    _hasSym(r, _SYM_FATIGUE) || (r.energy != null && r.energy <= 2)
  ).length;

  if (fatigueDays < 3) return null;

  return {
    id:          'fatigue_summary',
    type:        'summary',
    tier:        'free',
    priorityKey: 'symptom_pattern',
    main:        '疲れが続いています',
    sub:         `今週${fatigueDays}日、疲労感や低エネルギーの記録があります。無理をしていないか確認してみて。`,
    action:      null,
    reason:      `fatigue_days=${fatigueDays}/week >= 3`,
    ruleId:      'RULE_FATIGUE_SUMMARY',
    evidenceDays: fatigueDays,
    confidence:  Math.min(1, fatigueDays / 5),
    diseaseKey:  null,
  };
};

// ── PRO: SLEEP_FATIGUE ────────────────────────────────────
// 睡眠が浅い日 → 翌日の疲労感 (パターン相関)

RULES.sleep_fatigue = function(records, context) {
  const month = _sliceDays(records, 30);
  if (month.length < 6) return null;

  const sorted = _sortByDate(month);
  const { match, total, rate } = _pairCorrelation(
    sorted,
    r => (r.sleepQuality ?? 0) >= 3,
    r => _hasSym(r, _SYM_FATIGUE) || (r.energy != null && r.energy <= 2)
  );

  if (total < 3 || rate < 0.45) return null;

  const pct = Math.round(rate * 100);
  return {
    id:          'sleep_fatigue',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'sleep_pain',
    main:        '睡眠が浅い日の翌日に\n疲労感が出やすい傾向があります',
    sub:         `過去30日の記録から、約${pct}%の確率で見られます。`,
    action:      '詳しく見る',
    reason:      `sleep_poor→fatigue: ${match}/${total} pairs (${pct}%) >= 45%`,
    ruleId:      'RULE_SLEEP_FATIGUE',
    evidenceDays: match,
    confidence:  Math.min(1, rate),
    diseaseKey:  null,
  };
};

// ── PRO: SLEEP_HEADACHE ───────────────────────────────────
// 睡眠が浅い日 → 翌日の頭痛 (パターン相関)

RULES.sleep_headache = function(records, context) {
  const month = _sliceDays(records, 30);
  if (month.length < 6) return null;

  const sorted = _sortByDate(month);
  const { match, total, rate } = _pairCorrelation(
    sorted,
    r => (r.sleepQuality ?? 0) >= 3,
    r => _hasSym(r, _SYM_HEADACHE)
  );

  if (total < 3 || match < 2 || rate < 0.40) return null;

  const pct = Math.round(rate * 100);
  return {
    id:          'sleep_headache',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'sleep_pain',
    main:        '睡眠が浅い日の翌日に\n頭痛が強くなる傾向があります',
    sub:         `過去30日の記録から、約${pct}%の確率で見られます。`,
    action:      '詳しく見る',
    reason:      `sleep_poor→headache: ${match}/${total} pairs (${pct}%) >= 40%, evidence >= 2`,
    ruleId:      'RULE_SLEEP_HEADACHE',
    evidenceDays: match,
    confidence:  Math.min(1, rate),
    diseaseKey:  null,
  };
};

// ── PRO: CYCLE_MOOD ───────────────────────────────────────
// 黄体期 × 気分の波 (周期コンテキスト必須)

RULES.cycle_mood = function(records, context) {
  if (!context.lastPeriodDate || !context.cycleLength) return null;

  const twoMonth = _sliceDays(records, 60);
  if (twoMonth.length < 8) return null;

  const cl   = context.cycleLength;
  const last = context.lastPeriodDate;

  const lutealDays = twoMonth.filter(r => _isLuteal(r, last, cl));
  const otherDays  = twoMonth.filter(r => !_isLuteal(r, last, cl));

  if (lutealDays.length < 3) return null;

  const lutealMood = lutealDays.filter(r => _hasSym(r, _SYM_MOOD)).length;
  const otherMood  = otherDays.length > 0
    ? otherDays.filter(r => _hasSym(r, _SYM_MOOD)).length / otherDays.length
    : 0;
  const lutealRate = lutealMood / lutealDays.length;

  // 黄体期での気分症状率が非黄体期の1.4倍以上 かつ 3日以上
  if (lutealMood < 3 || lutealRate < 0.40 || lutealRate <= otherMood * 1.4) return null;

  return {
    id:          'cycle_mood',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'cycle_mood',
    main:        '生理前の時期に\n気分の波が出やすい傾向があります',
    sub:         `生理前7日以内に気分の揺れが${lutealMood}日記録されています。周期に合わせてケアを考えてみて。`,
    action:      '詳しく見る',
    reason:      `luteal_mood=${lutealMood}/${lutealDays.length} (${Math.round(lutealRate * 100)}%) vs other=${Math.round(otherMood * 100)}%`,
    ruleId:      'RULE_CYCLE_MOOD',
    evidenceDays: lutealMood,
    confidence:  Math.min(1, lutealMood / 6),
    diseaseKey:  null,
  };
};

// ── PRO: LUTEAL_FATIGUE ───────────────────────────────────
// 黄体期 × 疲労感パターン

RULES.luteal_fatigue = function(records, context) {
  if (!context.lastPeriodDate || !context.cycleLength) return null;

  const twoMonth = _sliceDays(records, 60);
  if (twoMonth.length < 8) return null;

  const cl   = context.cycleLength;
  const last = context.lastPeriodDate;

  const lutealDays    = twoMonth.filter(r => _isLuteal(r, last, cl));
  const lutealFatigue = lutealDays.filter(r =>
    _hasSym(r, _SYM_FATIGUE) || (r.energy != null && r.energy <= 2)
  ).length;

  if (lutealDays.length < 3 || lutealFatigue < 3) return null;

  const rate = lutealFatigue / lutealDays.length;
  if (rate < 0.40) return null;

  // 非黄体期との比較で有意差を確認
  const otherDays    = twoMonth.filter(r => !_isLuteal(r, last, cl));
  const otherFatigue = otherDays.length > 0
    ? otherDays.filter(r => _hasSym(r, _SYM_FATIGUE) || (r.energy != null && r.energy <= 2)).length / otherDays.length
    : 0;

  if (rate <= otherFatigue * 1.3) return null;

  return {
    id:          'luteal_fatigue',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'cycle_mood',
    main:        '黄体期に\n疲れやすい傾向があります',
    sub:         `生理前の時期に疲労感が集中しています（${lutealFatigue}日分の記録）。この時期は特に無理をしないで。`,
    action:      '詳しく見る',
    reason:      `luteal_fatigue=${lutealFatigue}/${lutealDays.length} (${Math.round(rate * 100)}%) vs other=${Math.round(otherFatigue * 100)}%`,
    ruleId:      'RULE_LUTEAL_FATIGUE',
    evidenceDays: lutealFatigue,
    confidence:  Math.min(1, lutealFatigue / 5),
    diseaseKey:  null,
  };
};

// ── PRO: STRESS_SYMPTOMS ─────────────────────────────────
// ストレス代理指標 × 身体症状の集中パターン
// ストレス日: イライラ・不安感などの症状がある日

RULES.stress_symptoms = function(records, context) {
  const month = _sliceDays(records, 30);
  if (month.length < 6) return null;

  const stressDays    = month.filter(r => _hasSym(r, _SYM_STRESS));
  const nonStressDays = month.filter(r => !_hasSym(r, _SYM_STRESS));

  if (stressDays.length < 3) return null;

  const stressWithSomatic    = stressDays.filter(r => _hasSym(r, _SYM_SOMATIC)).length;
  const nonStressWithSomatic = nonStressDays.filter(r => _hasSym(r, _SYM_SOMATIC)).length;

  const stressRate    = stressWithSomatic / stressDays.length;
  const nonStressRate = nonStressDays.length > 0 ? nonStressWithSomatic / nonStressDays.length : 0;

  if (stressRate < 0.40 || stressRate <= nonStressRate * 1.3) return null;

  return {
    id:          'stress_symptoms',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'symptom_pattern',
    main:        'ストレスが高い日に\n身体症状が集中しやすい傾向があります',
    sub:         `イライラや不安感のある日に、頭痛や倦怠感が重なっています（${stressWithSomatic}日分）。`,
    action:      '詳しく見る',
    reason:      `stress→somatic: ${stressWithSomatic}/${stressDays.length} (${Math.round(stressRate * 100)}%) vs non-stress ${Math.round(nonStressRate * 100)}%`,
    ruleId:      'RULE_STRESS_SYMPTOMS',
    evidenceDays: stressWithSomatic,
    confidence:  Math.min(1, stressWithSomatic / 4),
    diseaseKey:  null,
  };
};

// ── FREE: DISEASE_CONTEXT_ENDO ─────────────────────────────
// 子宮内膜症 — 症状パターンから生活文脈の観察を生成

RULES.disease_context_endo = function(records, context) {
  if (!context.diseaseNames.includes('子宮内膜症')) return null;
  const recent = _sliceDays(records, 14);
  if (recent.length < 2) return null;

  const active = _activeVocab(records, context, 'endometriosis');
  if (active.length === 0) return null;

  const obs = getObservations('endometriosis').find(o => active.includes(o.vocabularyKey));
  if (!obs) return null;

  return {
    id:           obs.id,
    type:         'context',
    tier:         'free',
    priorityKey:  'sleep_pain',
    main:         obs.phrase,
    sub:          obs.context,
    action:       null,
    reason:       `disease=子宮内膜症 vocab=[${active.join(',')}]`,
    ruleId:       'RULE_DISEASE_CONTEXT_ENDO',
    evidenceDays:  recent.length,
    confidence:   Math.min(1, active.length / 3),
    diseaseKey:   '子宮内膜症',
  };
};

// ── FREE: DISEASE_CONTEXT_PCOS ─────────────────────────────
// PCOS — 症状パターンから生活文脈の観察を生成

RULES.disease_context_pcos = function(records, context) {
  if (!context.diseaseNames.includes('PCOS')) return null;
  const recent = _sliceDays(records, 14);
  if (recent.length < 2) return null;

  const active = _activeVocab(records, context, 'pcos');
  if (active.length === 0) return null;

  const obs = getObservations('pcos').find(o => active.includes(o.vocabularyKey));
  if (!obs) return null;

  return {
    id:           obs.id,
    type:         'context',
    tier:         'free',
    priorityKey:  'symptom_pattern',
    main:         obs.phrase,
    sub:          obs.context,
    action:       null,
    reason:       `disease=PCOS vocab=[${active.join(',')}]`,
    ruleId:       'RULE_DISEASE_CONTEXT_PCOS',
    evidenceDays:  recent.length,
    confidence:   Math.min(1, active.length / 2),
    diseaseKey:   'PCOS',
  };
};

// ── FREE: DISEASE_CONTEXT_PMS ──────────────────────────────
// PMS — 症状パターンから生活文脈の観察を生成

RULES.disease_context_pms = function(records, context) {
  const hasPms = context.diseaseNames.some(d => d === 'PMS' || d === 'PMS/PMDD');
  if (!hasPms) return null;
  const recent = _sliceDays(records, 14);
  if (recent.length < 2) return null;

  const active = _activeVocab(records, context, 'pms');
  if (active.length === 0) return null;

  const obs = getObservations('pms').find(o => active.includes(o.vocabularyKey));
  if (!obs) return null;

  return {
    id:           obs.id,
    type:         'context',
    tier:         'free',
    priorityKey:  'cycle_mood',
    main:         obs.phrase,
    sub:          obs.context,
    action:       null,
    reason:       `disease=PMS vocab=[${active.join(',')}]`,
    ruleId:       'RULE_DISEASE_CONTEXT_PMS',
    evidenceDays:  recent.length,
    confidence:   Math.min(1, active.length / 2),
    diseaseKey:   'PMS',
  };
};

// ── FREE: DISEASE_CONTEXT_PMDD ─────────────────────────────
// PMDD — 症状パターンから生活文脈の観察を生成

RULES.disease_context_pmdd = function(records, context) {
  if (!context.diseaseNames.includes('PMDD')) return null;
  const recent = _sliceDays(records, 14);
  if (recent.length < 2) return null;

  const active = _activeVocab(records, context, 'pmdd');
  if (active.length === 0) return null;

  const obs = getObservations('pmdd').find(o => active.includes(o.vocabularyKey));
  if (!obs) return null;

  return {
    id:           obs.id,
    type:         'context',
    tier:         'free',
    priorityKey:  'cycle_mood',
    main:         obs.phrase,
    sub:          obs.context,
    action:       null,
    reason:       `disease=PMDD vocab=[${active.join(',')}]`,
    ruleId:       'RULE_DISEASE_CONTEXT_PMDD',
    evidenceDays:  recent.length,
    confidence:   Math.min(1, active.length / 2),
    diseaseKey:   'PMDD',
  };
};

// ── FREE: DISEASE_CONTEXT_CYST ─────────────────────────────
// 卵巣嚢腫 — 症状パターンから生活文脈の観察を生成

RULES.disease_context_cyst = function(records, context) {
  if (!context.diseaseNames.includes('卵巣嚢腫')) return null;
  const recent = _sliceDays(records, 14);
  if (recent.length < 2) return null;

  const active = _activeVocab(records, context, 'ovarianCyst');
  if (active.length === 0) return null;

  const obs = getObservations('ovarianCyst').find(o => active.includes(o.vocabularyKey));
  if (!obs) return null;

  return {
    id:           obs.id,
    type:         'context',
    tier:         'free',
    priorityKey:  'symptom_pattern',
    main:         obs.phrase,
    sub:          obs.context,
    action:       null,
    reason:       `disease=卵巣嚢腫 vocab=[${active.join(',')}]`,
    ruleId:       'RULE_DISEASE_CONTEXT_CYST',
    evidenceDays:  recent.length,
    confidence:   Math.min(1, active.length / 2),
    diseaseKey:   '卵巣嚢腫',
  };
};

// ─────────────────────────────────────────────────────────────
//  Engine core
// ─────────────────────────────────────────────────────────────

function _runEngine(state) {
  const start   = Date.now();
  const records = (state.records || []).slice(-365);
  const context = _buildContext(state);
  const results = [];

  for (const key of Object.keys(RULES)) {
    if (Date.now() - start > _ENGINE_TIMEOUT_MS) {
      console.warn('[insight-engine] 50ms timeout: skipped remaining rules');
      break;
    }
    try {
      const insight = RULES[key](records, context);
      if (!insight) continue;

      insight.score = _computeScore({
        base:         insight.type === 'pattern' ? 40 : 20,
        priorityKey:  insight.priorityKey,
        context,
        evidenceDays: insight.evidenceDays,
        windowDays:   insight.tier === 'pro' ? 30 : 7,
        confidence:   insight.confidence,
      });
      insight.generatedAt = new Date().toISOString();
      insight.ttlMs       = _CACHE_TTL;
      results.push(insight);
    } catch (e) {
      console.warn(`[insight-engine] rule "${key}" error:`, e);
    }
  }

  // PHASE 3: tendency insights (symptomDetails + emotions linkage)
  const tendencies = computeTendencyInsights(records, context);
  for (const t of tendencies) {
    if (!t) continue;
    t.score = _computeScore({
      base:         t.type === 'pattern' ? 40 : 20,
      priorityKey:  t.priorityKey,
      context,
      evidenceDays: t.evidenceDays,
      windowDays:   t.tier === 'pro' ? 30 : 14,
      confidence:   t.confidence,
    });
    t.generatedAt = new Date().toISOString();
    t.ttlMs       = _CACHE_TTL;
    results.push(t);
  }

  results.sort((a, b) => b.score - a.score);

  // PHASE 3: apply displayStyle / priorityFocus profile filter
  return filterByProfile(results, context.displayStyle, context.priorityFocus);
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/**
 * 全インサイトを返す。
 * キャッシュ有効期限内ならキャッシュ返却、miss時はEngineを実行してキャッシュに書く。
 * UI側はこれだけを呼ぶ。
 */
export function getInsights() {
  const cached = _readCache();
  if (cached) return cached;

  const insights = _runEngine(getState());
  _writeCache(insights);
  return insights;
}

/** score最高の1件を返す (HOME画面用) */
export function getTopInsight() {
  const all = getInsights();
  return all.length > 0 ? all[0] : null;
}

/** tier='free' のみ返す */
export function getFreeInsights() {
  return getInsights().filter(i => i.tier === 'free');
}

/** tier='pro' のみ返す */
export function getProInsights() {
  return getInsights().filter(i => i.tier === 'pro');
}

/**
 * キャッシュを無効化し、Engineを再実行してキャッシュを更新する。
 * saveRecord 後のみ呼ばれる (post-save hook 経由)。
 */
export function updateInsights() {
  invalidateInsightCache();
  const insights = _runEngine(getState());
  _writeCache(insights);
  return insights;
}

// ─────────────────────────────────────────────────────────────
//  Post-save hook 登録
//  saveState() → invalidate → Engine 再実行 (async で UI thread を塞がない)
// ─────────────────────────────────────────────────────────────

addPostSaveHook(function _insightPostSaveHook(saveErr) {
  if (saveErr) return; // 保存失敗時は更新しない
  invalidateInsightCache();
  // 保存処理完了後に非同期で再計算 (50ms ガード付き)
  setTimeout(function() {
    try { updateInsights(); } catch (_) {}
  }, 0);
});

// ─────────────────────────────────────────────────────────────
//  Window 公開 (legacy script / devtools 用)
// ─────────────────────────────────────────────────────────────

window.ippoInsightEngine = {
  getInsights,
  getTopInsight,
  getFreeInsights,
  getProInsights,
  updateInsights,
  invalidateInsightCache,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('insight-engine-loaded');
}
