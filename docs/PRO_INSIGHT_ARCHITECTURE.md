# PRO Insight Architecture — ippo

> 「記録アプリ」から「静かに問いかけ、一緒に試し、疾患症状を理解して伴走するアプリ」へ。
> 本ドキュメントは今後の全PRの土台となる設計定義です。実装は各PRで段階的に行います。

---

## 0. 設計原則

| 原則 | 内容 |
|------|------|
| Rule-based first | LLM依存なし。ルール＋テンプレートで構築。将来AI化可能な構造を維持する |
| Explainable | 全インサイトに `reason` フィールド必須。「なぜこのインサイトが出たか」を常に説明できる |
| Cacheable | render毎の分析禁止。TTLキャッシュ＋post-saveフック無効化で制御 |
| Offline-safe | localStorage完結。Supabaseなしで全機能動作する |
| Mobile-first | 分析は1レンダーあたり最大50ms。重い処理はサマリー画面遷移時のみ |
| Tier-pure | FREE/PRO境界は `isPremium()` の1箇所のみで判定する |

---

## 1. 無料 vs PRO UX差分

### 無料（FREE）— 点、今、表面

| 機能 | 説明 |
|------|------|
| 今日のインサイト | 直近7日の最頻パターン1件（`home-next-insights.js` 既存） |
| 観察サマリー | 過去30日の観察結果テキスト（`insights-clinical-summary.js` 既存） |
| 疾患別ヒーローメッセージ | 周期フェーズ×痛み×睡眠で選ぶメッセージ |
| 記録カレンダー | 記録の有無＋月相のみ |
| 状態カード4枚 | 疾患別の優先カード（今日の値） |

### PRO — 傾向、流れ、文脈、深層

| 機能 | 説明 |
|------|------|
| 傾向インサイト全件 | 上位5件まで表示（FREEは1件） |
| 疾患コンテキストレポート | 疾患別の長期観察サマリー（30/60/90日） |
| 問いかけ層 | 「なぜそうなったと思いますか？」個別の問いかけ |
| 実験提案 | 「今週試してみることの提案」1件/週 |
| 相関グラフ | 睡眠×痛み、周期×気分 などの散布/折れ線 |
| 受診レポート生成 | 30日分の観察を医師向けテキスト形式で出力 |
| 傾向アラート | 悪化トレンド検出時の静かな通知 |

### ゲート判定の実装方針

```js
// injection point 側で判定。engine 自体は tier を気にしない。
import { isPremium } from '../modules/premium/premium-service.js';

function renderInsightCard(insight) {
  if (insight.tier === 'pro' && !isPremium()) {
    return renderProGate(insight); // ロックUI
  }
  return renderInsightFull(insight);
}
```

---

## 2. Insight Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│  record saved                                                     │
│  state.records[] updated → saveState() → post-save hook fires    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    invalidate insight cache
                    (localStorage: ippo_insight_cache)
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  UI requests insights (画面遷移 or 初回ロード)                    │
│                                                                   │
│  1. getInsights(state) called                                     │
│  2. cache hit? → return cached DerivedInsight[]                  │
│  3. cache miss → runInsightEngine(state) → DerivedInsight[]      │
│  4. write cache with TTL                                          │
│  5. return to UI                                                  │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│  UI injection                                                     │
│  - HOME: 上位1件を home-next-insights に inject                  │
│  - INSIGHTS: tier別に全件 inject                                 │
│  - QUESTION LAYER: 上位1件のインサイトから問いを生成             │
│  - EXPERIMENT LAYER: 週1件の提案を inject                        │
└──────────────────────────────────────────────────────────────────┘
```

### Lifecycle イベント

| イベント | トリガー | 処理 |
|----------|----------|------|
| `ippo:record-saved` | saveState() post-hook | cacheを無効化 |
| `ippo:screen-insights` | insights タブ表示 | engine実行 (miss時) |
| `ippo:screen-home` | home タブ表示 | 上位1件のみ取得 |
| `ippo:auth-ready` | 認証完了 | premium状態確認→tier再評価 |

---

## 3. Derived Insights Structure

Insight Engine が返す全インサイトの共通スキーマ。

```js
/**
 * @typedef {Object} DerivedInsight
 */
