// ============================================================
//  ippo – src/services/gentle-tendency.js
//  PHASE 5: Gentle Tendency Engine
//
//  設計原則:
//  - rule-based のみ。LLM / ML / AI 推論なし
//  - 観察支援トーン: 「〜傾向があります」「〜ようです」
//  - 禁止: 診断・断定・病名推論・不安誘導・「あなたは〜」
//  - PHASE 4 adaptive signals を入力ソースとして活用
//  - currentMode (tired/recovery/anxious) 対応
//  - PHASE 6 用 stubs を公開
//
//  新規ルール (insight-engine.js / insight-tendency.js と重複なし):
//  1. recovery_positive      — 良眠日→体調安定 (positive観察)
//  2. cycle_swelling         — 黄体期×むくみ相関
//  3. adaptive_synthesis     — adaptive responses→パーソナル観察
//  4. mood_condition_link    — snapshot.condition×emotion tags相関
// ============================================================

// ─── Helpers ─────────────────────────────────────────────────

function _sliceDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

// 黄体期判定 (insight-engine.js と同アルゴリズム)
function _isLuteal(r, lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return false;
  const d     = new Date(r.date || r.record_date || '');
  const last  = new Date(lastPeriodDate + 'T00:00:00');
  const dayNum  = Math.floor((d - last) / 86400000) + 1;
  const normDay = ((dayNum - 1) % cycleLength) + 1;
  return normDay >= (cycleLength - 7) && normDay <= cycleLength;
}

// ─── Adaptive Response Insights registry ─────────────────────
// questionId → personalized insight definition
// "感覚の観察" トーン: 医療問診にならないよう注意

const _ADAPTIVE_RESPONSE_INSIGHTS = {
  leg_heaviness: {
    yesAnswer: 'はい',
    threshold:  2,
    main: 'むくみの日に\n足の重さも出やすいようです',
    sub:  'むくみと足の重さが一緒に現れることが多いようです。記録を続けることで変化が見えてきます。',
    priorityKey: 'symptom_pattern',
  },
  light_sensitivity: {
    yesAnswer: 'はい',
    threshold:  2,
    main: '頭痛の日に\n光が気になることがあるようです',
    sub:  '頭痛と光への感度が重なっていることが多いようです。',
    priorityKey: 'symptom_pattern',
  },
  fatigue_recovery: {
    yesAnswer: 'はい',
    threshold:  2,
    main: '疲れが抜けにくい\n日が続いているようです',
    sub:  '休んでも回復しにくい状態が続いています。からだが充電を必要としているサインかもしれません。',
    priorityKey: 'sleep_pain',
  },
  abdomen_detail: {
    yesAnswer: null, // any answer counts
    threshold:  3,
    main: '腹部の症状が\n続いているようです',
    sub:  '腹部の違和感を詳しく記録し続けることで、パターンが見えてきます。',
    priorityKey: 'symptom_pattern',
  },
};

// ─── Rule 1: recovery_positive ────────────────────────────────
// 良眠日 → 体調安定のポジティブ観察
// 既存の「睡眠が悪い→症状悪化」パターンとは逆のポジティブ角度

function _ruleRecoveryPositive(records) {
  const month = _sliceDays(records, 30);
  if (month.length < 7) return null;

  const goodSleepDays = month.filter(function(r) {
    const snapshotGood = r.snapshot && r.snapshot.sleep === 'wellSlept';
    const legacyGood   = r.sleepQuality != null && r.sleepQuality <= 1;
    return snapshotGood || legacyGood;
  });

  if (goodSleepDays.length < 4) return null;

  const withGoodCondition = goodSleepDays.filter(function(r) {
    const snapshotOK = r.snapshot && (r.snapshot.condition === 'great' || r.snapshot.condition === 'good');
    const legacyOK   = r.mood != null && r.mood >= 4;
    return snapshotOK || legacyOK;
  });

  const rate = withGoodCondition.length / goodSleepDays.length;
  if (rate < 0.55) return null;

  const pct = Math.round(rate * 100);

  return {
    id:          'recovery_positive',
    type:        'pattern',
    tier:        'free',
    priorityKey: 'sleep_pain',
    main:        '睡眠が落ち着いた日は\nからだの調子も安定しやすいようです',
    sub:         `過去30日の記録から、よく眠れた日の約${pct}%で体調も落ち着いている傾向が見られます。`,
    action:      null,
    reason:      `good_sleep→good_condition: ${withGoodCondition.length}/${goodSleepDays.length} (${pct}%) >= 55%`,
    ruleId:      'RULE_RECOVERY_POSITIVE',
    evidenceDays: withGoodCondition.length,
    confidence:  Math.min(1, rate),
    diseaseKey:  null,
    _source:     'gentle_tendency',
  };
}

// ─── Rule 2: cycle_swelling ──────────────────────────────────
// 黄体期 × むくみ相関 (swelling specific)
// 既存 cycle_mood / luteal_fatigue とは別の symptom 対象

