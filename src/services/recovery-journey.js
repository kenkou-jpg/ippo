// ============================================================
//  ippo – src/services/recovery-journey.js
//  PHASE 7: Recovery Journey / Life Integration Layer
//
//  設計原則:
//  - rule-based / local-first / lightweight
//  - post-save hook 不使用: companion-intelligence キャッシュを利用
//  - 「改善しました」は言わない。「流れ」「変化」「傾向」のみ
//  - 禁止: 診断 / 断定 / 強制改善 / 感情スコア
//  - トーン: 「〜してきているようです」「〜が続いていたようです」
// ============================================================

import { shouldShowExperiment, recordExperimentShown, recordClimateEntry } from './life-rhythm-memory.js';

// ─── Helpers ──────────────────────────────────────────────

function _sliceDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

function _sliceBetweenDays(records, fromDays, toDays) {
  const from = new Date(); from.setDate(from.getDate() - toDays);
  const to   = new Date(); to.setDate(to.getDate() - fromDays);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d > from && d <= to && !isNaN(d.getTime());
  });
}

function _isGoodSleep(r) {
  return (r.snapshot && r.snapshot.sleep === 'wellSlept') ||
         (r.sleepQuality != null && r.sleepQuality <= 1);
}

function _isPoorSleep(r) {
  return (r.snapshot && (r.snapshot.sleep === 'hardlySlept' || r.snapshot.sleep === 'wokeUp')) ||
         (r.sleepQuality != null && r.sleepQuality >= 3);
}

function _isFatigue(r) {
  return (r.symptomDetails || []).some(function(d) { return d && d.symptom === 'だるさ'; }) ||
         (r.symptoms || []).some(function(s) { return s === 'だるさ' || s === '倦怠感'; });
}

function _isGoodCondition(r) {
  return (r.snapshot && (r.snapshot.condition === 'great' || r.snapshot.condition === 'good')) ||
         (r.mood != null && r.mood >= 4);
}

const _POS_EMOTIONS = ['calm', 'happy', 'relaxed', 'grateful', 'positive'];
const _NEG_EMOTIONS = ['anxious', 'irritated', 'down'];

// ─── Seasonal awareness ───────────────────────────────────

function _getSeason(month) {
  if (month >= 3 && month <= 5)  return 'spring';
  if (month >= 6 && month <= 8)  return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function _isSeasonalTransition(month) {
  return [3, 6, 9, 12].includes(month);
}

// ─── Recovery rhythm dots ─────────────────────────────────
// 直近14日分の体調ドット (HTML文字列を返す)

function _buildRhythmDots(records) {
  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rec = (records || []).find(function(r) {
      return (r.date || r.record_date || '').slice(0, 10) === dateStr;
    });
    if (!rec) {
      result.push('<span class="hn-rhy-dot hn-rhy-empty"></span>');
    } else if (_isGoodCondition(rec)) {
      result.push('<span class="hn-rhy-dot hn-rhy-good"></span>');
    } else if (
      (rec.snapshot && (rec.snapshot.condition === 'slightlyBad' || rec.snapshot.condition === 'tough')) ||
      (rec.mood != null && rec.mood <= 2)
    ) {
      result.push('<span class="hn-rhy-dot hn-rhy-low"></span>');
    } else {
      result.push('<span class="hn-rhy-dot hn-rhy-normal"></span>');
    }
  }
  return result.join('');
}

// ─── Recovery Journey Rules ───────────────────────────────

function _journeySleepTrend(records) {
  const rec7  = _sliceDays(records, 7);
  const prev7 = _sliceBetweenDays(records, 7, 14);
  if (rec7.length < 3 || prev7.length < 3) return null;

  const recRate  = rec7.filter(_isGoodSleep).length  / rec7.length;
  const prevRate = prev7.filter(_isGoodSleep).length / prev7.length;

  if (recRate > prevRate + 0.20 && recRate >= 0.45) {
    return {
      id:   'journey_sleep_improving',
      text: 'この1〜2週間、\n少しずつ睡眠が落ち着いてきているようです',
      type: 'recovery',
    };
  }
  return null;
}

