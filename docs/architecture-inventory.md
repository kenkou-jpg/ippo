# Architecture Inventory

> Phase 1 棚卸し成果物。2026-06-10 実施。推測禁止・実コード根拠のみ。

---

## 1. Architecture Inventory — src/ 全体

### ディレクトリ構成

| ディレクトリ | ファイル数 | 概要 |
|------------|----------|------|
| `src/ai/` | 2 | 特徴抽出・プロンプトビルダー |
| `src/analytics/` | 12 | 統計分析エンジン群 |
| `src/assets/` | 3 | 画像リソース |
| `src/constants/` | 3 | 定数定義 |
| `src/data/` | 1 | コンテキストデータ |
| `src/disease/` | 14 | 疾患別アナライザー |
| `src/home/` | 4 | ホームインサイト生成 |
| `src/icons/` | 8 | SVG 月齢アイコン |
| `src/modules/` | 68 | UI/ロジックモジュール |
| `src/runtime/` | 16 | ランタイム安定化 |
| `src/screens/` | 11 | HTML スクリーン |
| `src/services/` | 21 | サービス層 |
| `src/store/` | 2 | 状態管理 |
| `src/styles/` | 3 | CSS スタイル |
| `src/utils/` | 1 | ユーティリティ |
| `src/app-legacy.js` | 1 | レガシーコード (12,296行) |
| `src/main.js` | 1 | エントリポイント |
| **合計** | **~180** | **総行数 ~31,000+** |

---

## 2. Layer Inventory

### Runtime Layer (16 ファイル)

| ファイル | 行数 | 主要責務 |
|---------|-----|---------|
| `auth-cloud-state-machine.js` | 218 | Supabase auth ポーリング・状態遷移 |
| `error-reporter.js` | 112 | エラー/警告集約・`window.ippoReport` |
| `health-monitor.js` | 99 | `logError` / `logWarning` / `logMetric` |
| `hydration-guard.js` | 68 | hydration 状態保護 |
| `production-diagnostics.js` | 1,246 | 包括的診断 overlay + クラウド報告 |
| `render-boundary.js` | 50 | render 分離・エラーバウンダリ |
| `rollback-manager.js` | 92 | `getSnapshots()` · rollback 管理 |
| `runtime-brain.js` | 476 | `window.ippoBrain` · タイムラインリングバッファ・因果グラフ |
| `runtime-controller.js` | 611 | `window.ippoRuntimeController` · NORMAL/DEBUG/SAFE/RECOVERY モード遷移 |
| `runtime-debug-overlay.js` | 213 | デバッグ UI overlay |
| `runtime-orchestrator.js` | 320 | Runtime システム統合 |
| `save-transaction-guard.js` | 67 | 保存トランザクション原子性保護 |
| `startup-render-gate.js` | 115 | 遅延 render キュー・state-ready ゲート |
| `startup-validator.js` | 64 | ブートフェーズ検証 |
| `state-integrity-guard.js` | 73 | 状態整合性チェック |
| `sync-consistency-checker.js` | 85 | cloud/local 同期検証 |

### Analytics Layer (12 ファイル)

| ファイル | 行数 | 主要 export |
|---------|-----|------------|
| `baseline-engine.js` | 84 | `calcBaseline()` |
| `confidence-engine.js` | 36 | `calcConfidence()` / `calcSampleSize()` |
| `cycle-engine.js` | 180 | `analyzeCycle()` |
| `effect-size-engine.js` | 22 | `calcCohenD()` |
| `flare-engine.js` | 88 | `detectFlares()` |
| `lag-correlation-engine.js` | 95 | `calcLagCorrelation()` |
| `prediction-engine.js` | 179 | `predictNextFlare()` / `calcFlareRisk()` |
| `temperature-engine.js` | 208 | `analyzeTemperature()` |
| `shared/date-utils.js` | 63 | `sliceDays()` / `sortByDate()` |
| `shared/stats-utils.js` | 67 | `median()` / `percentile()` / `confidenceLabel()` |
| `shared/symptom-utils.js` | 59 | `topSymptoms()` / `symptomRate()` |

### Disease Layer (14 ファイル)

