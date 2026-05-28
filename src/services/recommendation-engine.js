// ============================================================
//  ippo – src/services/recommendation-engine.js
//  Phase D: Rule-Based Recommendation Engine
//
//  責務:
//  - context-engine.js のコンテキストに基づき、rule-based で推薦を生成
//  - priorityFocus → 優先コンテンツ / copy tone ルール
//  - currentMode  → insight 密度 / 回復提案ルール
//  - displayStyle → 表示圧力 / spacing ルール
//
//  出力:
//  - getRecommendations()  → Recommendation[] (優先度順)
//  - getAdaptiveCopy()     → トーン調整済みコピー文字列セット
//  - getInsightDensity()   → 'low' | 'medium' | 'high'
//
//  禁止: LLM / AI 呼び出し / 診断 / 断定 / 病名推測 / 不安誘導
//  トーン: 「〜かもしれません」「〜してみては」「〜ようです」「〜傾向があります」
//  禁止コピー: 励ましすぎ / 命令形 / 「必ず」「すべき」「〜してください」
// ============================================================

// ─── 型定義 (JSDoc) ──────────────────────────────────────────
/**
 * @typedef {object} Recommendation
 * @property {string}  id       - 一意 ID (重複排除用)
 * @property {string}  type     - 'recovery'|'insight'|'action'|'reflection'|'awareness'
 * @property {string}  text     - 表示テキスト（1-2 行）
 * @property {number}  priority - 1 = 最高優先、大きいほど低優先
 * @property {boolean} visible  - 現在のコンテキストで表示すべきか
 */

/**
 * @typedef {object} AdaptiveCopy
 * @property {string}      ctaLabel          - メイン CTA ラベル
 * @property {string}      insightSuffix     - インサイト末尾修飾語
 * @property {string|null} recoveryHint      - 回復モード用ヒント（null の場合は非表示）
 * @property {string}      homeGreetingStyle - 'gentle'|'neutral'|'supportive'
 * @property {string}      reflectionPrefix  - リフレクション冒頭語
 */

// ─── キャッシュ ────────────────────────────────────────────
var _CACHE_TTL = 5 * 60 * 1000; // 5 分 (context-engine と同期)
var _recCache  = null;
var _copyCache = null;

function _isCacheValid(cache) {
  if (!cache) return false;
  return (Date.now() - new Date(cache._generatedAt).getTime()) < _CACHE_TTL;
}

export function invalidateRecommendationCache() {
  _recCache  = null;
  _copyCache = null;
}

// ─── ルールレジストリ ────────────────────────────────────────
// 各ルールの conditions にマッチしたとき、text が推薦として返される。
//
// conditions:
//   modes:         string[]  — 対象 currentMode (空配列 = 全 mode)
//   priorities:    string[]  — 対象 priorityFocus (空 = 全)
//   cyclePhases:   string[]  — 対象 cyclePhase (空 = 全)
//   maxWeight:     number    — recommendationWeight がこれ以下のとき有効
//   minRichness:   string    — 'low'|'medium'|'high' 以上のデータ豊富さが必要
//   excludeModes:  string[]  — これらの mode では出さない

