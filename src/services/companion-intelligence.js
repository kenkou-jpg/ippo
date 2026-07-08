// ============================================================
//  ippo – src/services/companion-intelligence.js
//  PHASE 6: Companion Intelligence Layer
//
//  目的:
//  「自分を理解しやすくなった」体験を作る。
//  AI が答えを出すのではなく、理解を助ける。
//
//  設計原則:
//  - local-first / rule-based / lightweight
//  - post-save hook 経由で更新。render ごとには走らない
//  - 12h キャッシュ
//  - 禁止: LLM 呼び出し / 診断 / 断定 / 病名推測 / 不安誘導
//  - トーン: 「〜傾向があります」「〜ようです」「〜かもしれません」
// ============================================================

import { addPostSaveHook, getState }        from '../store/state.js';
import { getCompanionMemory, updateCompanionMemory } from './companion-memory.js';
import { QUESTION_TEMPLATES }               from '../insights/questions/templates.js';

// ─── キャッシュ ────────────────────────────────────────────

const _CACHE_KEY = 'ippo_companion_cache';
const _CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

let _contextCache = null;

function _readCache() {
  try {
    const raw = localStorage.getItem(_CACHE_KEY);
    if (!raw) return null;
    const { data, generatedAt, ttlMs } = JSON.parse(raw);
    if (Date.now() - new Date(generatedAt).getTime() > ttlMs) return null;
    return data;
  } catch (_) { return null; }
}

function _writeCache(data) {
  try {
    localStorage.setItem(_CACHE_KEY, JSON.stringify({
      data,
      generatedAt: new Date().toISOString(),
      ttlMs: _CACHE_TTL,
    }));
  } catch (_) {}
}

export function invalidateCompanionCache() {
  try { localStorage.removeItem(_CACHE_KEY); } catch (_) {}
  _contextCache = null;
}

// ─── Helpers ──────────────────────────────────────────────

function _sliceDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

const _NEG_EMOTIONS = ['anxious', 'irritated', 'down'];

// ─── Context Builder ──────────────────────────────────────

/**
 * 全データソースから companion context を構築。
 * post-save hook 経由で更新。render 毎には呼ばない。
 */
export function buildCompanionContext(state) {
  const records = (state && state.records) || [];
  const profile = (typeof window.getSettingsStore === 'function'
    ? window.getSettingsStore()
    : (state && state.settingsProfile)) || {};

  const recent14 = _sliceDays(records, 14);
  const recent30 = _sliceDays(records, 30);

  // 睡眠傾向 (30日)
  const goodSleepDays = recent30.filter(function(r) {
    return (r.snapshot && r.snapshot.sleep === 'wellSlept') ||
           (r.sleepQuality != null && r.sleepQuality <= 1);
  });
  const poorSleepDays = recent30.filter(function(r) {
    return (r.snapshot && (r.snapshot.sleep === 'hardlySlept' || r.snapshot.sleep === 'wokeUp')) ||
           (r.sleepQuality != null && r.sleepQuality >= 3);
  });

  // 体調傾向 (14日)
  const goodCondDays = recent14.filter(function(r) {
    return (r.snapshot && (r.snapshot.condition === 'great' || r.snapshot.condition === 'good')) ||
           (r.mood != null && r.mood >= 4);
  });
  const badCondDays = recent14.filter(function(r) {
    return (r.snapshot && (r.snapshot.condition === 'slightlyBad' || r.snapshot.condition === 'tough')) ||
           (r.mood != null && r.mood <= 2);
  });

  // 感情傾向 (14日)
  const negEmotionDays = recent14.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _NEG_EMOTIONS.includes(t); });
  });
  const anxiousDays = recent14.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.includes('anxious');
  });

  // 症状傾向 (14日)
  const symptomCounts = {};
  recent14.forEach(function(r) {
    (r.symptomDetails || []).forEach(function(d) {
      if (d && d.symptom) symptomCounts[d.symptom] = (symptomCounts[d.symptom] || 0) + 1;
    });
    (r.symptoms || []).forEach(function(s) {
      if (s) symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    });
  });
  const topSymptoms = Object.entries(symptomCounts)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 3)
    .map(function(e) { return { symptom: e[0], count: e[1] }; });

  // 疲労傾向 (14日)
  const fatigueDays = recent14.filter(function(r) {
    return (r.symptomDetails || []).some(function(d) { return d && d.symptom === 'だるさ'; }) ||
           (r.symptoms || []).some(function(s) { return s === 'だるさ' || s === '倦怠感'; });
  });

  const as = window.ippoAdaptiveSignals;
  const adaptiveSignals = (function() {
    if (!as) return null;
    try { return as.getAdaptiveSignals(); } catch (_) { return null; }
  })();

  const dataRichness = recent30.length >= 14 ? 'rich'
    : recent30.length >= 7 ? 'moderate' : 'sparse';

  return {
    settingsProfile:   profile,
    myDiseases:        (state && state.myDiseases) || [],
    lastPeriodDate:    (state && state.lastPeriodDate) || null,
    cycleLength:       (state && state.cycleLength) || 28,

    recentRecords:     recent14,

    sleepTendency: {
      goodDays: goodSleepDays.length,
      poorDays: poorSleepDays.length,
      total:    recent30.length,
    },
    conditionTendency: {
      goodDays: goodCondDays.length,
      badDays:  badCondDays.length,
      total:    recent14.length,
    },
    emotionTendency: {
      negDays:     negEmotionDays.length,
      anxiousDays: anxiousDays.length,
      total:       recent14.length,
    },
    symptomTendency: {
      topSymptoms,
      fatigueDays: fatigueDays.length,
    },

    adaptiveSignals,
    companionMemory: getCompanionMemory(),
    dataRichness,
    generatedAt:     new Date().toISOString(),
  };
}

