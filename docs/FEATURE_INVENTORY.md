# FEATURE_INVENTORY.md
## ippo — 機能棚卸し

Generated: 2026-06-24

---

## User Features

| 機能 | 状態 | 実装場所 |
|------|------|----------|
| 症状記録 (3層チップ) | ✅ 実装済 | app-legacy.js / record.js / record-input.js |
| 食事記録 (自由入力+時間) | ✅ 実装済 | app-legacy.js `toggleMealEntry()` |
| ファスティングタイマー | ✅ 実装済 | app-legacy.js `startFastTimer()` |
| 体温記録 | ✅ 実装済 | app-legacy.js / temperature-engine.js |
| 痛みスコア (1-10) | ✅ 実装済 | modules/pain-scale.js |
| 気分/エネルギー/睡眠 | ✅ 実装済 | app-legacy.js `selectMood()` 等 |
| カレンダー表示 | ✅ 実装済 | modules/calendar.js / calendar-next.js |
| 記録履歴表示 | ✅ 実装済 | app-legacy.js `updateHistory()` |
| 記録編集 | ✅ 実装済 | record-edit-*.js群 |
| 3カード記録フロー | ✅ 実装済 | modules/record-three-card.js |
| ドラフト保護 | ✅ 実装済 | modules/record-draft-guard.js |
| 目標設定 (myVision) | ✅ 実装済 | app-legacy.js |
| リマインダー通知 | ✅ 実装済 | services/push.js |
| テーマ切替 | ✅ 実装済 | modules/theme.js |
| オンボーディング | ✅ 実装済 | modules/onboarding-runtime.js |
| 実験機能 (Experiments) | ⚠️ 基礎実装済 | modules/experiments.js |
| Today Reflection | ✅ 実装済 | modules/today-reflection.js |

## Analytics