var _RULE_REGISTRY = [

  // ── 回復 / 休息モード推薦 ────────────────────────────────
  {
    id:         'recovery_take_rest',
    type:       'recovery',
    conditions: { modes: ['tired', 'recovery', 'slow', 'overworked'], maxWeight: 0.40 },
    text:       'ゆっくり休む時間を、意識的に作れていますか？',
    priority:   1,
  },
  {
    id:         'recovery_no_pressure',
    type:       'recovery',
    conditions: { modes: ['tired', 'recovery', 'slow'], maxWeight: 0.35 },
    text:       '今日は「やらないこと」を決めるだけでも、十分かもしれません。',
    priority:   2,
  },
  {
    id:         'recovery_overwork_pause',
    type:       'recovery',
    conditions: { modes: ['overworked'], maxWeight: 0.45 },
    text:       '少し立ち止まって、からだに無理が来ていないか確認してみて。',
    priority:   2,
  },

  // ── 不安モード推薦 ───────────────────────────────────────
  {
    id:         'anxiety_body_check',
    type:       'awareness',
    conditions: { modes: ['anxious'], maxWeight: 0.50 },
    text:       'からだの感覚に、静かに気づいてみましょう。',
    priority:   1,
  },
  {
    id:         'anxiety_record_grounding',
    type:       'action',
    conditions: { modes: ['anxious'], maxWeight: 0.50 },
    text:       '今の状態を記録しておくと、後から振り返りやすくなることがあります。',
    priority:   3,
  },

  // ── 波あり / 揺れモード推薦 ─────────────────────────────
  {
    id:         'fluctuating_observe',
    type:       'insight',
    conditions: { modes: ['fluctuating'], maxWeight: 0.60 },
    text:       '波があるのは自然なことです。変化に気づくことが、理解への第一歩かもしれません。',
    priority:   2,
  },

  // ── priorityFocus: 睡眠 ─────────────────────────────────
  {
    id:         'sleep_focus_trend',
    type:       'insight',
    conditions: { priorities: ['sleep'], excludeModes: ['anxious'] },
    text:       '睡眠の質の変化が、翌日のからだに影響することがあります。',
    priority:   3,
  },
  {
    id:         'sleep_focus_pattern',
    type:       'reflection',
    conditions: { priorities: ['sleep'], minRichness: 'medium' },
    text:       '眠れた日とそうでない日の違いを、記録から探してみましょう。',
    priority:   4,
  },

  // ── priorityFocus: 周期 ─────────────────────────────────
  {
    id:         'cycle_focus_awareness',
    type:       'awareness',
    conditions: { priorities: ['cycle'], excludeModes: [] },
    text:       '今の周期フェーズを意識すると、からだの変化が読みやすくなることがあります。',
    priority:   3,
  },
  {
    id:         'cycle_menstrual_care',
    type:       'recovery',
    conditions: { priorities: ['cycle'], cyclePhases: ['menstrual'] },
    text:       '生理期間中です。からだへの負担を小さくすることを優先してみて。',
    priority:   2,
  },
  {
    id:         'cycle_luteal_heads_up',
    type:       'awareness',
    conditions: { priorities: ['cycle'], cyclePhases: ['luteal'] },
    text:       '生理前の時期は、気分やからだの変化が出やすい頃です。',
    priority:   3,
  },

  // ── priorityFocus: 症状理解 ─────────────────────────────
  {
    id:         'symptom_observe',
    type:       'insight',
    conditions: { priorities: ['symptom_understanding'], excludeModes: [] },
    text:       '症状を観察し続けることで、自分だけのパターンが見えてきます。',
    priority:   3,
  },
  {
    id:         'symptom_record_context',
    type:       'action',
    conditions: { priorities: ['symptom_understanding'], minRichness: 'low' },
    text:       '症状が出た時間帯や前後の状況も記録すると、傾向が分かりやすくなります。',
    priority:   4,
  },

  // ── priorityFocus: 感情整理 ─────────────────────────────
  {
    id:         'emotion_name_feeling',
    type:       'reflection',
    conditions: { priorities: ['emotion', 'anxiety_reduction'], excludeModes: [] },
    text:       '今の気持ちに、ひとつ名前をつけてみるのはどうでしょう。',
    priority:   3,
  },
  {
    id:         'emotion_body_link',
    type:       'insight',
    conditions: { priorities: ['emotion'], minRichness: 'medium' },
    text:       '気持ちとからだの変化には、つながりがあることがあります。',
    priority:   4,
  },

  // ── priorityFocus: 無理しない習慣 ───────────────────────
  {
    id:         'overwork_notice_signals',
    type:       'awareness',
    conditions: { priorities: ['overwork_prevention'], excludeModes: [] },
    text:       'からだのサインに早めに気づくことが、無理をしない習慣につながります。',
    priority:   3,
  },

  // ── priorityFocus: 記録習慣 ─────────────────────────────
  {
    id:         'habit_keep_going',
    type:       'reflection',
    conditions: { priorities: ['recording_habit'], minRichness: 'low' },
    text:       '記録を続けることで、気づきの解像度が上がっていきます。',
    priority:   4,
  },

  // ── データ豊富さ: データが少ない時の導入 ─────────────────
  {
    id:         'data_sparse_start',
    type:       'action',
    conditions: { minRichness: null, maxRichness: 'low', excludeModes: ['anxious'] },
    text:       'まずは今日のからだの状態を、一言でも記録してみましょう。',
    priority:   5,
  },
  {
    id:         'data_medium_pattern',
    type:       'insight',
    conditions: { minRichness: 'medium', excludeModes: [] },
    text:       '記録が増えてきました。傾向が見えてくる頃かもしれません。',
    priority:   6,
  },

  // ── 周期: 全 priority 共通 ──────────────────────────────
  {
    id:         'cycle_menstrual_general',
    type:       'recovery',
    conditions: {
      cyclePhases: ['menstrual'],
      excludeModes: [],
      priorities: [], // 全優先度
    },
    text:       '今日は、からだを最優先に過ごしていいです。',
    priority:   2,
  },

  // ── trackedConditions: 疾患固有の観察提案 ────────────────
  // 禁止: 断定 / 診断 / 病名での不安誘導
  // トーン: 「〜かもしれません」「〜を観察してみて」「〜参考になります」
  {
    id:         'pcos_diet_observation',
    type:       'awareness',
    conditions: { hasAnyCondition: ['PCOS'] },
    text:       '食後のだるさや眠気が続くとき、食事の順番や内容を記録しておくと傾向が見えやすくなります。',
    priority:   3,
  },
  {
    id:         'endo_recovery_emphasis',
    type:       'recovery',
    conditions: { hasAnyCondition: ['子宮内膜症', '子宮腺筋症'], maxWeight: 0.65 },
    text:       '炎症が高まりやすい時期は、からだへの負担を小さくすることを意識してみて。',
    priority:   2,
  },
  {
    id:         'ovarian_cyst_tension',
    type:       'awareness',
    conditions: { hasAnyCondition: ['卵巣嚢腫'] },
    text:       '腹部の張りや圧迫感の変化を記録しておくと、受診時の参考になることがあります。',
    priority:   3,
  },
  {
    id:         'pms_luteal_self_care',
    type:       'awareness',
    conditions: { hasAnyCondition: ['PMS/PMDD'], cyclePhases: ['luteal'] },
    text:       '生理前の時期は、刺激に敏感になりやすいことがあります。自分を責めないで。',
    priority:   2,
  },
  {
    id:         'uterine_fibroid_iron',
    type:       'awareness',
    conditions: { hasAnyCondition: ['子宮筋腫'] },
    text:       '経血量が多い日が続くとき、鉄分不足のサインが出やすくなることがあります。',
    priority:   3,
  },
];