// ─── Reflection Rules ─────────────────────────────────────
//
// reflection は:
//   short / warm / emotionally safe
//   「〜ようです」「〜傾向があります」のみ。断定しない。

function _reflectionRecoveryStreak(ctx) {
  const { conditionTendency, recentRecords } = ctx;
  if (recentRecords.length < 5) return null;
  if (conditionTendency.goodDays < 4) return null;
  if (conditionTendency.badDays > 1) return null;

  return {
    id:   'reflection_recovery_streak',
    text: '最近、体調が落ち着いている日が\n続いているようです',
    type: 'positive',
  };
}

function _reflectionSleepStability(ctx) {
  const { sleepTendency } = ctx;
  if (sleepTendency.total < 7) return null;
  if (sleepTendency.goodDays < 4) return null;

  // 既存 recovery_positive インサイトと連動
  const eng = window.ippoInsightEngine;
  if (eng) {
    try {
      const cached = eng.getInsights();
      const linked = cached.find(function(i) { return i.id === 'recovery_positive'; });
      if (linked) {
        return {
          id:   'reflection_sleep_stability',
          text: '睡眠が安定した日は、\n全体の調子も落ち着きやすいようです',
          type: 'observation',
        };
      }
    } catch (_) {}
  }

  if (sleepTendency.goodDays >= 6) {
    return {
      id:   'reflection_sleep_stability',
      text: '睡眠が安定している日が\n続いているようです',
      type: 'observation',
    };
  }
  return null;
}

function _reflectionFatiguePattern(ctx) {
  const { symptomTendency, recentRecords } = ctx;
  if (recentRecords.length < 5) return null;
  if (symptomTendency.fatigueDays < 3) return null;

  const ratio = symptomTendency.fatigueDays / Math.min(recentRecords.length, 14);
  if (ratio < 0.4) return null;

  return {
    id:   'reflection_fatigue_pattern',
    text: '最近、疲れが続きやすい傾向が\nあるようです',
    type: 'observation',
  };
}

function _reflectionAnxietySomatic(ctx) {
  const { emotionTendency, recentRecords, settingsProfile } = ctx;
  if (recentRecords.length < 6) return null;
  if (emotionTendency.anxiousDays < 2) return null;

  // anxious モード中はこの reflection を抑制 (不安を増幅させない)
  if (settingsProfile && settingsProfile.currentMode === 'anxious') return null;

  const anxiousWithSymptoms = recentRecords.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    if (!tags.includes('anxious')) return false;
    return (r.symptomDetails && r.symptomDetails.length > 0) ||
           (r.symptoms && r.symptoms.length > 0);
  });

  if (anxiousWithSymptoms.length < 2) return null;

  return {
    id:   'reflection_anxiety_somatic',
    text: '不安を感じる日に、\nからだの症状も強くなりやすいようです',
    type: 'observation',
  };
}

function _reflectionContinuation(ctx) {
  const { recentRecords, dataRichness } = ctx;
  if (dataRichness !== 'rich') return null;
  if (recentRecords.length < 7) return null;

  return {
    id:   'reflection_continuation',
    text: '記録を続けることで、\nあなただけの傾向が少しずつ見えてきています',
    type: 'encouragement',
  };
}

