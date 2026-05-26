// ============================================================
//  ippo – src/services/insight-tendency.js
//  PHASE 3: symptomDetails / emotions linkage + tendency layer
//
//  設計原則:
//  - 純粋関数のみ。副作用なし
//  - 観察支援トーン: 診断・断定・恐怖訴求 禁止
//    OK: 「〜傾向があります」「〜が増えているようです」
//    NG: 「〜かもしれません」「危険です」「○○です」
//  - rule-based / lightweight のみ (LLM不要)
//  - displayStyle / priorityFocus フィルタ
// ============================================================

// ─── Constants ───────────────────────────────────────────────

const _SEV_SCORE = { '軽い': 1, '中くらい': 2, '強い': 3 };

const _EMOTION_LABELS = {
  calm:      '穏やか',
  happy:     'うれしい',
  relaxed:   'リラックス',
  anxious:   '不安',
  irritated: 'イライラ',
  down:      '落ち込み',
  grateful:  '感謝',
  positive:  '前向き',
  neutral:   'ふつう',
};

const _NEGATIVE_EMOTIONS = ['anxious', 'irritated', 'down'];

const _SYM_SOMATIC = ['頭痛', '吐き気', '腹部膨満', '下腹部痛', '倦怠感', '腰痛'];

const _STRESS_KEYWORDS  = ['疲れ', '辛い', 'つらい', '苦しい', 'しんどい', '眠れ', '不安', 'イライラ', '心配', 'ストレス'];
const _POSITIVE_KEYWORDS = ['楽しい', '元気', 'よかった', '快適', 'すっきり', 'リラックス', '穏やか'];

// ─── Helpers ─────────────────────────────────────────────────

function _sliceDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

function _hasSym(r, list) {
  return (r.symptoms || []).some(function(s) { return list.includes(s); });
}

function _sortByDate(records) {
  return records.slice().sort(function(a, b) {
    return new Date(a.date || a.record_date) - new Date(b.date || b.record_date);
  });
}

// ─── Memo keyword extraction ──────────────────────────────────

function _extractMemoSignals(memo) {
  const signals = [];
  const text = String(memo || '');
  for (const kw of _STRESS_KEYWORDS) {
    if (text.includes(kw)) { signals.push('stress_signal'); break; }
  }
  for (const kw of _POSITIVE_KEYWORDS) {
    if (text.includes(kw)) { signals.push('positive_signal'); break; }
  }
  return signals;
}

// ─────────────────────────────────────────────────────────────
//  Public: Aggregation
// ─────────────────────────────────────────────────────────────

/**
 * symptomDetails[] を症状ごとに集計する。
 * @returns { [symptomLabel]: { count, severityFreq, maxSevScore, types, locations } }
 */
export function extractSymptomDetailStats(records, days) {
  const window = _sliceDays(records, days || 30);
  const stats = {};

  for (const r of window) {
    for (const detail of (r.symptomDetails || [])) {
      if (!detail || !detail.symptom) continue;
      const key = detail.symptom;
      if (!stats[key]) {
        stats[key] = { count: 0, severityFreq: {}, maxSevScore: 0, types: {}, locations: {} };
      }
      stats[key].count++;
      if (detail.severity) {
        stats[key].severityFreq[detail.severity] = (stats[key].severityFreq[detail.severity] || 0) + 1;
        const score = _SEV_SCORE[detail.severity] || 0;
        if (score > stats[key].maxSevScore) stats[key].maxSevScore = score;
      }
      for (const t of (detail.types || [])) {
        stats[key].types[t] = (stats[key].types[t] || 0) + 1;
      }
      for (const l of (detail.locations || [])) {
        stats[key].locations[l] = (stats[key].locations[l] || 0) + 1;
      }
    }
  }

  return stats;
}

/**
 * emotions.tags / memo を集計する。
 * @returns { tagFreq, dominantNegative, memoSignals, recordCount }
 */
export function extractEmotionStats(records, days) {
  const window = _sliceDays(records, days || 30);
  const tagFreq = {};
  const allMemoSignals = [];

  for (const r of window) {
    const tags = (r.emotions && r.emotions.tags) || [];
    for (const tag of tags) {
      tagFreq[tag] = (tagFreq[tag] || 0) + 1;
    }
    const memo = (r.emotions && r.emotions.memo) || '';
    if (memo.length > 0) {
      allMemoSignals.push(..._extractMemoSignals(memo));
    }
  }

  const negCounts = _NEGATIVE_EMOTIONS
    .filter(function(e) { return (tagFreq[e] || 0) >= 2; })
    .sort(function(a, b) { return (tagFreq[b] || 0) - (tagFreq[a] || 0); });

  return {
    tagFreq,
    dominantNegative: negCounts[0] || null,
    memoSignals:      [...new Set(allMemoSignals)],
    recordCount:      window.length,
  };
}