function _ruleCycleSwelling(records, context) {
  if (!context.lastPeriodDate || !context.cycleLength) return null;

  const twoMonth = _sliceDays(records, 60);
  if (twoMonth.length < 8) return null;

  const cl   = context.cycleLength;
  const last = context.lastPeriodDate;

  const lutealDays = twoMonth.filter(function(r) { return _isLuteal(r, last, cl); });
  const otherDays  = twoMonth.filter(function(r) { return !_isLuteal(r, last, cl); });

  if (lutealDays.length < 3) return null;

  function _hasSwelling(r) {
    const fromDetails = (r.symptomDetails || []).some(function(d) { return d && d.symptom === 'むくみ'; });
    const fromLegacy  = (r.symptoms || []).includes('むくみ');
    return fromDetails || fromLegacy;
  }

  const lutealSwelling = lutealDays.filter(_hasSwelling).length;
  const otherRate      = otherDays.length > 0
    ? otherDays.filter(_hasSwelling).length / otherDays.length
    : 0;
  const lutealRate = lutealSwelling / lutealDays.length;

  if (lutealSwelling < 2 || lutealRate < 0.35 || lutealRate <= otherRate * 1.3) return null;

  return {
    id:          'cycle_swelling',
    type:        'pattern',
    tier:        'free',
    priorityKey: 'cycle_mood',
    main:        '周期の後半に\nむくみが出やすい傾向があります',
    sub:         `生理前の時期にむくみが${lutealSwelling}日記録されています。からだが水分を溜めやすい時期かもしれません。`,
    action:      null,
    reason:      `luteal_swelling: ${lutealSwelling}/${lutealDays.length} (${Math.round(lutealRate * 100)}%) vs other=${Math.round(otherRate * 100)}%`,
    ruleId:      'RULE_CYCLE_SWELLING',
    evidenceDays: lutealSwelling,
    confidence:  Math.min(1, lutealSwelling / 4),
    diseaseKey:  null,
    _source:     'gentle_tendency',
  };
}

// ─── Rule 3: adaptive_synthesis ──────────────────────────────
// PHASE 4 adaptive responses → パーソナライズされた観察
// adaptive question への回答パターンから傾向を生成

function _ruleAdaptiveSynthesis() {
  const svc = window.ippoAdaptiveSignals;
  if (!svc) return null;

  var signals;
  try { signals = svc.getAdaptiveSignals(); } catch (_) { return null; }

  const responses = signals.adaptiveResponses || [];
  if (responses.length < 2) return null;

  // questionId ごとの "肯定" 回答数を集計
  const yesCounts  = {};
  const anyCounts  = {};  // yesAnswer===null の質問用

  for (const r of responses) {
    if (!r.questionId) continue;
    const def = _ADAPTIVE_RESPONSE_INSIGHTS[r.questionId];
    if (!def) continue;

    anyCounts[r.questionId] = (anyCounts[r.questionId] || 0) + 1;

    if (def.yesAnswer === null || r.answer === def.yesAnswer) {
      yesCounts[r.questionId] = (yesCounts[r.questionId] || 0) + 1;
    }
  }

  // 閾値を超えた質問を探す (yes count 優先、any count で補完)
  const matches = Object.entries(_ADAPTIVE_RESPONSE_INSIGHTS)
    .map(function([qid, def]) {
      const count = def.yesAnswer === null ? (anyCounts[qid] || 0) : (yesCounts[qid] || 0);
      return { qid, def, count };
    })
    .filter(function(m) { return m.count >= m.def.threshold; })
    .sort(function(a, b) { return b.count - a.count; });

  if (matches.length === 0) return null;

  const { qid, def, count } = matches[0];

  return {
    id:          'adaptive_synthesis_' + qid,
    type:        'pattern',
    tier:        'free',
    priorityKey: def.priorityKey,
    main:        def.main,
    sub:         def.sub,
    action:      null,
    reason:      `adaptive_response.${qid}: ${count} confirmations >= ${def.threshold}`,
    ruleId:      'RULE_ADAPTIVE_SYNTHESIS',
    evidenceDays: count,
    confidence:  Math.min(1, count / 5),
    diseaseKey:  null,
    _source:     'gentle_tendency',
  };
}

// ─── Rule 4: mood_condition_link ──────────────────────────────
// snapshot.condition × emotion tags 相関
// 3カード固有の snapshot データを活用 (既存ルールとは入力ソースが異なる)