| ファイル | 行数 | クラス |
|---------|-----|-------|
| `base-analyzer.js` | 105 | `BaseAnalyzer` |
| `disease-registry.js` | 86 | `JA_TO_KEY` / `REGISTRY` |
| `adenomyosis/analyzer.js` | 98 | `AdenomyosisAnalyzer` |
| `chronic-pelvic-pain/analyzer.js` | 117 | `ChronicPelvicPainAnalyzer` |
| `endometriosis/analyzer.js` | 37 | `EndometriosisAnalyzer` |
| `fibroid/analyzer.js` | 112 | `FibroidAnalyzer` |
| `infertility/analyzer.js` | 91 | `InfertilityAnalyzer` |
| `menopause/analyzer.js` | 117 | `MenopauseAnalyzer` |
| `ovarian-cyst/analyzer.js` | 99 | `OvarianCystAnalyzer` |
| `pcos/analyzer.js` | 37 | `PCOSAnalyzer` |
| `pms-pmdd/analyzer.js` | 52 | `PMSPMDDAnalyzer` |
| `prolapse/analyzer.js` | 101 | `ProlapsAnalyzer` |
| `vulvodynia/analyzer.js` | 100 | `VulvodyniaAnalyzer` |

**注**: チェックリストは「11疾患」と記載。実在は Adenomyosis 含む 11 Analyzer + base + registry = 13ファイル。

### Home Insight Layer (4 ファイル)

| ファイル | 行数 | 主要 export |
|---------|-----|------------|
| `home-insight-engine.js` | 30 | `buildHomeInsight()` |
| `prediction-generator.js` | 44 | `generatePrediction()` |
| `reason-generator.js` | 41 | `generateReason()` |
| `action-generator.js` | 73 | `generateAction()` |

**注**: ディレクトリは `src/home/`（`src/home-insight/` ではない）。

### Service Layer (21 ファイル)

| ファイル | 行数 | 主要責務 |
|---------|-----|---------|
| `adaptive-signals.js` | 273 | `ADAPTIVE_QUESTION_REGISTRY` |
| `companion-intelligence.js` | 404 | `buildCompanionContext()` |
| `companion-memory.js` | 77 | `getCompanionMemory()` / `updateCompanionMemory()` |
| `context-engine.js` | 252 | `buildContext()` |
| `environment-service.js` | 107 | 環境設定初期化 |
| `gentle-tendency.js` | 350 | `computeGentleTendencies()` · トーン制御 |
| `insight-engine.js` | 724 | `computeInsights()` |
| `insight-signals.js` | 245 | シグナル派生・キャッシュ |
| `insight-tendency.js` | 362 | `computeTendencyInsights()` |
| `life-rhythm-memory.js` | 70 | サイクル/睡眠パターンメモリ |
| `prediction-cache-service.js` | 43 | 予測キャッシュ層 |
| `profile-cache-service.js` | 48 | プロフィールキャッシュ |
| `push.js` | 163 | プッシュ通知 |
| `recommendation-engine.js` | 448 | `getRecommendations()` / `getAdaptiveCopy()` |
| `recovery.js` | 63 | recovery 状態管理 |
| `recovery-journey.js` | 355 | recovery narrative + マイルストーン |
| `settings-profile.js` | 123 | `loadSettingsProfile()` (互換レイヤー) |
| `settings-store.js` | 297 | `getSettingsStore()` (新正式版) |
| `storage-migration.js` | 33 | localStorage → IDB 移行 |
| `stripe.js` | 159 | Stripe 決済連携 |
| `supabase.js` | 476 | Supabase クライアント + auth + cloud sync |

### Module Layer (68 ファイル、抜粋)

| 分類 | 主なファイル | 合計行数 (概算) |
|-----|-----------|--------------|
| Core Record | `record.js` (321) / `record-repository.js` (244) / `record-upsert.js` (134) / `record-three-card.js` (589) | ~1,290 |
| Record Lifecycle | `record/save.js` (835) / `record-draft-guard.js` (211) / `record-edit-hydrate.js` (470) / `record-edit-save-identity-guard.js` (306) / `record-freshness-guard.js` (305) | ~2,127 |
| Home Next | `home-next/home-next-status.js` (707) / `home-next/home-next-config.js` (395) / `home-next/home-next-insights.js` (354) + 9 files | ~2,523 |
| Pro Feature | `pro/analysis/analysis-module.js` (591) / `pro/pro-hub/pro-hub.js` (530) + 8 files | ~2,100+ |
| Ownership/Lifecycle | `ownership-map.js` (413) / `render-authority.js` (264) / `ownership-registry.js` (225) | ~902 |
| Calendar | `calendar-next.js` (518) / `calendar.js` (356) | ~874 |
| Auth/Premium | `auth/auth-service.js` (128) / `premium/premium-service.js` (119) | ~247 |

---