// ─── ルール評価 ──────────────────────────────────────────────

function _evalCondition(rule, ctx) {
  var c = rule.conditions || {};

  // modes: 指定があれば一致チェック
  if (c.modes && c.modes.length > 0) {
    if (c.modes.indexOf(ctx.mode) === -1) return false;
  }

  // excludeModes: これらのモードでは除外
  if (c.excludeModes && c.excludeModes.length > 0) {
    if (c.excludeModes.indexOf(ctx.mode) !== -1) return false;
  }

  // priorities: 指定があれば一致チェック
  if (c.priorities && c.priorities.length > 0) {
    if (c.priorities.indexOf(ctx.priority) === -1) return false;
  }

  // cyclePhases: 指定があれば一致チェック
  if (c.cyclePhases && c.cyclePhases.length > 0) {
    if (!ctx.cyclePhase) return false;
    if (c.cyclePhases.indexOf(ctx.cyclePhase) === -1) return false;
  }

  // maxWeight: コンテキストの weight がこれを超えたら除外
  if (c.maxWeight != null && ctx.recommendationWeight > c.maxWeight) return false;

  // minRichness: データ豊富さが不足なら除外
  if (c.minRichness != null) {
    var richnessOrder = { low: 0, medium: 1, high: 2 };
    if ((richnessOrder[ctx.dataRichness] || 0) < (richnessOrder[c.minRichness] || 0)) return false;
  }

  // maxRichness: データが多すぎる場合に除外
  if (c.maxRichness != null) {
    var richnessOrderB = { low: 0, medium: 1, high: 2 };
    if ((richnessOrderB[ctx.dataRichness] || 0) > (richnessOrderB[c.maxRichness] || 0)) return false;
  }

  // hasAnyCondition: trackedConditions にいずれかが含まれる場合のみ有効
  // 疾患固有の観察提案に使用。設定されていない場合はスキップ。
  if (c.hasAnyCondition && c.hasAnyCondition.length > 0) {
    if (!ctx.hasTrackedConditions) return false;
    var condArr = ctx.trackedConditions || [];
    var hasMatch = c.hasAnyCondition.some(function(cond) {
      return condArr.indexOf(cond) !== -1;
    });
    if (!hasMatch) return false;
  }

  return true;
}