// ─────────────────────────────────────────────────────────────
//  Tendency Rules (pure, return insight object or null)
// ─────────────────────────────────────────────────────────────

/**
 * symptomDetails の「強い」severity パターン
 * 14日間で同じ症状が「強い」と記録されている場合に通知
 */
function _ruleSymptomSeverity(records) {
  const stats = extractSymptomDetailStats(records, 14);
  const entries = Object.entries(stats);
  if (entries.length === 0) return null;

  const strongSymptoms = entries
    .filter(function(e) { return (e[1].severityFreq['強い'] || 0) >= 2; })
    .sort(function(a, b) {
      return (b[1].severityFreq['強い'] || 0) - (a[1].severityFreq['強い'] || 0);
    });

  if (strongSymptoms.length === 0) return null;

  const topLabel = strongSymptoms[0][0];
  const strongCount = strongSymptoms[0][1].severityFreq['強い'];

  return {
    id:          'symptom_severity_pattern',
    type:        'pattern',
    tier:        'free',
    priorityKey: 'symptom_pattern',
    main:        `${topLabel}が強めの日が\n続いているようです`,
    sub:         `最近14日で「強い」と記録した日が${strongCount}日あります。無理せず休める時間を作ってみて。`,
    action:      null,
    reason:      `symptomDetails.severity.strong: ${topLabel}=${strongCount}/14d >= 2`,
    ruleId:      'RULE_SYMPTOM_SEVERITY',
    evidenceDays: strongCount,
    confidence:  Math.min(1, strongCount / 5),
    diseaseKey:  null,
    _source:     'tendency',
  };
}

/**
 * emotion tags の傾向 (不安 / イライラ / 落ち込み)
 * 30日間で同じネガティブ感情が3日以上記録されている
 */
function _ruleEmotionTendency(records) {
  const stats = extractEmotionStats(records, 30);
  if (!stats.dominantNegative || stats.recordCount < 5) return null;

  const tag   = stats.dominantNegative;
  const count = stats.tagFreq[tag] || 0;
  if (count < 3) return null;

  const label = _EMOTION_LABELS[tag] || tag;

  return {
    id:          'emotion_tendency',
    type:        'pattern',
    tier:        'free',
    priorityKey: 'emotion_pattern',
    main:        `${label}を感じる日が\n続いているようです`,
    sub:         `最近30日で${count}日、${label}の気持ちが記録されています。`,
    action:      null,
    reason:      `emotion_tag.${tag}=${count}/30d >= 3`,
    ruleId:      'RULE_EMOTION_TENDENCY',
    evidenceDays: count,
    confidence:  Math.min(1, count / 8),
    diseaseKey:  null,
    _source:     'tendency',
  };
}

/**
 * emotion × symptomDetails 相関
 * ネガティブ感情の日 → 身体症状も多い (40%以上 かつ 中立日の1.3倍以上)
 */
function _ruleEmotionSymptomLink(records) {
  const month = _sliceDays(records, 30);
  if (month.length < 6) return null;

  const negDays = month.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _NEGATIVE_EMOTIONS.includes(t); });
  });
  const neuDays = month.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return !tags.some(function(t) { return _NEGATIVE_EMOTIONS.includes(t); });
  });

  if (negDays.length < 3) return null;

  const negWithSomatic = negDays.filter(function(r) {
    return (r.symptomDetails || []).length > 0 || _hasSym(r, _SYM_SOMATIC);
  }).length;
  const neuWithSomatic = neuDays.length > 0
    ? neuDays.filter(function(r) {
        return (r.symptomDetails || []).length > 0 || _hasSym(r, _SYM_SOMATIC);
      }).length / neuDays.length
    : 0;

  const negRate = negWithSomatic / negDays.length;
  if (negRate < 0.40 || negRate <= neuWithSomatic * 1.3) return null;

  return {
    id:          'emotion_symptom_link',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'symptom_pattern',
    main:        '気持ちが落ちた日に\n身体症状も増えやすい傾向があります',
    sub:         `不安やイライラの日に、からだの症状が重なることが${negWithSomatic}日ありました。少し関連があるかもしれません。`,
    action:      null,
    reason:      `neg_emotion→somatic: ${negWithSomatic}/${negDays.length} (${Math.round(negRate * 100)}%) vs neutral=${Math.round(neuWithSomatic * 100)}%`,
    ruleId:      'RULE_EMOTION_SYMPTOM_LINK',
    evidenceDays: negWithSomatic,
    confidence:  Math.min(1, negWithSomatic / 5),
    diseaseKey:  null,
    _source:     'tendency',
  };
}