function _ruleMoodConditionLink(records) {
  const month = _sliceDays(records, 30);
  if (month.length < 6) return null;

  const _NEGATIVE_EMOTIONS = ['anxious', 'irritated', 'down'];

  // 体調が低め (snapshot または legacy)
  const lowCondDays = month.filter(function(r) {
    const snapshotBad = r.snapshot && (r.snapshot.condition === 'slightlyBad' || r.snapshot.condition === 'tough');
    const legacyBad   = r.mood != null && r.mood <= 2;
    return snapshotBad || legacyBad;
  });

  if (lowCondDays.length < 3) return null;

  // その日に感情タグがネガティブか
  const withNegEmotion = lowCondDays.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _NEGATIVE_EMOTIONS.includes(t); });
  });

  if (withNegEmotion.length < 3) return null;

  const rate = withNegEmotion.length / lowCondDays.length;
  if (rate < 0.50) return null;

  return {
    id:          'mood_condition_link',
    type:        'pattern',
    tier:        'free',
    priorityKey: 'emotion_pattern',
    main:        '気持ちが揺れる日は\nからだも影響を受けやすいようです',
    sub:         `体の調子が低い日に感情の揺れが重なることが${withNegEmotion.length}日見られます。こころとからだはつながっています。`,
    action:      null,
    reason:      `low_condition→neg_emotion: ${withNegEmotion.length}/${lowCondDays.length} (${Math.round(rate * 100)}%) >= 50%`,
    ruleId:      'RULE_MOOD_CONDITION_LINK',
    evidenceDays: withNegEmotion.length,
    confidence:  Math.min(1, withNegEmotion.length / 6),
    diseaseKey:  null,
    _source:     'gentle_tendency',
  };
}

// ─────────────────────────────────────────────────────────────
//  Public: computeGentleTendencies
//  insight-engine.js の _runEngine() から呼ばれる
// ─────────────────────────────────────────────────────────────

/**
 * 全 gentle tendency ルールを実行してインサイト配列を返す。
 * 純粋関数ではない (_ruleAdaptiveSynthesis が window.ippoAdaptiveSignals を参照)。
 */
export function computeGentleTendencies(records, context) {
  const rules = [
    function() { return _ruleRecoveryPositive(records); },
    function() { return _ruleCycleSwelling(records, context); },
    function() { return _ruleAdaptiveSynthesis(); },
    function() { return _ruleMoodConditionLink(records); },
  ];

  const results = [];
  for (const rule of rules) {
    try {
      const insight = rule();
      if (insight) results.push(insight);
    } catch(e) {
      console.warn('[gentle-tendency] rule error:', e);
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
//  Gentle Tone Guard
//  currentMode に応じてインサイトを調整する
//  displayStyle は insight-tendency.filterByProfile が担当
// ─────────────────────────────────────────────────────────────

/**
 * currentMode に基づいてインサイト配列を調整。
 * 'tired' / 'recovery' → recovery_positive を先頭に
 * 'anxious'            → emotion_pattern を除外
 */
export function applyGentleToneGuard(insights, currentMode) {
  if (!Array.isArray(insights) || !currentMode) return insights;

  if (currentMode === 'tired' || currentMode === 'recovery') {
    return insights.slice().sort(function(a, b) {
      if (a.id === 'recovery_positive') return -1;
      if (b.id === 'recovery_positive') return  1;
      return 0;
    });
  }

  if (currentMode === 'anxious') {
    // 感情フォーカスのインサイトはスキップ (不安を増幅させない)
    return insights.filter(function(i) { return i.priorityKey !== 'emotion_pattern'; });
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────
//  PHASE 6 preparation stubs
//  将来の AI-assisted insight generation 用 hook
// ─────────────────────────────────────────────────────────────

/**
 * PHASE 6: gentle insight generation (local-first).
 * companion-intelligence.js の generateReflections に委譲。
 * 将来 AI provider を差し込む場合はここを置き換える。
 */
export function generateGentleInsight(context) {
  const ci = window.ippoCompanionIntelligence;
  if (!ci || !context) return null;
  try {
    const refs = ci.generateReflections(context);
    if (!refs || refs.length === 0) return null;
    return { text: refs[0].text, type: refs[0].type };
  } catch (_) {
    return null;
  }
}

/**
 * PHASE 6: gentle suggestion synthesis (local-first).
 * companion-intelligence.js の generateGentleSuggestion に委譲。
 */
export function generateAdaptiveSuggestion(signals, context) {
  const ci = window.ippoCompanionIntelligence;
  if (!ci || !context) return null;
  try {
    return ci.generateGentleSuggestion(context);
  } catch (_) {
    return null;
  }
}

/**
 * PHASE 6: full tendency context builder (local-first).
 * companion-intelligence.js の buildCompanionContext に委譲。
 * 将来 AI provider へのコンテキスト渡しに使う。
 */
export function buildTendencyContext(state) {
  const ci = window.ippoCompanionIntelligence;
  if (ci && state) {
    try {
      return ci.buildCompanionContext(state);
    } catch (_) {}
  }

  // フォールバック (companion-intelligence 未ロード時)
  const as = window.ippoAdaptiveSignals;
  return {
    symptoms:        [],
    emotions:        [],
    sleepPatterns:   null,
    cycle:           null,
    adaptiveSignals: as ? (function() { try { return as.getAdaptiveSignals(); } catch(_) { return null; } })() : null,
    settingsProfile: (typeof window.getSettingsStore === 'function'
      ? window.getSettingsStore()
      : (state && state.settingsProfile)) || null,
  };
}

// ─── Window 公開 (devtools / PHASE 6 用) ─────────────────────

window.ippoGentleTendency = Object.freeze({
  computeGentleTendencies,
  applyGentleToneGuard,
  generateGentleInsight,
  generateAdaptiveSuggestion,
  buildTendencyContext,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('gentle-tendency-loaded');
}