const DerivedInsightSchema = {
  // ── 識別 ──
  id:           String,   // 安定したID例: 'sleep_pain_correlation', 'pcos_fatigue_weekly'
  type:         String,   // 'pattern' | 'alert' | 'positive' | 'milestone'
  tier:         String,   // 'free' | 'pro'

  // ── 内容 ──
  main:         String,   // 主文（太字で表示する傾向文）
  sub:          String,   // 補足文（小文字で添える文脈）
  action:       String,   // null | ユーザーへの提案（「詳しく見る」など）

  // ── Explainability ──
  reason:       String,   // なぜこのインサイトが出たか（内部ログ＆将来UI開示用）
  ruleId:       String,   // 適用されたルールのID例: 'RULE_SLEEP_PAIN_50PCT'
  evidenceDays: Number,   // このインサイトを支持する記録日数
  confidence:   Number,   // 0.0〜1.0（証拠日数÷必要日数）

  // ── 優先度 ──
  score:        Number,   // 0〜100（表示順ソートに使用）
  diseaseKey:   String,   // null | 'endometriosis' | 'pcos' | ... （疾患固有インサイト）

  // ── キャッシュ制御 ──
  generatedAt:  String,   // ISO 8601 timestamp
  ttlMs:        Number,   // ms。デフォルト86400000 (24h)。alertは3600000 (1h)
};
```

### Scoreの計算方針

```
score = baseScore(ruleId)
      + diseaseBonus(diseaseKey, profileInsightPriority)
      + recencyBonus(evidenceDays, windowDays)
      + confidenceBonus(confidence)
```

| 要素 | 範囲 | 説明 |
|------|------|------|
| baseScore | 0–40 | ルール種別固有の基本スコア |
| diseaseBonus | 0–30 | `insightPriority` に含まれるルールIDに加算 |
| recencyBonus | 0–15 | 最新7日のデータが多いほど高い |
| confidenceBonus | 0–15 | confidence × 15 |

---

## 4. Disease Context Structure

疾患コンテキストは Engine が分析の前提として保持するオブジェクト。  
`home-next-config.js` の `getHomeConfiguration()` を拡張して生成する。

```js
/**
 * @typedef {Object} DiseaseContext
 */
const DiseaseContextSchema = {
  // ── プロファイル ──
  profileKey:       String,   // 'endometriosis' | 'pcos' | 'pms' | ...
  diseaseNames:     Array,    // ['子宮内膜症', 'PCOS'] 複数疾患対応
  isMultiDisease:   Boolean,

  // ── 周期コンテキスト ──
  cyclePhase:       String,   // 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | null
  cycleDayNum:      Number,   // 現在の周期日数 (null if unknown)
  cycleLength:      Number,   // 設定周期日数
  cycleIrregular:   Boolean,

  // ── 短期集計（Engineが毎回計算、Cacheに乗せる） ──
  stats: {
    last7:  RecordStats,  // 直近7日の集計
    last30: RecordStats,  // 直近30日の集計
    last90: RecordStats,  // 直近90日の集計
  },

  // ── 疾患優先度 ──
  insightPriority:  Array,    // ['pain_cycle', 'sleep_pain', ...]（home-next-config由来）
  watchSigns:       Array,    // ['痛み増加速度', '疲労回復遅延', ...]
};

/**
 * @typedef {Object} RecordStats
 */