// ─── getRecommendations ──────────────────────────────────────
/**
 * 現在のコンテキストにマッチする推薦一覧を返す。
 *
 * @param {object} [opts]
 * @param {number}   [opts.limit=5]          - 最大返却数
 * @param {string[]} [opts.types]            - type フィルタ (空 = 全 type)
 * @param {boolean}  [opts.forceRefresh]     - キャッシュ無視
 * @returns {Recommendation[]}
 */
export function getRecommendations(opts) {
  opts = opts || {};
  var limit  = opts.limit  != null ? opts.limit  : 5;
  var types  = Array.isArray(opts.types) ? opts.types : [];
  var forceRefresh = !!opts.forceRefresh;

  if (!forceRefresh && _isCacheValid(_recCache)) {
    return _applyFilter(_recCache.items, types, limit);
  }

  var ctx = typeof window.getCompanionContext === 'function'
    ? window.getCompanionContext()
    : {};

  var matched = [];
  _RULE_REGISTRY.forEach(function(rule) {
    if (_evalCondition(rule, ctx)) {
      matched.push({
        id:       rule.id,
        type:     rule.type,
        text:     rule.text,
        priority: rule.priority,
        visible:  true,
      });
    }
  });

  // 優先度昇順 + 登録順安定ソート
  matched.sort(function(a, b) { return a.priority - b.priority; });

  _recCache = { items: matched, _generatedAt: new Date().toISOString() };
  return _applyFilter(matched, types, limit);
}

function _applyFilter(items, types, limit) {
  var result = items;
  if (types.length > 0) {
    result = result.filter(function(r) { return types.indexOf(r.type) !== -1; });
  }
  return result.slice(0, limit);
}

// ─── getAdaptiveCopy ─────────────────────────────────────────
/**
 * コンテキストに合わせたトーン調整済みコピー文字列を返す。
 *
 * @param {boolean} [forceRefresh=false]
 * @returns {AdaptiveCopy}
 */