function _journeyFatigueTrend(records) {
  const rec7  = _sliceDays(records, 7);
  const prev7 = _sliceBetweenDays(records, 7, 14);
  if (rec7.length < 3 || prev7.length < 3) return null;

  const recFatigue  = rec7.filter(_isFatigue).length;
  const prevFatigue = prev7.filter(_isFatigue).length;

  if (prevFatigue >= 3 && recFatigue < prevFatigue - 1) {
    return {
      id:   'journey_fatigue_reducing',
      text: '最近、疲れが強い日の波が\n少し落ち着いてきているようです',
      type: 'recovery',
    };
  }
  return null;
}

function _journeyConditionRhythm(records) {
  const month30 = _sliceDays(records, 30);
  if (month30.length < 8) return null;

  const goodDays = month30.filter(_isGoodCondition).length;
  const ratio    = goodDays / month30.length;

  // 安定した体調が続いている場合
  if (ratio >= 0.55 && month30.length >= 10) {
    return {
      id:   'journey_condition_stable',
      text: 'この1ヶ月、\n体調が比較的落ち着いた日が続いているようです',
      type: 'stable',
    };
  }
  return null;
}

// ─── Emotional Climate Rules ─────────────────────────────

function _climateCalmBuilding(records) {
  const rec7  = _sliceDays(records, 7);
  const prev7 = _sliceBetweenDays(records, 7, 14);
  if (rec7.length < 3) return null;

  const recCalmRate = rec7.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _POS_EMOTIONS.includes(t); });
  }).length / rec7.length;

  const prevCalmRate = prev7.length > 0
    ? prev7.filter(function(r) {
        const tags = (r.emotions && r.emotions.tags) || [];
        return tags.some(function(t) { return _POS_EMOTIONS.includes(t); });
      }).length / prev7.length
    : 0;

  if (recCalmRate >= 0.50 && recCalmRate > prevCalmRate + 0.10) {
    return {
      id:      'climate_calm_building',
      text:    '穏やかな記録が、\n少し増えてきています',
      type:    'calm',
      climate: 'calm',
    };
  }
  return null;
}

function _climateTension(records, currentMode) {
  if (currentMode === 'anxious') return null; // 不安を増幅させない

  const rec7 = _sliceDays(records, 7);
  if (rec7.length < 4) return null;

  const tensionDays = rec7.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _NEG_EMOTIONS.includes(t); });
  });

  if (tensionDays.length / rec7.length > 0.50) {
    return {
      id:      'climate_tension',
      text:    '最近、少し張りつめる日が\n続いていたようです',
      type:    'tension',
      climate: 'tension',
    };
  }
  return null;
}

// ─── Gentle Experiment Rules ─────────────────────────────

function _experimentBySleep(records, currentMode) {
  const rec3 = _sliceDays(records, 3);
  if (rec3.length < 2) return null;
  const poorCount = rec3.filter(_isPoorSleep).length;
  if (poorCount < 2) return null;

  return {
    id:   'experiment_early_rest',
    text: '今夜は少し、\n早めに休む日を試してみますか？',
    type: 'sleep',
  };
}

function _experimentByFatigue(records) {
  const rec7 = _sliceDays(records, 7);
  if (rec7.length < 4) return null;
  if (rec7.filter(_isFatigue).length < 3) return null;

  return {
    id:   'experiment_rest_time',
    text: '今日は少し、\n休める時間があるといいですね',
    type: 'rest',
  };
}

function _experimentByMode(currentMode) {
  if (currentMode === 'anxious') {
    return {
      id:   'experiment_quiet_time',
      text: '少し静かな時間を作れると、\n体が休まりやすいかもしれません',
      type: 'calm',
    };
  }
  if (currentMode === 'tired') {
    return {
      id:   'experiment_reduce_load',
      text: '少し負荷を減らせる時間があると、\n体が助かるかもしれません',
      type: 'rest',
    };
  }
  return null;
}

// ─── Seasonal Awareness ───────────────────────────────────

function _seasonalObservation(records) {
  const month  = new Date().getMonth() + 1; // 1-12
  const season = _getSeason(month);
  const rec14  = _sliceDays(records, 14);
  const fatigue14 = rec14.filter(_isFatigue).length;

  if (_isSeasonalTransition(month)) {
    return {
      id:   'seasonal_transition',
      text: '季節の変わり目は、\nからだが変化に対応しようとしている時期です',
      type: 'seasonal',
    };
  }

  if (season === 'summer' && fatigue14 >= 4) {
    return {
      id:   'seasonal_summer_fatigue',
      text: '夏の疲れが出やすい時期かもしれません。\nからだの声を聞きながら過ごしましょう',
      type: 'seasonal',
    };
  }

  if (season === 'winter') {
    const poorSleep14 = rec14.filter(_isPoorSleep).length;
    if (poorSleep14 >= 4) {
      return {
        id:   'seasonal_winter_sleep',
        text: '冬は体が休息を求めやすい時期です。\n睡眠が短くなりやすいことがあります',
        type: 'seasonal',
      };
    }
  }

  return null;
}