const RecordStatsSchema = {
  count:          Number,   // 記録日数
  avgPain:        Number,   // 平均痛みレベル
  avgSleep:       Number,   // 平均睡眠スコア
  avgEnergy:      Number,   // 平均エネルギー
  symptomFreq:    Object,   // { '倦怠感': 5, 'イライラ': 3, ... }
  painDays:       Number,   // painLevel >= 2 の日数
  highPainDays:   Number,   // painLevel >= 3 の日数
  poorSleepDays:  Number,   // sleepQuality >= 3 の日数
  heavyFlowDays:  Number,   // menstrualCycle 'heavy'|'very_heavy' の日数
};
```

### Context 生成フロー

```js
// src/insights/context.js (新規作成予定)
export function buildDiseaseContext(state) {
  const diseases = state.myDiseases || [];
  const config   = getHomeConfiguration(diseases);
  return {
    profileKey:      config.profileKey,
    diseaseNames:    diseases,
    isMultiDisease:  diseases.length > 1,
    cyclePhase:      getCyclePhase(state.lastPeriodDate, state.cycleLength),
    cycleDayNum:     getCycleDayNum(state.lastPeriodDate),
    cycleLength:     state.cycleLength || 28,
    cycleIrregular:  state.cycleIrregular || false,
    stats:           computeStats(state.records || []),
    insightPriority: config.insightPriority,
    watchSigns:      config.watchSigns,
  };
}
```

---

## 5. Question Layer Structure

インサイトを受けてユーザーに「静かに問いかける」層。  
診断ではなく「一緒に考えるための問い」として設計する。

```js
/**
 * @typedef {Object} InsightQuestion
 */
const InsightQuestionSchema = {
  id:           String,   // 'q_sleep_pain_cause', 'q_pcos_fatigue_food'
  insightId:    String,   // 紐づく DerivedInsight の id
  tier:         'pro',    // 問いかけ層は全てPRO

  // ── 表示 ──
  prompt:       String,   // 「睡眠が浅い日の翌日に痛みが強くなる傾向があります。心当たりはありますか？」
  options:      Array,    // 選択肢 (null = フリーテキスト)
  /*
  options例:
  [
    { value: 'stress',   label: 'ストレスが重なっていた' },
    { value: 'cold',     label: 'からだが冷えていた' },
    { value: 'activity', label: '活動量が多かった' },
    { value: 'unknown',  label: 'わからない' },
  ]
  */

  // ── 状態管理 ──
  shownAt:      String,   // ISO timestamp (表示した日時)
  answeredAt:   String,   // null | ISO timestamp
  answer:       String,   // null | 選択値またはフリーテキスト

  // ── 将来のAI活用境界 ──
  // answer が蓄積されると、AI がパターンを読み取るための素材になる。
  // 現在はルールベースの実験提案のインプットとして使用する。
};
```

### Question生成ルール

```
DerivedInsight
    ↓ (score上位1件/週)
Question Template 選択
    (src/insights/questions/templates.js)
    ↓
personalize(template, diseaseContext)
    ↓
InsightQuestion
```

問いかけは**週1件**を上限とし、`ippo_question_last_shown` (localStorage) で管理する。  
同じ問いを2週間以内に再表示しない。

---

## 6. Experiment Suggestion Structure

「今週1つ、試してみること」を静かに提案する層。

```js
/**
 * @typedef {Object} ExperimentSuggestion
 */
const ExperimentSuggestionSchema = {
  id:           String,   // 'exp_sleep_earlier_30min', 'exp_food_order_change'
  insightId:    String,   // 根拠となる DerivedInsight の id
  questionId:   String,   // 根拠となる InsightQuestion の id (null if question未回答)
  tier:         'pro',

  // ── 提案内容 ──
  title:        String,   // 「今週試してみること」
  description:  String,   // 「就寝時刻を30分早めてみましょう。痛みへの影響を記録してみてください」
  duration:     String,   // '今週' | '今日' | '3日間'
  trackingHint: String,   // 「記録の「睡眠」に変化があれば書いてみて」

  // ── 状態管理 ──
  shownAt:      String,   // ISO timestamp
  outcome:      String,   // null | 'helpful' | 'not_helpful' | 'skipped'
  outcomeAt:    String,   // null | ISO timestamp

  // ── Explainability ──
  reason:       String,   // 「睡眠不足→翌日痛みのパターンが50%以上確認されたため」
};
```

### Experiment選択ルール

```
top DerivedInsight (score最高)
    ↓
question answer があれば考慮
    ↓
disease context から禁忌チェック
  (例: 痛みスコア >= 3 の日には運動系の提案をしない)
    ↓
ExperimentTemplate から1件選択
    ↓
週1回の表示制限チェック (ippo_experiment_last_shown)
    ↓