## 3. Domain Inventory

### 保存関連

| 関心事 | ファイル | 備考 |
|-------|---------|------|
| 保存エントリポイント | `modules/record.js` / `modules/record-three-card.js` | UI 起点の保存呼び出し |
| 保存コンテキスト生成 | `modules/record/save.js` (835行) | バリデーション・通知・フロー |
| 三カード保存 | `modules/record-three-card-save.js` (89行) | |
| Upsert | `modules/record-upsert.js` (134行) | |
| IDB 操作 | `modules/record-repository.js` (244行) | 唯一の IDB 窓口 (のはず) |
| State 永続化 | `store/persistence.js` | |
| 保存トランザクション guard | `runtime/save-transaction-guard.js` (67行) | |
| Rollback | `runtime/rollback-manager.js` (92行) | |
| Recovery | `services/recovery.js` (63行) | |
| Legacy 保存 | `app-legacy.js` `saveState` (行2455) / `saveAndSync` (行2145) | 移行対象 |

### 認証関連

| 関心事 | ファイル | 備考 |
|-------|---------|------|
| Auth サービス | `modules/auth/auth-service.js` (128行) | 正規 auth 窓口 |
| Supabase クライアント | `services/supabase.js` (476行) | クライアント初期化 + cloud sync |
| Auth state machine | `runtime/auth-cloud-state-machine.js` (218行) | ポーリング・状態遷移 |
| Legacy auth | `app-legacy.js` `supabaseAuth` (行1561) 等5関数 | **削除候補** |

### Premium 関連

| 関心事 | ファイル | 備考 |
|-------|---------|------|
| Premium 判定 | `modules/premium/premium-service.js` (119行) | 正規窓口 |
| Stripe 連携 | `services/stripe.js` (159行) | setInterval ポーリング含む |
| Edge: checkout | `supabase/functions/stripe-checkout/index.ts` (68行) | |
| Edge: webhook | `supabase/functions/stripe-webhook/index.ts` (89行) | checkout.session.completed 処理 |
| DB | `profiles.is_premium` / `profiles.premium_expires_at` | subscriptions テーブルは未作成 |
| Legacy | `app-legacy.js` `isPremium` 変数 (行11800) / `checkPremiumStatus` (行11802) | **廃止対象** |

### Runtime 関連

| 関心事 | ファイル | 行番号/備考 |
|-------|---------|-----------|
| 起動ゲート | `runtime/startup-render-gate.js` | 遅延 render キュー |
| 起動検証 | `runtime/startup-validator.js` | ブートフェーズ検証 |
| 状態 hydration | `runtime/hydration-guard.js` | |
| 観察層 | `runtime/runtime-brain.js` | ブラウン観察・因果グラフ |
| 制御層 | `runtime/runtime-controller.js` | モード遷移 |
| 統合 | `runtime/runtime-orchestrator.js` | 薄いアダプタ候補 |

### Edge Function 一覧 (6関数)

| 関数名 | 行数 | 認証 | Rate Limit | エラー形式 |
|-------|-----|-----|-----------|-----------|
| `ai-analyze` | 126 | JWT Bearer | 3req/60sec (in-memory) | JSON + HTTP status |
| `ai-predict` | 110 | JWT Bearer | 3req/60sec (in-memory) | JSON + HTTP status |
| `cluster-batch` | 209 | SERVICE_ROLE_KEY | なし | JSON + HTTP status |
| `report-generate` | 118 | JWT + is_premium チェック | なし | JSON + HTTP status |
| `stripe-checkout` | 68 | JWT Bearer | なし | JSON + HTTP status |
| `stripe-webhook` | 89 | Stripe 署名検証 | なし | JSON + HTTP status |

**共通問題**: Rate Limit は in-memory (インスタンス再起動でリセット)。永続化未実装。

### Supabase Schema 一覧

| Migration | 内容 |
|-----------|------|
| `20260001_rls_setup.sql` | RLS 初期設定 |
| `20260002_analytics.sql` | 分析用テーブル |
| `20260003_cluster.sql` | クラスタリングテーブル (cluster_id / cluster_meta / cluster_updated_at) |
| `20260004_basaltemp_unify.sql` | 基礎体温統一 |

**注**: `subscriptions` テーブルは未作成 (Phase 4 Premium 改修で作成予定)。

---

## 4. Legacy Inventory — app-legacy.js

### 概要

- **行数**: 12,296行
- **関数数**: 234関数 (async 12個 / sync 222個)
- **グローバル変数**: 70+個