// ─── Gentle Suggestion Rules ──────────────────────────────
//
// 提案は:
//   optional / low-pressure / emotionally safe
//   「命令」ではない。「〜かもしれません」「〜があると」

function _suggestionByCurrentMode(ctx) {
  const mode = ctx.settingsProfile && ctx.settingsProfile.currentMode;
  if (!mode) return null;

  const MAP = {
    tired:    '今日は少し、\n負荷を減らせる時間があると楽かもしれません',
    recovery: 'からだが回復しようとしているようです。\n無理せず過ごせるといいですね',
    anxious:  '今日は少し、\n静かに過ごせる時間があると楽かもしれません',
  };

  return MAP[mode]
    ? { id: 'suggestion_mode_' + mode, text: MAP[mode], type: 'suggestion' }
    : null;
}

function _suggestionBySleepPriority(ctx) {
  const focus = ctx.settingsProfile && ctx.settingsProfile.priorityFocus;
  if (focus !== 'sleep') return null;
  if (ctx.sleepTendency.poorDays < 3) return null;

  return {
    id:   'suggestion_sleep_priority',
    text: '眠りが浅い夜は、\n環境を少し整えるだけで変わることがあります',
    type: 'suggestion',
  };
}

// ─── Public: generateReflections ──────────────────────────

/**
 * gentle reflections を生成 (0-2件)。
 * displayStyle === 'gentle' → max 1件。
 */
export function generateReflections(context) {
  if (!context || context.dataRichness === 'sparse') return [];

  const displayStyle = context.settingsProfile && context.settingsProfile.displayStyle;

  const rules = [
    function() { return _reflectionRecoveryStreak(context); },
    function() { return _reflectionSleepStability(context); },
    function() { return _reflectionFatiguePattern(context); },
    function() { return _reflectionAnxietySomatic(context); },
    function() { return _reflectionContinuation(context); },
  ];

  const results = [];
  for (const rule of rules) {
    try {
      const r = rule();
      if (r) results.push(r);
    } catch (_) {}
    if (results.length >= 2) break;
  }

  const max = displayStyle === 'gentle' ? 1 : 2;
  return results.slice(0, max);
}

// ─── Public: generateGentleSuggestion ─────────────────────

/**
 * gentle suggestion を生成 (0-1件)。
 * 「命令」ではなく「かもしれません」トーン。
 */
export function generateGentleSuggestion(context) {
  if (!context) return null;

  const rules = [
    function() { return _suggestionByCurrentMode(context); },
    function() { return _suggestionBySleepPriority(context); },
  ];

  for (const rule of rules) {
    try {
      const s = rule();
      if (s) return s;
    } catch (_) {}
  }

  return null;
}

// ─── Public: rankInsightPriorities ────────────────────────

/**
 * settingsProfile + companionMemory に基づいてインサイト配列を並べ替え。
 * 副作用なし (純粋関数)。
 */
export function rankInsightPriorities(insights, context) {
  if (!Array.isArray(insights) || !context) return insights;

  const { settingsProfile, companionMemory } = context;
  const priorityFocus = settingsProfile && settingsProfile.priorityFocus;
  const currentMode   = settingsProfile && settingsProfile.currentMode;
  const avoided       = (companionMemory && companionMemory.avoidedTopics) || [];
  const preferred     = (companionMemory && companionMemory.preferredTopics) || [];

  let ranked = insights.slice();

  // anxious → emotion_pattern を後方へ
  if (currentMode === 'anxious') {
    ranked = ranked.filter(function(i) { return i.priorityKey !== 'emotion_pattern'; })
      .concat(ranked.filter(function(i) { return i.priorityKey === 'emotion_pattern'; }));
  }

  // avoidedTopics を後方へ
  if (avoided.length > 0) {
    ranked = ranked.filter(function(i) { return !avoided.includes(i.priorityKey); })
      .concat(ranked.filter(function(i) { return avoided.includes(i.priorityKey); }));
  }

  // priorityFocus に合うインサイトを先頭へ
  const FOCUS_MAP = {
    'sleep':                 'sleep_pain',
    'cycle':                 'cycle_mood',
    'symptom_understanding': 'symptom_pattern',
    '感情整理':              'emotion_pattern',
  };
  const focusKey = FOCUS_MAP[priorityFocus];
  if (focusKey) {
    ranked = ranked.filter(function(i) { return i.priorityKey === focusKey; })
      .concat(ranked.filter(function(i) { return i.priorityKey !== focusKey; }));
  }

  // preferredTopics (最後に来た順で先頭へ)
  for (let i = preferred.length - 1; i >= 0; i--) {
    const pref = preferred[i];
    ranked = ranked.filter(function(ins) { return ins.priorityKey === pref; })
      .concat(ranked.filter(function(ins) { return ins.priorityKey !== pref; }));
  }

  return ranked;
}