ExperimentSuggestion
```

---

## 7. UI Injection Points

Insight Engine の出力を既存UIに注入するポイント定義。  
**UIの再設計は行わない。注入のみ。**

```
┌─────────────────────────────────────────────────────────────────┐
│  HOME 画面                                                       │
│                                                                  │
│  [A] hn-insight-card          ← 上位1件 (FREE/PRO共通)         │
│  [B] hn-status-cards          ← 疾患別カード4枚 (FREE/PRO共通) │
│  [C] hn-experiment-card       ← 実験提案 (PRO only, 週1)       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  INSIGHTS 画面                                                   │
│                                                                  │
│  [D] ins-clinical-summary     ← 観察サマリー (FREE/PRO共通)    │
│  [E] ins-trend-cards          ← 上位5件インサイト (PRO only)   │
│  [F] ins-question-card        ← 問いかけカード (PRO only)      │
│  [G] ins-correlation-chart    ← 相関グラフ (PRO only)          │
│  [H] ins-medical-report       ← 受診レポート出力 (PRO only)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  CALENDAR 画面                                                   │
│                                                                  │
│  [I] cal-day-insight-dot      ← 痛みピーク日マーク (PRO only)  │
│  [J] cal-phase-banner         ← 周期フェーズ帯 (PRO only)      │
└─────────────────────────────────────────────────────────────────┘
```

### Injection API 設計方針

```js
// 各injection pointは独立した関数として実装
// src/insights/inject/ 以下に配置予定

// 呼び出し側のパターン（既存モジュールの末尾に追記するだけ）
import { injectHomeInsight }      from '../insights/inject/home-insight.js';
import { injectExperimentCard }   from '../insights/inject/experiment.js';

// 既存 renderHome() の末尾で呼ぶ
injectHomeInsight(document.getElementById('hn-insight-container'), getInsights());
injectExperimentCard(document.getElementById('hn-experiment-container'), getExperiment());
```

---

## 8. Cache Strategy

### キャッシュキー

| キー | 内容 | TTL | 無効化タイミング |
|------|------|-----|-----------------|
| `ippo_insight_cache` | `DerivedInsight[]` のJSON | 24h | record保存時 |
| `ippo_disease_ctx_cache` | `DiseaseContext` のJSON | 24h | record保存時 / 設定変更時 |
| `ippo_question_last_shown` | 最後に表示した問いかけのID+日時 | 永続 | 手動クリア時のみ |
| `ippo_experiment_last_shown` | 最後に表示した実験提案のID+日時 | 永続 | 手動クリア時のみ |
| `ippo_experiment_outcomes` | 実験提案の結果履歴 | 永続 | 手動クリア時のみ |

### キャッシュ制御実装方針

```js
// src/insights/cache.js (新規作成予定)

const CACHE_KEY     = 'ippo_insight_cache';
const CTX_KEY       = 'ippo_disease_ctx_cache';

export function getInsightCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { insights, generatedAt, ttlMs } = JSON.parse(raw);
    if (Date.now() - new Date(generatedAt).getTime() > ttlMs) return null;
    return insights;
  } catch (_) { return null; }
}

export function setInsightCache(insights, ttlMs = 86400000) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      insights,
      generatedAt: new Date().toISOString(),
      ttlMs,
    }));
  } catch (_) {}
}

export function invalidateInsightCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CTX_KEY);
  } catch (_) {}
}