### 全関数・分類別集計

| 責務分類 | 関数数 |
|---------|-------|
| 認証・Cloud Sync | 16 |
| バックアップ・復元・診断 | 14 |
| IndexedDB 管理 | 7 |
| オンボーディング | 17 |
| ホーム / ダッシュボード UI | 22 |
| レコード作成・編集 | 30 |
| 基礎体温・周期管理 | 15 |
| 食事・ファスティング | 20 |
| 疾患・症状設定 | 15 |
| Timeline / 記録表示 | 4 |
| 検索・詳細表示 | 10 |
| UI / モーダル | 12 |
| 痛み / 症状スコア計算 | 10 |
| カレンダー / 月表示 | 7 |
| 実験・レポート | 12 |
| 医師サマリー / レポート生成 | 14 |
| 相関分析 / フレアアップ検出 | 4 |
| コミュニティ機能 | 8 |
| Vision 機能 | 5 |
| 記録画面 | 8 |
| AI / クラウド分析 | 7 |
| 認証・ログイン / Premium | 20 |
| その他 UI / ユーティリティ | 25 |
| **合計** | **234** |

### 重複済み → 削除対象 (確認済み)

| 関数 | app-legacy 行番号 | 移行先 | ステータス |
|-----|-----------------|-------|---------|
| `supabaseHeaders()` | 1548 | `services/supabase.js` | ✅ 移行済 → 削除可 |
| `supabaseAuth()` | 1561 | `services/supabase.js` | ✅ 移行済 → 削除可 |
| `supabaseSignInAnonymous()` | 1572 | `services/auth.js` | ✅ 移行済 → 削除可 |
| `supabaseRefreshSession()` | 1589 | `services/auth.js` | ✅ 移行済 → 削除可 |
| `supabaseEnsureAuth()` | 1608 | `services/auth.js` | ✅ 移行済 → 削除可 |
| `showToast()` | 2485 | `modules/ui-notifications.js` | ✅ 移行済 → 削除可 |
| `showSyncIndicator()` | 2467 | (supabase.js) | 要確認 |
| `hideSyncIndicator()` | 2475 | (supabase.js) | 要確認 |
| `openIDB()` | 1856 | `modules/record-repository.js` | ✅ 移行済 → 削除可 |
| `idbPutRecord()` | 1872 | `modules/record-repository.js` | ✅ 移行済 → 削除可 |
| `idbGetAllRecords()` | 1883 | `modules/record-repository.js` | ✅ 移行済 → 削除可 |
| `idbDeleteRecord()` | 1894 | `modules/record-repository.js` | ✅ 移行済 → 削除可 |
| `generateRecordId()` | 1906 | `modules/record-repository.js` | ✅ 移行済 → 削除可 |
| `ensureRecordIds()` | 1910 | `modules/record-repository.js` | ✅ 移行済 → 削除可 |
| `calcCycleDay()` | 441 | `analytics/cycle-engine.js` | ✅ 移行済 → 削除可 |
| `getCyclePhase()` | 473 | `analytics/cycle-engine.js` | ✅ 移行済 → 削除可 |
| `analyzeCyclePhases()` | 482 | `analytics/cycle-engine.js` | ✅ 移行済 → 削除可 |
| `getCurrentCyclePhase()` | 3664 | `analytics/cycle-engine.js` | 要確認 |

### Runtime 移行対象 (確認済み)

| 関数 | app-legacy 行番号 | 移行先 |
|-----|-----------------|-------|
| `saveState()` | 2455 | `runtime/save-transaction-guard.js` |
| `saveAndSync()` | 2145 | `runtime/save-transaction-guard.js` |
| `autoRecoveryCheck()` | 2159 | `runtime/rollback-manager.js` |
| `repairFromBest()` | 2299 | `runtime/rollback-manager.js` |
| `runSelfDiagnosis()` | 2270 | `runtime/production-diagnostics.js` |
| `showDiagnosisUI()` | 2231 | `runtime/runtime-debug-overlay.js` |

### Module 移行対象 (確認済み)