| 機能 | 状態 | 実装場所 |
|------|------|----------|
| 月経周期フェーズ分析 | ✅ 実装済 | analytics/cycle-engine.js |
| 症状ベースライン計算 | ✅ 実装済 | analytics/baseline-engine.js |
| フレア日検出 | ✅ 実装済 | analytics/flare-engine.js |
| ラグ相関分析 | ✅ 実装済 | analytics/lag-correlation-engine.js |
| 効果量計算 (Cohen's d) | ✅ 実装済 | analytics/effect-size-engine.js |
| 体温フェーズ推定 | ✅ 実装済 | analytics/temperature-engine.js |
| 症状予測 | ✅ 実装済 | analytics/prediction-engine.js |
| 信頼度計算 | ✅ 実装済 | analytics/confidence-engine.js |
| ホームインサイト生成 | ✅ 実装済 | home/home-insight-engine.js |
| 適応シグナル (Adaptive Signals) | ✅ 実装済 | services/adaptive-signals.js |
| 実験分析 | ⚠️ 基礎実装 | modules/pro/analysis/analysis-module.js `analyzeExperiments()` |

## AI

| 機能 | 状態 | 実装場所 |
|------|------|----------|
| AIプロンプト生成 | ✅ 実装済 | ai/prompt-builder.js |
| AI特徴量抽出 | ✅ 実装済 | ai/feature-engine.js |
| AI分析 Edge Function | ✅ 実装済 | supabase/functions/ai-analyze/ |
| AI予測 Edge Function | ✅ 実装済 | supabase/functions/ai-predict/ |
| AI症例要約 | ❌ 未実装 | — |
| 類似症例検索 | ❌ 未実装 | — |
| AI推薦エンジン | ✅ 実装済 | services/recommendation-engine.js |
| コンパニオン知性 | ✅ 実装済 | services/companion-intelligence.js |
| クラスタリング (バッチ) | ✅ Edge実装済 | supabase/functions/cluster-batch/ |

## Disease

| 機能 | 状態 | 疾患 |
|------|------|------|
| 子宮内膜症アナライザー | ✅ 実装済 | endometriosis |
| 卵巣嚢腫アナライザー | ✅ 実装済 | ovarianCyst |
| 子宮筋腫アナライザー | ✅ 実装済 | fibroid |
| 子宮腺筋症アナライザー | ✅ 実装済 | adenomyosis |
| PCOSアナライザー | ✅ 実装済 | pcos |
| PMS/PMDDアナライザー | ✅ 実装済 | pms/pmdd |
| 更年期障害アナライザー | ✅ 実装済 | menopause |
| 不妊症アナライザー | ✅ 実装済 | infertility |
| 骨盤臓器脱アナライザー | ✅ 実装済 | prolapse |
| 慢性骨盤痛アナライザー | ✅ 実装済 | chronicPelvicPain |
| 外陰痛症候群アナライザー | ✅ 実装済 | vulvodynia |
| 疾患別優先症状表示 | ✅ 実装済 | constants/symptoms.js |
| 医師向けサマリー | ✅ 実装済 | modules/pro/doctor-summary/ |
| 病態サマリー | ✅ 実装済 | modules/pro/condition-summary/ |

## Payment

| 機能 | 状態 | 実装場所 |
|------|------|----------|
| Stripeチェックアウト | ✅ 実装済 | services/stripe.js / supabase/functions/stripe-checkout/ |
| Stripeウェブフック | ✅ 実装済 | supabase/functions/stripe-webhook/ |
| プレミアム状態管理 | ✅ 実装済 | modules/premium/premium-service.js |
| Subscriptionsテーブル | ✅ 実装済 | migrations/20260005_subscriptions.sql |
| アップセル通知 (3ヶ月) | ✅ 実装済 | services/stripe.js `checkUpsellNotification()` |
| プレミアムゲート | ✅ 実装済 | app-legacy.js `premiumGate()` |
| 月額プラン ¥580 | ✅ 実装済 | — |
| 年額プラン ¥4,800 | ✅ 実装済 | — |
| レポート生成 | ✅ Edge実装済 | supabase/functions/report-generate/ |

## Auth

| 機能 | 状態 | 実装場所 |
|------|------|----------|
| メール認証 (Supabase Auth) | ✅ 実装済 | services/supabase.js |
| セッション管理 | ✅ 実装済 | modules/auth/auth-service.js |
| Auth Cloud State Machine | ✅ 実装済 | runtime/auth-cloud-state-machine.js |
| 新規ユーザー profiles自動作成 | ✅ 実装済 | migrations/20260001_rls_setup.sql (trigger) |

## Infrastructure

| 機能 | 状態 | 実装場所 |
|------|------|----------|
| Vite PWAビルド | ✅ 実装済 | vite.config.js |
| Service Worker | ✅ 実装済 | public/sw.js |
| クラウドバックアップ | ✅ 実装済 | services/supabase.js `cloudBackupAll()` |
| クラウドリストア | ✅ 実装済 | services/supabase.js `cloudRestore()` |
| マルチデバイス同期 | ✅ 実装済 | syncRecordImmediately() / retrySyncPending() |
| localStorage → IDB移行 | ✅ 実装済 | services/storage-migration.js |
| ランタイム健全性監視 | ✅ 実装済 | runtime/health-monitor.js |
| ロールバックマネージャー | ✅ 実装済 | runtime/rollback-manager.js |
| 本番診断オーバーレイ | ✅ 実装済 | runtime/production-diagnostics.js |
| GINインデックス (symptoms/factors) | ✅ 実装済 | migrations/20260002_analytics.sql |
| クラスタID列 (profiles) | ✅ 実装済 | migrations/20260003_cluster.sql |
| RLS (全テーブル) | ✅ 実装済 | migrations/20260001_rls_setup.sql |

---

## 未実装 (症例プラットフォームに必要)

| 機能 | 優先度 |
|------|--------|
| Case (症例生成) | P0 |
| Consent (同意管理) | P0 |
| Outcome (転帰記録) | P1 |
| 類似症例検索 | P2 |
| AI症例要約 | P2 |
| 匿名化パイプライン | P0 |
| Multi Language | P3 |