// state.js の post-save hook に登録 (app-bootstrap.js で行う)
// addPostSaveHook(invalidateInsightCache);
```

### レンダー負荷ルール

| ルール | 内容 |
|--------|------|
| render毎の分析禁止 | 全分析はキャッシュ経由。DOM更新のみがrenderの責務 |
| Engine実行タイミング | 画面遷移時（insights tab表示）またはcache miss時のみ |
| 最大実行時間 | Engine全体で50ms以内。超えた場合は部分スキップしてロギング |
| records上限 | 最新365件のみ分析対象。`records.slice(-365)` でトリム |

---

## 9. Future AI Integration Boundary

現在のルールベース実装と将来のAI化の境界を明確にする。  
**境界を越えるコードは今回のPRシリーズでは書かない。**

```
┌───────────────────────────────────────────────────────────────┐
│  現在 (rule-based)              将来 (AI-optional)            │
│                                                               │
│  buildDiseaseContext()    ──→  (変更なし、AIへの入力になる)  │
│  runInsightEngine()       ──→  replaceableWithAI()           │
│  selectQuestion()         ──→  AI が文脈を読んで生成         │
│  selectExperiment()       ──→  AI がユーザー履歴から提案     │
│  reason フィールド        ──→  AI への few-shot prompt素材   │
│  answer 蓄積データ        ──→  fine-tuning または RAG の素材 │
└───────────────────────────────────────────────────────────────┘
```

### AI化可能にするための設計制約

1. **Engine は純粋関数** — `runInsightEngine(state, context)` の入力/出力は serializable なオブジェクトのみ。副作用なし。
2. **reason フィールドは英語または構造化** — 将来 LLM への prompt に変換しやすくするため、reason は自然言語より構造的に書く。
3. **DerivedInsight は替えられる** — UIはIDとフィールドのみ参照。Engineの実装を差し替えてもUI変更不要。
4. **QuestionとExperimentはテンプレートファイル分離** — `src/insights/questions/templates.js`, `src/insights/experiments/templates.js` として管理。AI化時はここをLLM呼び出しに置換する。
5. **ユーザー回答は永続化** — `answer` と `outcome` は localStorage に保存。将来クラウド同期するための素材。

### AI化境界のAPI設計（参考）

```js
// 将来このinterfaceを実装するAIプロバイダーを差し込める
interface InsightProvider {
  generateInsights(state: AppState, context: DiseaseContext): Promise<DerivedInsight[]>;
  generateQuestion(insight: DerivedInsight, context: DiseaseContext): Promise<InsightQuestion>;
  generateExperiment(insight: DerivedInsight, question: InsightQuestion | null): Promise<ExperimentSuggestion>;
}

// 現在はrule-based実装
class RuleBasedInsightProvider implements InsightProvider { ... }

// 将来はAI実装に切り替え（UIは変わらない）
class AIInsightProvider implements InsightProvider { ... }
```

---

## 10. ファイル構成（実装時の配置先）

```
src/
└── insights/                    (新規ディレクトリ)
    ├── engine.js                 メインEngine: runInsightEngine()
    ├── cache.js                  TTLキャッシュ管理
    ├── context.js                DiseaseContext構築
    ├── rules/                    ルール定義 (ruleId別)
    │   ├── sleep-pain.js         RULE_SLEEP_PAIN_50PCT など
    │   ├── cycle-mood.js         RULE_CYCLE_MOOD_LUTEAL など
    │   ├── disease/              疾患別ルール
    │   │   ├── pcos.js
    │   │   ├── endometriosis.js
    │   │   └── ...
    │   └── index.js              全ルールのexport
    ├── questions/
    │   └── templates.js          問いかけテンプレート
    ├── experiments/
    │   └── templates.js          実験提案テンプレート
    └── inject/                   UIへのinjection関数
        ├── home-insight.js       injection point [A]
        ├── experiment.js         injection point [C]
        ├── trend-cards.js        injection point [E]
        ├── question-card.js      injection point [F]
        └── medical-report.js     injection point [H]
```

---

## 11. 実装チェックリスト（各PRで確認）

- [ ] Engine は `state` と `context` のみを引数に取る純粋関数か
- [ ] 全 `DerivedInsight` に `reason` と `ruleId` が設定されているか
- [ ] render毎の分析実行がないか（キャッシュ経由になっているか）
- [ ] `isPremium()` による tier チェックは injection point の1箇所のみか
- [ ] 新しい insight 種別を追加するとき、既存 injection point への影響はないか
- [ ] `invalidateInsightCache()` が post-save hook に登録されているか
- [ ] 50ms タイムアウトガードが Engine に設けられているか
- [ ] Question と Experiment のテンプレートはファイル分離されているか
- [ ] AI化した場合、Engineを差し替えるだけで UI 変更不要か

---

*作成: 2026-05-21 / PR1 — PRO Insight Architecture Foundation*