| 関数群 | app-legacy 行番号 | 移行先 |
|-------|-----------------|-------|
| `obInit()` 〜 `obComplete()` (15/22確認) | 2818-3118 | `modules/onboarding-runtime.js` 拡充 |
| `renderTimeline()` / `loadMoreTimeline()` / `updateTimelineView()` | 1305-1315 | 新設 `modules/timeline.js` |
| `startExperiment()` 〜 `showExperimentReport()` | 818-1129 | 新設 `modules/experiments.js` |
| `initVisionUI()` 〜 `updateHomeVision()` | 166-210 | 新設 `modules/vision.js` |
| `showRecoveryGuide()` / `showBingeUrgeSupport()` | 3716 / 3773 | `services/recovery-journey.js` 拡充 |
| `openMealTimePicker()` / `addMealTime()` / `toggleMealEntry()` / `confirmMealTime()` | 52-138 | 新設 `modules/meal-tracker.js` |

### 未分類 / 要検討

| 関数群 | 行番号 | 備考 |
|-------|-------|------|
| ホーム UI 更新 22関数 | 3275-6094 | `modules/home-renderer.js` or home-next 系へ |
| 医師サマリー生成 | 10111-11101 | `modules/pro/doctor-summary/` へ (既存と統合?) |
| コミュニティ機能 8関数 | 6281-6547 | 移行先未決定 |
| AI 分析 7関数 | 11234-11388 | Edge Function 経由に整理? |
| 疾患設定 UI 15関数 | 401-6737 | `modules/` 内の適切なモジュールへ |
| `renderPainScale()` | 264 | 移行先未決定 |

---

## 5. Tests Inventory

### 構成

| ディレクトリ | ファイル数 | 行数 |
|-----------|---------|-----|
| `tests/analytics/` | 6 | ~1,231 |
| `tests/core/` | 1 | 230 |
| `tests/disease/` | 3 | ~1,158 |
| `tests/modules/` | 6 | ~766 |
| `tests/runtime/` | 4 | ~386 |
| `tests/services/` | 1 | 309 |
| `tests/store/` | 1 | 87 |
| **合計** | **22** | **~4,167** |

- フレームワーク: **Vitest** + `jsdom`
- カバレッジ: `@vitest/coverage-v8`

### カバレッジの空白

- `app-legacy.js` — テストなし (12,296行)
- `src/home/` (4ファイル) — テストなし
- `src/modules/home-next/` — テストなし
- `src/modules/pro/` — テストなし
- `src/services/insight-engine.js` (724行) — テストなし
- Edge Functions — テストなし

---

## 6. Docs Inventory

| ファイル | 行数 | 最新性 |
|---------|-----|-------|
| `ARCHITECTURE_COMPLETION_CHECKLIST.md` | 464 | ✅ 最新 (2026-06-10) |
| `INSIGHT_ENGINE_ARCHITECTURE_BLUEPRINT.md` | 1,142 | ✅ 最新 (2026-06-09) |
| `CTO_EXECUTIVE_SUMMARY.md` | 116 | ✅ 最新 (2026-06-09) |
| `PROJECT_HANDOVER_CHECKLIST.md` | 239 | ✅ 最新 (2026-06-09) |
| `PRO_INSIGHT_ARCHITECTURE.md` | 535 | △ やや古い (2026-05-21) |
| `cleanup-plan.md` / `architecture-options.md` / 各種 checklist | ~150-250 | △ やや古い (2026-05-21) |
| `phase-3f/3h/a/h/i-*.md` | ~200-250 | ✗ 古い (2026-05-12 更新停止) |
| `sveltekit-migration-proposal.md` / `react-migration-proposal.md` | ~226-239 | ✗ 古い・採用見送り |
| `ippo-save-pipeline.txt` | 161,038 | ✅ 最新 (2026-06-10) |

---

## 7. Phase 1 完了条件チェック

- [x] `src/` 全体棚卸し完了
- [x] `supabase/` 全体棚卸し完了
- [x] `tests/` 全体棚卸し完了
- [x] `docs/` 全体棚卸し完了
- [x] Runtime Layer 一覧作成
- [x] Analytics Layer 一覧作成
- [x] Disease Layer 一覧作成
- [x] Home Insight Layer 一覧作成
- [x] Service Layer 一覧作成
- [x] Module Layer 一覧作成 (抜粋)
- [x] 保存関連一覧作成
- [x] 認証関連一覧作成
- [x] Premium 関連一覧作成
- [x] Runtime 関連一覧作成
- [x] Edge Function 一覧作成
- [x] Supabase Schema 一覧作成
- [x] app-legacy.js 機能一覧作成 (234関数)
- [x] app-legacy.js 依存一覧作成 (重複削除対象確認)
- [x] app-legacy.js 移行対象一覧作成
- [ ] 未分類関数ゼロ — **ホーム UI / コミュニティ / AI 分析の移行先が未決定** → Phase 2 で詳細化