/**
 * sleep × symptomDetails 相関
 * 睡眠が乱れた日 → 翌日に symptomDetails の記録が増える
 * snapshot.sleep (3カード) と sleepQuality (レガシー) 両方に対応
 */
function _ruleSleepSymptomDetail(records) {
  const month = _sliceDays(records, 30);
  if (month.length < 6) return null;

  const sorted = _sortByDate(month);
  let matchAny = 0, total = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const today = sorted[i];
    const poorSleep =
      (today.snapshot && (today.snapshot.sleep === 'hardlySlept' || today.snapshot.sleep === 'wokeUp')) ||
      (today.sleepQuality != null && today.sleepQuality >= 3);
    if (!poorSleep) continue;
    total++;
    if ((sorted[i + 1].symptomDetails || []).length > 0) matchAny++;
  }

  if (total < 3 || matchAny < 2) return null;
  const rate = matchAny / total;
  if (rate < 0.40) return null;

  return {
    id:          'sleep_symptom_detail_link',
    type:        'pattern',
    tier:        'pro',
    priorityKey: 'sleep_pain',
    main:        '睡眠が乱れた日の翌日に\n症状が出やすい傾向があります',
    sub:         `過去30日の記録から、睡眠の乱れた翌日に症状の記録が${matchAny}日ありました。`,
    action:      null,
    reason:      `snapshot.sleep_poor→symptomDetails: ${matchAny}/${total} (${Math.round(rate * 100)}%) >= 40%`,
    ruleId:      'RULE_SLEEP_SYMPTOM_DETAIL',
    evidenceDays: matchAny,
    confidence:  Math.min(1, rate),
    diseaseKey:  null,
    _source:     'tendency',
  };
}

// ─────────────────────────────────────────────────────────────
//  Public: Compute all tendency insights
// ─────────────────────────────────────────────────────────────

/**
 * 全 tendency ルールを実行してインサイト配列を返す。
 * insight-engine.js の _runEngine() から呼ばれる。
 */
export function computeTendencyInsights(records, context) {
  const rules = [
    _ruleSymptomSeverity,
    _ruleEmotionTendency,
    _ruleEmotionSymptomLink,
    _ruleSleepSymptomDetail,
  ];

  const results = [];
  for (const rule of rules) {
    try {
      const insight = rule(records, context);
      if (insight) results.push(insight);
    } catch(e) {
      console.warn('[insight-tendency] rule error:', e);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
//  Public: displayStyle / priorityFocus filter
// ─────────────────────────────────────────────────────────────

const _FOCUS_KEY_MAP = {
  sleep:                  'sleep_pain',
  cycle:                  'cycle_mood',
  symptom_understanding:  'symptom_pattern',
  '感情整理':              'emotion_pattern',
  'emotion整理':           'emotion_pattern',
};

/**
 * displayStyle と priorityFocus に基づいてインサイト配列をフィルタ・並び替える。
 * displayStyle: 'gentle' | 'balanced' | 'deep'
 * priorityFocus: 'sleep' | 'cycle' | 'symptom_understanding' | 'emotion整理' | null
 */
export function filterByProfile(insights, displayStyle, priorityFocus) {
  if (!Array.isArray(insights) || insights.length === 0) return insights;

  let result = insights.slice();

  // displayStyle によるフィルタ
  if (displayStyle === 'gentle') {
    result = result.filter(function(i) { return i.tier === 'free'; });
    result = result.slice(0, 3);
  } else if (displayStyle === 'deep') {
    // すべて表示（制限なし）
  } else {
    // balanced: すべて、最大5件
    result = result.slice(0, 5);
  }

  // priorityFocus による優先順位調整
  if (priorityFocus) {
    const focusKey = _FOCUS_KEY_MAP[priorityFocus] || null;
    if (focusKey) {
      result.sort(function(a, b) {
        const aM = a.priorityKey === focusKey ? -1 : 0;
        const bM = b.priorityKey === focusKey ? -1 : 0;
        return aM - bM;
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
//  Public: Adaptive stubs (PHASE 4+)
// ─────────────────────────────────────────────────────────────

const _adaptiveSignals = [];

/** PHASE 4 用 stub。adaptive question 候補を登録する。 */
export function registerAdaptiveSignal(signal) {
  if (!signal || typeof signal !== 'object') return;
  _adaptiveSignals.push(signal);
}

/** PHASE 4 用 stub。登録済み adaptive 候補を返す。 */
export function getAdaptiveCandidates() {
  return _adaptiveSignals.slice();
}

// ─── Window 公開 (devtools / legacy script 用) ────────────────

window.ippoInsightTendency = Object.freeze({
  extractSymptomDetailStats,
  extractEmotionStats,
  computeTendencyInsights,
  filterByProfile,
  registerAdaptiveSignal,
  getAdaptiveCandidates,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('insight-tendency-loaded');
}