// ─── Public: generateRecoveryJourney ─────────────────────

/**
 * Recovery journey card を生成 (0-1件)。
 * dots: 14日分の体調リズムドット HTML を含む。
 */
export function generateRecoveryJourney(context) {
  if (!context || context.dataRichness === 'sparse') return null;

  const records = context.recentRecords || [];
  const allRecords = context._allRecords || records;

  const rules = [
    function() { return _journeySleepTrend(allRecords); },
    function() { return _journeyFatigueTrend(allRecords); },
    function() { return _journeyConditionRhythm(allRecords); },
  ];

  let journey = null;
  for (const rule of rules) {
    try { journey = rule(); if (journey) break; } catch (_) {}
  }

  if (!journey) return null;

  return Object.assign({}, journey, {
    dots: _buildRhythmDots(allRecords),
  });
}

// ─── Public: generateEmotionalClimate ────────────────────

/**
 * Emotional climate card を生成 (0-1件)。
 * 感情を「良い/悪い」ではなく「気候」として扱う。
 */
export function generateEmotionalClimate(context) {
  if (!context || context.dataRichness === 'sparse') return null;

  const records     = context._allRecords || context.recentRecords || [];
  const currentMode = context.settingsProfile && context.settingsProfile.currentMode;

  const rules = [
    function() { return _climateCalmBuilding(records); },
    function() { return _climateTension(records, currentMode); },
  ];

  let climate = null;
  for (const rule of rules) {
    try { climate = rule(); if (climate) break; } catch (_) {}
  }

  if (climate && climate.climate) {
    try { recordClimateEntry(climate.climate); } catch (_) {}
  }

  return climate;
}

// ─── Public: generateGentleExperiment ────────────────────

/**
 * Gentle experiment を生成 (0-1件)。3日クールダウン付き。
 * 「命令」ではなく「試してみる」感覚。
 */
export function generateGentleExperiment(context) {
  if (!context) return null;
  if (!shouldShowExperiment()) return null;

  const records     = context._allRecords || context.recentRecords || [];
  const currentMode = context.settingsProfile && context.settingsProfile.currentMode;

  const rules = [
    function() { return _experimentByMode(currentMode); },
    function() { return _experimentBySleep(records, currentMode); },
    function() { return _experimentByFatigue(records); },
  ];

  for (const rule of rules) {
    try {
      const exp = rule();
      if (exp) {
        try { recordExperimentShown(exp.type); } catch (_) {}
        return exp;
      }
    } catch (_) {}
  }

  return null;
}

// ─── Public: generateSeasonalObservation ─────────────────

/** 季節的な観察を生成 (0-1件)。 */
export function generateSeasonalObservation(context) {
  if (!context || context.dataRichness === 'sparse') return null;
  const records = context._allRecords || context.recentRecords || [];
  try { return _seasonalObservation(records); } catch (_) { return null; }
}

// ─── Public: buildLifeRhythmContext ──────────────────────

/**
 * companion context を拡張して life rhythm context を返す。
 * 将来の AI provider hook として公開。
 */
export function buildLifeRhythmContext(state) {
  const ci = window.ippoCompanionIntelligence;
  const base = ci ? ci.buildCompanionContext(state) : {};

  const records = (state && state.records) || [];
  const month   = new Date().getMonth() + 1;

  return Object.assign({}, base, {
    _allRecords:   records,
    season:        _getSeason(month),
    month,
    isSeasonalTransition: _isSeasonalTransition(month),
    lifeRhythmMemory: (function() {
      try {
        const lrm = window.ippoLifeRhythmMemory;
        return lrm ? lrm.getLifeRhythmMemory() : null;
      } catch (_) { return null; }
    })(),
  });
}

// ─── Window 公開 ──────────────────────────────────────────

window.ippoRecoveryJourney = Object.freeze({
  generateRecoveryJourney,
  generateEmotionalClimate,
  generateGentleExperiment,
  generateSeasonalObservation,
  buildLifeRhythmContext,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('recovery-journey-loaded');
}