export function getAdaptiveCopy(forceRefresh) {
  if (!forceRefresh && _isCacheValid(_copyCache)) return _copyCache.copy;

  var ctx = typeof window.getCompanionContext === 'function'
    ? window.getCompanionContext()
    : {};

  var mode  = ctx.mode  || 'neutral';
  var tone  = ctx.emotionalTone || 'neutral';

  // ── ctaLabel ──────────────────────────────────────────────
  var ctaLabel = '記録する';
  if (mode === 'tired' || mode === 'recovery' || mode === 'slow') {
    ctaLabel = '今日のからだを記録する';
  } else if (mode === 'anxious') {
    ctaLabel = 'からだの声を記録する';
  } else if (mode === 'overworked') {
    ctaLabel = '今日の状態を残しておく';
  } else if (mode === 'active') {
    ctaLabel = '今日を記録する';
  }

  // ── insightSuffix ────────────────────────────────────────
  var insightSuffix = 'ようです';
  if (tone === 'gentle') {
    insightSuffix = 'かもしれません';
  } else if (tone === 'reflective') {
    insightSuffix = '傾向があります';
  } else if (tone === 'supportive') {
    insightSuffix = 'ようです';
  }

  // ── recoveryHint ─────────────────────────────────────────
  var recoveryHint = null;
  if (mode === 'tired' || mode === 'slow') {
    recoveryHint = '今日は無理せず、自分のペースで過ごしてください。';
  } else if (mode === 'recovery') {
    recoveryHint = '回復を最優先に。からだのサインを大切に。';
  } else if (mode === 'overworked') {
    recoveryHint = '少し立ち止まるだけでも、からだへの贈り物になります。';
  } else if (mode === 'anxious') {
    recoveryHint = 'からだの声を静かに聴いていきましょう。';
  }

  // ── homeGreetingStyle ────────────────────────────────────
  var homeGreetingStyle = 'neutral';
  if (tone === 'gentle') homeGreetingStyle = 'gentle';
  else if (tone === 'supportive') homeGreetingStyle = 'supportive';
  else if (tone === 'reflective') homeGreetingStyle = 'reflective';

  // ── reflectionPrefix ─────────────────────────────────────
  var reflectionPrefix = '最近のあなたのからだ：';
  if (tone === 'gentle') {
    reflectionPrefix = 'そっと振り返ってみると：';
  } else if (tone === 'reflective') {
    reflectionPrefix = 'からだのパターンとして：';
  } else if (tone === 'supportive') {
    reflectionPrefix = 'あなたのからだの記録から：';
  }

  var copy = {
    ctaLabel:          ctaLabel,
    insightSuffix:     insightSuffix,
    recoveryHint:      recoveryHint,
    homeGreetingStyle: homeGreetingStyle,
    reflectionPrefix:  reflectionPrefix,
  };

  _copyCache = { copy: copy, _generatedAt: new Date().toISOString() };
  return copy;
}

// ─── getInsightDensity ───────────────────────────────────────
/**
 * 現在のコンテキストに基づいて、表示すべきインサイトの密度を返す。
 * home-next / insight cards 等が参照する。
 *
 * @returns {'low'|'medium'|'high'}
 */
export function getInsightDensity() {
  var ctx = typeof window.getCompanionContext === 'function'
    ? window.getCompanionContext()
    : {};

  var weight = ctx.recommendationWeight != null ? ctx.recommendationWeight : 0.60;
  var density = ctx.uiDensity || 'standard';

  // displayStyle が 'gentle' → 常に low
  if (density === 'minimal') return 'low';

  // mode が low-weight → low
  if (weight <= 0.35) return 'low';
  if (weight <= 0.55) return 'medium';

  // displayStyle が 'deep' → high
  if (density === 'rich') return 'high';

  return 'medium';
}

// ─── キャッシュ無効化 ──────────────────────────────────────────
(function _installInvalidation() {
  window.addEventListener('ippo:settings-profile-changed', function() {
    _recCache  = null;
    _copyCache = null;
  });
})();

// ─── window 公開 ──────────────────────────────────────────────
window.getRecommendations          = getRecommendations;
window.getAdaptiveCopy             = getAdaptiveCopy;
window.getInsightDensity           = getInsightDensity;
window.invalidateRecommendationCache = invalidateRecommendationCache;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('recommendation-engine-loaded');
}
