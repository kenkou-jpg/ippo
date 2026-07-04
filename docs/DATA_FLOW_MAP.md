# DATA_FLOW_MAP.md
## ippo — データフロー全体図

Generated: 2026-06-24

---

## 入力 → 保存 → 分析 → 表示

```
┌─────────────────────────────────────────────────────────────────────┐
│  INPUT LAYER                                                        │
│                                                                     │
│  record.html / record-three-card.html (UI)                          │
│    症状チップ (3層) / 痛みスコア / 気分 / エネルギー / 睡眠           │
│    食事 (自由入力) / 体温 / 生活ファクター / メモ                     │
│    → DOM → app-legacy.js (toggleRsChip等) / record-input.js         │
│    → buildDraftFromUI() → Record Draft Object                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STATE LAYER                                                        │
│                                                                     │
│  record-draft-guard.js → ippo_draft (localStorage)                  │
│                          (入力途中の保護)                            │
│                                                                     │
│  saveRecord() / saveRecordScreen()                                  │
│    → record/save.js                                                 │
│      createRecordSaveContext()                                       │
│      prepareRecordUpsert() → record-upsert.js                       │
│        upsertRecord() — ID重複排除・マージ                           │
│      persistRecordState()                                           │
│        → setState() → store/state.js (_state 更新)                  │
│        → saveState() → localStorage['ippo_state'] (JSON blob)       │
│      syncRecordCloud() → supabase.js                                │
│      notifyRecordUpdated() → カスタムイベント発火                    │
│                                                                     │
│  ippo_state JSON構造:                                               │
│    { name, records: [], streak, totalDays,                          │
│      fastingActive, fastGoal, myVision,                             │
│      lastPeriodDate, cycleLength, cycleIrregular,                   │
│      birthYear, myDiseases, trackedConditions,                      │
│      experiments, reminders, lastSaved, ... }                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CLOUD SYNC LAYER (Supabase)                                        │
│                                                                     │
│  ① syncRecordImmediately(record)                                    │
│       → user_records テーブル UPSERT (record単位)                   │
│       → 失敗時: record.syncPending = true → retrySyncPending()      │
│                                                                     │
│  ② cloudBackupAll()                                                  │
│       → user_data テーブル UPDATE/INSERT (state全体)                │
│       → 空レコード上書き防止ガード付き                               │
│       → ロック制御 (_cloudBackupLock)                               │
│                                                                     │
│  ③ cloudRestore()                                                    │
│       → user_data.state を取得                                       │
│       → mergeRecords(local, cloud) — timestamp比較・重複ID解決       │
│       → safeMergeState() — myDiseases/trackedConditions保護          │
│       → setState() + saveState()                                    │
│                                                                     │
│  ④ visibilitychange → cloudRestore() (30秒デバウンス)               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ANALYTICS ENGINE LAYER (pure functions)                            │
│                                                                     │
│  入力: getState().records (+ state設定)                              │
│                                                                     │
│  analytics/                                                         │
│    cycle-engine.js      → フェーズ (月経/卵胞/排卵/黄体)            │
│    baseline-engine.js   → 個人ベースライン計算                      │
│    flare-engine.js      → フレア日検出                              │
│    lag-correlation.js   → ファクター→症状の遅延相関                  │
│    effect-size-engine.js → Cohen's d / 実験効果量                   │
│    prediction-engine.js → 次回症状予測                              │
│    temperature-engine.js → 体温フェーズ推定                          │
│    confidence-engine.js → 分析信頼度計算                            │
│                                                                     │
│  disease/                                                           │
│    disease-registry.js → 11疾患アナライザー ディスパッチ             │
│    各 analyzer.js → 疾患別フレア/トリガー/改善要因分析              │
│                                                                     │
│  home/                                                              │
│    home-insight-engine.js → ホームカード用インサイト生成             │
│    prediction-generator.js → 今日の体調予測メッセージ               │
│    action-generator.js → 推薦アクション生成                          │
│                                                                     │
│  services/                                                          │
│    insight-engine.js   → post-save hook 自動計算                    │
│    adaptive-signals.js → 行動適応シグナル                           │
│    companion-intelligence.js → コンパニオンメッセージ生成           │
│    recommendation-engine.js → rule-based推薦                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI ENGINE LAYER (Supabase Edge Functions)                          │
│                                                                     │
│  ai/feature-engine.js   → 特徴量ベクトル生成                        │
│  ai/prompt-builder.js   → Claude/GPT向けプロンプト組み立て          │
│                                                                     │
│  Edge Functions:                                                    │
│    ai-analyze/   → 症状パターン分析 (LLM呼び出し)                   │
│    ai-predict/   → 次回予測 (LLM呼び出し)                           │
│    cluster-batch/ → ユーザークラスタリング (バッチ)                  │
│    report-generate/ → 月次レポート生成                              │
│                                                                     │
│  prediction-cache-service.js → profiles.prediction_cache に保存     │
│  profile-cache-service.js → profiles.baseline_json に保存           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DISPLAY LAYER                                                      │
│                                                                     │
│  home.html → home-renderer.js / home-next/ (flag制御)              │
│  insights.html → insights-dynamic-renderer.js                      │
│  pro-hub.html → modules/pro-hub/pro-hub.js                         │
│  PRO overlays → doctor-summary / condition-summary / symptom-trends │
│                                                                     │
│  app-legacy.js が保有するレンダラー群 (100+関数):                   │
│    updateStats() / updateHistory() / renderBodyCheck()              │
│    renderFood() / renderFasting() / renderEmotion()                 │
│    renderInsightDiscoveries() / renderMonthlySummaryText() ...      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Local State詳細

| キー | 型 | 内容 |
|------|----|------|
| `ippo_state` | JSON | メインstate全体 |
| `ippo_draft` | JSON | 記録入力途中のドラフト |
| `ippo_meal_draft` | JSON | 食事入力ドラフト |
| `ippo_premium_cached` | string | プレミアム状態オフラインキャッシュ |
| `ippo_sb_token` | string | Supabaseセッショントークン |
| `ippo_sb_refresh` | string | リフレッシュトークン |
| `ippo_records_synced` | string | 初回同期完了フラグ |
| `ippo_onboarding_completed` | string | オンボーディング完了 |
| `ippo_theme` | string | テーマ設定 |
| `ippo_last_record_count` | string | 記録件数監視 |

## Record Object構造

```js
{
  id:           string,         // nanoid (重複排除キー)
  date:         string,         // 'YYYY-MM-DD'
  record_date:  string,         // 正規化済み日付
  symptoms:     string[],       // 選択症状 (SYMPTOM_LAYERS)
  factors:      string[],       // 生活ファクター (FACTOR_OPTIONS)
  painLevel:    number,         // 0-10
  energy:       number,         // 1-5
  sleepQuality: number,         // 1-5
  wellnessScore: number,        // 1-5
  mood:         string,
  bodyTemp:     number,
  mealNote:     string,         // 食事自由入力
  memo:         string,
  periodDay:    number | null,
  updatedAt:    string,         // ISO8601
  syncedAt:     string | null,
  syncPending:  boolean,
  deleted_at:   string | null,
}
```