// ─── Public: getCompanionContext ──────────────────────────

export function getCompanionContext() {
  if (_contextCache) return _contextCache;

  const cached = _readCache();
  if (cached) {
    _contextCache = cached;
    return cached;
  }

  const state = getState();
  if (!state) return null;

  const ctx = buildCompanionContext(state);
  _writeCache(ctx);
  _contextCache = ctx;
  return ctx;
}

// ─── Question Layer (PR-P2-02 小規模初期セット) ────────────
//
// 「一緒に考えるための問い」。診断ではない。
// 週1件を上限とし、同じ問いは2週間以内に再表示しない。

const _Q_STATE_KEY   = 'ippo_question_state';
const _Q_WEEK_MS      = 7 * 24 * 60 * 60 * 1000;
const _Q_TWO_WEEK_MS  = 14 * 24 * 60 * 60 * 1000;

function _readQuestionState() {
  try {
    const raw = JSON.parse(localStorage.getItem(_Q_STATE_KEY));
    return (raw && typeof raw === 'object') ? raw : { lastShownAt: null, byId: {} };
  } catch (_) {
    return { lastShownAt: null, byId: {} };
  }
}

function _writeQuestionState(s) {
  try { localStorage.setItem(_Q_STATE_KEY, JSON.stringify(s)); } catch (_) {}
}

/**
 * 今週表示すべき問いかけを1件返す（なければ null）。
 * 副作用なし（表示確定は recordQuestionShown で別途記録する）。
 */
export function getWeeklyQuestion(context) {
  if (!context) return null;

  const state = _readQuestionState();
  if (state.lastShownAt && (Date.now() - new Date(state.lastShownAt).getTime()) < _Q_WEEK_MS) {
    return null;
  }

  for (const tmpl of QUESTION_TEMPLATES) {
    let matches = false;
    try { matches = !!tmpl.check(context); } catch (_) { matches = false; }
    if (!matches) continue;

    const rec = state.byId[tmpl.id];
    if (rec && rec.lastShownAt && (Date.now() - new Date(rec.lastShownAt).getTime()) < _Q_TWO_WEEK_MS) {
      continue;
    }
    return { id: tmpl.id, prompt: tmpl.prompt, options: tmpl.options };
  }
  return null;
}

/** 問いを表示したことを記録する（週次上限・2週間非再表示の基準時刻を更新）。 */
export function recordQuestionShown(questionId) {
  const state = _readQuestionState();
  const now = new Date().toISOString();
  state.lastShownAt = now;
  state.byId[questionId] = Object.assign({}, state.byId[questionId], { lastShownAt: now });
  _writeQuestionState(state);
}

/** ユーザーの回答を保存する。 */
export function answerQuestion(questionId, value) {
  const state = _readQuestionState();
  state.byId[questionId] = Object.assign({}, state.byId[questionId], {
    answer: value,
    answeredAt: new Date().toISOString(),
  });
  _writeQuestionState(state);
}

// ─── Post-save hook ───────────────────────────────────────

function _onPostSave() {
  invalidateCompanionCache();

  const state = getState();
  if (!state) return;

  const ctx = buildCompanionContext(state);
  _writeCache(ctx);
  _contextCache = ctx;

  // companionMemory 軽量更新
  const eng = window.ippoInsightEngine;
  const activeTopics = [];
  if (eng) {
    try {
      eng.getInsights().forEach(function(i) {
        if (i.priorityKey) activeTopics.push(i.priorityKey);
      });
    } catch (_) {}
  }

  updateCompanionMemory({
    settingsProfile: (typeof window.getSettingsStore === 'function'
      ? window.getSettingsStore()
      : state.settingsProfile),
    activeInsightTopics: activeTopics,
  });
}

addPostSaveHook(function() {
  setTimeout(_onPostSave, 0); // async, non-blocking
});

// ─── Window 公開 ──────────────────────────────────────────

window.ippoCompanionIntelligence = Object.freeze({
  buildCompanionContext,
  generateReflections,
  generateGentleSuggestion,
  rankInsightPriorities,
  getCompanionContext,
  invalidateCompanionCache,
  getWeeklyQuestion,
  recordQuestionShown,
  answerQuestion,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('companion-intelligence-loaded');
}
