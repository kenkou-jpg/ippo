# ippo Architecture Completion Checklist

> **方針**: ユーザー0人の今を「アーキテクチャ完成フェーズ」と位置付ける。
> 後回し候補は作らない。技術的負債を残さない。理想構造への到達を優先する。
>
> **根拠**: 改修計画書 (2026-06-10) に基づく。推測禁止・実コード根拠のみ。

---

## 基本原則

- 推測禁止
- 実コードのみを根拠とする
- 削除前に依存関係を証明する
- 統合前に責務を定義する
- guard は悪とみなさない
- guard は即削除しない
- guard 責務を基盤へ吸収後に削除する
- テストで保証できない変更は実施しない
- コード削減ではなく構造改善を目的とする
- 「統合しない」という選択肢も評価する
- 「削除・統合・移行」は必ず実コード根拠を記録する
- 調査結果により当初計画を変更することを許可する
- Architecture Decision Record (ADR) を残す
- 構造改善後の劣化防止策を実装する

---

## Project Goal

- [ ] app-legacy.js 完全廃止 (`src/app-legacy.js` 12,296行 → 削除)
- [ ] Runtime 統合完了 (16ファイル → 重複除去・責務明確化)
- [ ] Premium 基盤統一完了 (Stripe → subscriptions テーブル → premium-service の一本化)
- [ ] Action Engine 構造化完了 (正規表現解析ゼロ・構造データのみ参照)
- [ ] Disease Analyzer 標準化完了 (全11疾患が共通インターフェース準拠)
- [ ] Design System 統一完了 (ハードコード値ゼロ・Token 唯一定義源)
- [ ] Edge Function 運用品質向上完了 (Rate Limit 永続化・Error 統一)
- [ ] リリース判定 Ready

---

# Phase 1 — 棚卸し

> **目標**: コードベース全体の現状を把握し、移行・統合の根拠を揃える。
> 推測禁止。実コードを読んだ結果のみを記録する。

## Architecture Inventory

- [x] `src/` 全体棚卸し (全ファイル・ディレクトリ・行数一覧)
- [x] `supabase/` 全体棚卸し (migrations / functions / 型定義)
- [x] `tests/` 全体棚卸し (テスト対象・カバレッジ状況)
- [x] `docs/` 全体棚卸し (最新性・有効ドキュメント判定)

## Layer Inventory

- [x] Runtime Layer 一覧作成 (16ファイル・各責務・行数)
- [x] Analytics Layer 一覧作成 (11ファイル・各エンジン・入出力)
- [x] Disease Layer 一覧作成 (13ファイル・各 Analyzer・出力フィールド)
- [x] Home Insight Layer 一覧作成 (4ファイル・Generator 間データフロー)
- [x] Service Layer 一覧作成 (21ファイル・各サービス責務)
- [x] Module Layer 一覧作成 (74ファイル・各モジュール責務)

## Domain Inventory

- [x] 保存関連一覧作成 (save entry points / pipeline / state / cloud)
- [x] 認証関連一覧作成 (auth flow / token management / session)
- [x] Premium 関連一覧作成 (判定経路・状態管理箇所・UI連携)
- [x] Runtime 関連一覧作成 (起動順序・依存関係・guard 一覧)
- [x] Edge Function 一覧作成 (6関数・入出力・auth・error パターン)
- [x] Supabase Schema 一覧作成 (全テーブル・RLS・インデックス)

## Legacy Inventory

- [x] app-legacy.js 機能一覧作成 (全関数・グローバル変数)
- [ ] app-legacy.js 依存一覧作成 (どこから呼ばれているか)
- [x] app-legacy.js 移行対象一覧作成 (Runtime / Service / Module 別)

### 既知の分類（改修計画書より・要確認）

**重複済み → 削除対象**
- [ ] `supabaseHeaders()` / `supabaseAuth()` — `src/services/supabase.js` 済
- [ ] `showToast()` — `src/modules/ui-notifications.js` 済
- [ ] `syncRecordToCloud()` / `pullRecordsFromCloud()` — auth-service 済
- [ ] `openIDB()` / `idbPutRecord()` / `idbGetAllRecords()` / `idbDeleteRecord()` — record-repository.js 済
- [ ] `calcCycleDay()` / `getCyclePhase()` — `src/analytics/cycle-engine.js` 済
- [ ] `checkUpsellNotification()` — `src/services/stripe.js` 済

**Runtime 移行対象**
- [ ] `saveState()` / `saveAndSync()` → `save-transaction-guard.js`
- [ ] `autoRecoveryCheck()` / `repairFromBest()` → `rollback-manager.js`
- [ ] `runSelfDiagnosis()` → `production-diagnostics.js`
- [ ] `showDiagnosisUI()` → `runtime-debug-overlay.js`

**Module 移行対象**
- [ ] `obInit()` 〜 `obComplete()` (22関数) → `modules/onboarding-runtime.js` 拡充
- [ ] `renderTimeline()` / `loadMoreTimeline()` / `updateTimelineView()` → 新設 `modules/timeline.js`
- [ ] `startExperiment()` 〜 `showExperimentReport()` (6関数) → 新設 `modules/experiments.js`
- [ ] `initVisionUI()` 〜 `updateHomeVision()` (4関数) → 新設 `modules/vision.js`
- [ ] `showRecoveryGuide()` / `showBingeUrgeSupport()` → `services/recovery-journey.js` 拡充
- [ ] `openMealTimePicker()` / `addMealTime()` / `toggleMealEntry()` / `confirmMealTime()` → 新設 `modules/meal-tracker.js`

### 成果物

- [x] `docs/architecture-inventory.md` (全Layer・全Domain・Legacy の棚卸し結果)

### 完了条件

- [x] app-legacy.js 内の全責務が分類済み
- [ ] 未分類関数ゼロ (ホーム UI / コミュニティ / AI 分析の移行先が未決定 → Phase 2 で詳細化)
- [ ] 各移行先ファイルが決定済み

---

# Phase 2 — 依存関係可視化

> **目標**: 統合・削除の判断に必要な依存関係をすべて可視化する。
> 「削除前に依存関係を証明する」原則の実行フェーズ。

## Import / Export

- [x] import 依存マップ作成 (誰が誰を import しているか)
- [x] export 依存マップ作成 (誰が誰に export されているか)
- [x] 循環参照の検出

## Runtime

- [x] Runtime → Module 依存整理
- [x] Module → Service 依存整理
- [x] Service → Storage 依存整理

## Global Dependencies

- [x] `window.*` 依存一覧作成 (全ファイルの window 参照を列挙)
- [x] `localStorage` 依存一覧作成
- [x] `IndexedDB` 依存一覧作成
- [x] `Supabase` 依存一覧作成 (クライアント呼び出し箇所)
- [x] イベント (CustomEvent / dispatchEvent) 依存一覧作成
- [x] グローバル変数一覧作成 (`window.saveState` / `window.isPremium` 等)

## Cleanup Candidates

- [x] 未使用コードの検出
- [x] 未使用モジュールの検出
- [x] 重複実装の検出

### 成果物

- [x] `docs/dependency-map.md` (import/export マップ・global 依存一覧・循環参照リスト)

---

# Phase 3 — 保存経路図作成

> **目標**: 保存パイプラインの全経路を可視化する。
> Phase 4 の統合判断の根拠とするため、実コードを読んで作成すること。

## Save Entry Points

- [x] 保存入口一覧作成 (UI からの保存トリガーをすべて列挙)
- [x] UI → Save 経路整理 (各 UI コンポーネントがどの保存関数を呼ぶか)

## Save Pipeline

- [x] `record.js` 経路整理 (`saveRecord` / `saveRecordScreen` の呼び出しフロー)
- [x] `record-three-card.js` 経路整理 (`_saveRecord` / `_integrateWithExistingSave` フロー)
- [x] `record/save.js` 経路整理 (save context の生成・検証・通知フロー)
- [x] `record-three-card-save.js` 経路整理
- [x] `record-upsert.js` 経路整理
- [x] `record-repository.js` 経路整理 (IDB 操作の実体)
- [x] `store/persistence.js` 経路整理

## Runtime Flow

- [x] `save-transaction-guard.js` 整理 (guard が防いでいる障害を特定)
- [x] `state-integrity-guard.js` 整理
- [x] `rollback-manager.js` 整理
- [x] `services/recovery.js` 整理

## Cloud Flow

- [x] sync 経路整理 (local → Supabase の同期フロー)
- [x] retry 経路整理 (失敗時の再試行ロジック)
- [x] conflict 経路整理 (ローカル・クラウド競合の解決ロジック)
- [x] failure 経路整理 (保存失敗時の挙動)

## State Flow

- [x] state 更新経路整理 (`saveState` / `addPreSaveHook` / `addPostSaveHook`)
- [x] hydration 経路整理 (起動時の state 復元フロー)
- [x] restore 経路整理 (rollback / recovery による復元フロー)

### 成果物

- [x] `docs/save-architecture.md` (保存パイプライン全体の文章説明)
- [x] `docs/save-sequence-diagram.md` (シーケンス図)

---

# Architecture Review Gate

> **Phase 4 へ進む前に必須。**
> 統合価値が証明できない場合は「統合しない」を選択する。

## ROI Evaluation

- [x] app-legacy 削除の価値証明 (削除後の保守コスト削減量を定量化)
- [x] Runtime 統合の価値証明 (重複責務の存在を実コードで証明)
- [x] Save 統合の価値証明 (経路分散によるリスクを実コードで証明)
- [x] Premium 統合の価値証明 (Source of Truth 分散によるバグリスクを実コードで証明)
- [x] Disease 標準化の価値証明 (インターフェース不一致による問題を実コードで証明)

## Decision Review

- [x] 「統合しない」案を評価した記録
- [x] 維持コストの評価
- [x] 統合コストの評価
- [x] ROI の記録 (各改修の価値 vs コスト)

### 成果物

- [x] `docs/architecture-review.md` (ROI 評価・統合判断の根拠・却下した案)

---

# Phase 4 — 統合

> **目標**: Phase 1〜3 の分析結果に基づき、アーキテクチャを理想構造へ移行する。
> 統合前に責務を定義する。テストで保証できない変更は実施しない。

## Phase4 実施ルール

- [ ] Phase4-D は app-legacy.js の移植完了後のみ着手する
- [ ] Phase4-A〜D は順番固定としない
- [ ] 独立実施可能な領域から優先する
- [ ] 調査結果により実施順序変更を許可する

## Legacy Removal

### Phase 4-A — 重複済み関数の削除（約3,000行削減）

- [x] legacy 内 IDB 操作群 (`openIDB` / `idbPutRecord` / `idbGetAllRecords` / `idbDeleteRecord` / `generateRecordId` / `ensureRecordIds` / `migrateToIDB`) を削除 → `record-repository.js` へ移植
- [x] legacy 内 auth 群 (`supabaseHeaders` / `supabaseAuth` / `supabaseSignInAnonymous` / `supabaseRefreshSession` / `supabaseEnsureAuth`) を削除 → Phase 4-B 完了
- [x] legacy 内 sync 群 (`syncRecordToCloud` / `syncAllRecordsToCloud` / `pullRecordsFromCloud` / `cloudSyncSafe` / `saveBackupHistory`) を削除 → `services/supabase.js` が提供
- [x] legacy 内 toast / UI utility (`showToast` / `showSyncIndicator` / `hideSyncIndicator`) を削除 → `ui-notifications.js` が提供（Phase 4-C 完了）
- [x] legacy 内 cycle 計算群 (`calcCycleDay` / `getCyclePhase` / `getCurrentCyclePhase`) を削除 → `analytics/cycle-engine.js` へ移植（Phase 4-C 完了）。`analyzeCyclePhases` は同ファイルに既存

### Phase 4-B — Runtime / Service 移行（約2,000行削減）

- [x] `saveState()` bridge を `save-transaction-guard.js` (window.saveState) へ委譲 — legacy 側は window 経由で透過的に動作
- [x] `repairFromBest()` / `runSelfDiagnosis()` / `showDiagnosisUI()` を `runtime-debug-overlay.js` へ移植後 legacy 側削除
- [x] `openRestoreUI()` を `runtime-debug-overlay.js` へ移植後 legacy 側削除
- [x] `submitPremiumWaitlist()` を Supabase SDK 直呼び出しへ書き換え・auth 群依存排除
- [x] `showRecoveryGuide()` / `showBingeUrgeSupport()` を `services/recovery-journey.js` へ移植後 legacy 側削除（Phase 4-C 完了）
- [x] `checkPremiumRegistered()` を `premium-service.js` へ移植後 legacy 側削除（Phase 4-C 完了）

### Phase 4-C — Module 新設・移植（約1,000行削減）

- [x] `src/modules/timeline.js` 新設 — renderTimeline / loadMoreTimeline / updateTimelineView 移植
- [x] `src/modules/experiments.js` 新設 — openExperiments / startExperiment / _buildExperimentCompanion 移植
- [x] `src/modules/vision.js` 新設 — toggleVisionEdit / initVisionUI / saveVision / updateVisionDisplay 移植
- [x] `src/modules/meal-tracker.js` 新設 — openMealTimePicker / addMealTime 移植
- [x] `src/modules/pain-scale.js` 新設 — renderPainScale 移植
- [x] `src/modules/disease-settings.js` 新設 — Disease Settings UI 7関数 移植
- [x] `src/modules/onboarding-runtime.js` 拡充 — ob* 15関数 + completeOnboarding / finishOnboarding 移植
- [x] `src/analytics/cycle-engine.js` 拡充 — calcCycleDay / getCyclePhase / getCurrentCyclePhase 移植
- [x] `src/services/recovery-journey.js` 拡充 — showRecoveryGuide / showBingeUrgeSupport 移植
- [x] `src/modules/premium/premium-service.js` 拡充 — checkPremiumRegistered 移植
- [x] app-legacy.js: 12,296 → 10,801 行（-1,495行 / Phase 4-C 単体 -964行）
- [ ] グローバル変数 (`state` / `currentRecord` / `supabaseToken` / `supabaseUserId`) の参照を state-store / auth-service へ移行 → Phase 4-D

### Phase 4-D — 最終廃止

- [ ] オンボーディングフロー完全移植確認
- [ ] `app.html` 内の legacy 関数参照を全廃
- [ ] `app.html` 内の `<script src="app-legacy.js">` タグ削除
- [ ] `src/app-legacy.js` ファイル削除
- [ ] app-legacy.js への import ゼロ確認 (`grep -r "app-legacy" src/`)
- [ ] app-legacy.js 参照ゼロ確認

## Save Architecture

- [ ] 保存経路を一本化 (`RecordRepository` を唯一の保存窓口とする)
- [ ] `RecordRepository` が唯一の保存窓口であることを証明
- [ ] `saveState` 直接依存を削除 (record 保存が state.saveState を直接呼ばない構造へ)
- [ ] legacy 保存経路を削除
- [ ] 重複 sync 処理を削除

## Runtime

- [x] runtime 責務の再定義 (各ファイルの責務を明文化) → ADR-002 参照
- [x] `runtime-brain.js` 整理 → 監査完了・変更不要 (observer 責務明確)
- [x] `runtime-controller.js` 整理 → 監査完了・変更不要 (executor 責務明確)
- [x] `runtime-orchestrator.js` 整理 → thin aggregator として維持 (ADR-002)
- [x] startup 処理の統合 → ADR-002: 統合却下 (render gate / phase tracker は別責務)
- [x] hydration 処理の統合 → ADR-002: 統合却下 (data guard / render timing は別責務)
- [x] `startup-render-gate.js` を削除 → ADR-002: 削除却下 (hydration-guard とは異なる責務)
- [x] `runtime-debug-overlay.js` を本番バンドルから除外 → 完了済み (import.meta.env.DEV)
- [ ] `production-diagnostics.js` (1,401行) を責務別に分割 → テストなし・延期 (ADR-002)

## Premium

- [x] `subscriptions` テーブル作成 (migration: `supabase/migrations/20260005_subscriptions.sql`)
- [x] 既存有料ユーザーの移行スクリプト作成 (migration 内 INSERT INTO subscriptions)
- [x] `stripe-webhook/index.ts` — `checkout.session.completed` ハンドラ改修
  - サイレント失敗バグ修正 (metadata.userId で直接参照、email フォールバック廃止)
  - `subscriptions` テーブルへの UPSERT に変更
  - `subscription_id` / `customer_id` の保存を追加
- [x] `stripe-webhook/index.ts` — `customer.subscription.deleted` ハンドラ改修
- [x] `stripe-webhook/index.ts` — `customer.subscription.updated` ハンドラを追加
- [x] `premium-service.js` を `subscriptions` テーブル参照に変更
- [x] `profiles.is_premium` カラムへの書き込みを削除 (webhook 改修により)
- [x] `premium-service.js` の `localStorage` キャッシュを置換 (Realtime + オフライン fallback に変更)
- [x] `window.isPremium` グローバルを廃止 (ippo:premium-updated イベントでブリッジに変更)
- [x] `window.ippoPremiumService` グローバルを廃止 (直接 import に変更)
- [x] `stripe.js` の `setInterval` ポーリング (2500ms × 12回) を削除
- [x] Supabase Realtime で `subscriptions` テーブルの変更を購読

## Disease Layer

- [x] Analyzer 出力の統一 (全11疾患で共通インターフェースを適用)
- [x] `BaseAnalyzer.analyze()` に `severity` を追加
- [x] `BaseAnalyzer.analyze()` に `riskLevel` を追加
- [x] `BaseAnalyzer.analyze()` に `recommendation` を追加
- [x] `EndometriosisAnalyzer` — `cyclePainCorrelation` / `nonMenstrualFlareProfile` 追加
- [x] `PCOSAnalyzer` — `weightCorrelation` 強化・`insulinResistanceProxy` 追加
- [x] `PMSPMDDAnalyzer` — `cycleVariance` / `moodCycleCorrelation` 追加
- [x] `OvarianCystAnalyzer` — `acutePainRisk` 追加
- [x] `FibroidAnalyzer` — `bulkSymptomRate` 追加
- [x] `MenopauseAnalyzer` — `genitourinarySymptoms` 追加
- [x] `InfertilityAnalyzer` — `lutealPhaseData` 追加
- [x] `ProlapseAnalyzer` — `pelvicFloorImpact` 追加
- [x] `ChronicPelvicPainAnalyzer` — `chronicityIndex` 追加
- [x] `VulvodynamiaAnalyzer` — `qualityOfLifeScore` 追加

## Home Insight

- [x] `prediction-generator.js` に `data.painScore` / `data.headacheRisk` / `data.fatigueScore` を追加
- [x] `reason-generator.js` に `data.topTrigger` / `data.trendDirection` / `data.flareRate` を追加
- [x] `action-generator.js` の `_extractPainScore(body)` を削除
- [x] `action-generator.js` の `_extractTrigger(body)` を削除
- [x] `prediction.body` への正規表現依存をすべて削除
- [x] `reason.body` への正規表現依存をすべて削除
- [x] `action-generator.js` が構造データのみ参照していることを確認

## Design System

- [x] `design-system.css` の現行 Token 一覧を作成
- [x] 新規 Token を追加 (`--radius-card` / `--radius-button` / `--z-overlay` / `--transition-pop` / `--border-inactive`) — `--shadow-card` は app.css に既存のため除外
- [x] `stripe.js` のハードコードカラー・インラインスタイルを CSS クラスへ移動 (`.plan-card--selected` / `.plan-card--inactive` / `.upsell-banner`)
- [x] 全 CSS ファイルの `border-radius: 20px` を `var(--radius-card)` に置換 (app.css 含む全6ファイル)
- [x] JS ファイル内のインラインスタイルブロックを CSS クラスへ移動 (stripe.js)

## Edge Function 品質向上

- [ ] Rate Limit の永続化 (Supabase Table または KV)
- [ ] `_shared/auth.ts` の利用を全 Edge Function で統一
- [ ] エラーレスポンス形式を `{ error: string, code?: string }` に統一
- [ ] 構造化ログを全 Edge Function に追加

### 成果物

- [ ] `docs/target-architecture.md` (統合後のアーキテクチャ全体図)
- [ ] `docs/migration-report.md` (各移行の実施記録・削除根拠)
- [ ] `docs/LEGACY_REMOVAL_REPORT.md`
- [ ] `docs/PREMIUM_ARCHITECTURE.md`
- [ ] `docs/INSIGHT_DATA_CONTRACT.md`
- [ ] `docs/DISEASE_ANALYZER_STANDARD.md`
- [ ] `docs/DESIGN_SYSTEM_STANDARD.md`
- [ ] `docs/EDGE_PLATFORM_STANDARD.md`
- [ ] `docs/adr/`

## Architecture Decision Records (ADR)

> 重要な構造判断を将来監査できるようにする。
>
> ADR は「実際に採用された判断」のみ記録する。
> 当初計画と異なる判断になった場合も、
> 最終的な採用理由を記録する。

- [ ] ADR-001 Save Architecture 統合判断
- [x] ADR-002 Runtime 統合判断 → `docs/adr/ADR-002-runtime-architecture.md`
- [ ] ADR-003 Premium Source of Truth 統一判断
- [ ] ADR-004 Disease Analyzer 標準化判断
- [ ] ADR-005 Guard 責務吸収・廃止判断

---

# Phase 5 — Guard 責務吸収と削除

> **目標**: guard は即削除しない。責務を基盤へ吸収した後にのみ削除する。
> 削除の根拠は「新構造で再発不可であること」をテストで証明すること。

## Guard Analysis

- [ ] `save-transaction-guard.js` 分析 (存在理由・防いでいる障害・再発条件)
- [ ] `record-freshness-guard.js` 分析
- [ ] `record-draft-guard.js` 分析
- [ ] `record-edit-save-identity-guard.js` 分析
- [ ] `state-integrity-guard.js` 分析
- [ ] `hydration-guard.js` 分析
- [ ] `startup-validator.js` 分析

## Evidence Collection

- [ ] 各 guard の存在理由を実コードで特定
- [ ] 各 guard が防いでいる障害を特定
- [ ] 障害の再発条件を特定

## Responsibility Absorption

- [ ] `RecordRepository` へ吸収できる guard 責務を特定・移行
- [ ] Runtime 基盤へ吸収できる guard 責務を特定・移行
- [ ] Domain Layer へ吸収できる guard 責務を特定・移行

## Guard Removal Gate

> 以下をすべて満たした guard のみ削除を承認する。

- [ ] 新構造で障害が再発しないことをテストで証明
- [ ] テスト追加完了
- [ ] 回帰テスト成功
- [ ] 削除承認
- [ ] guard 削除実施

### 成果物

- [ ] `docs/guard-decommission-plan.md` (各 guard の分析結果・吸収先・削除根拠)

---

# Test Coverage Gate

> **全 Phase 共通。テストで保証できない変更は実施しない。**

- [ ] 現行挙動のテスト化 (変更前の動作をテストとして記録)
- [ ] 統合後テスト成功
- [ ] 回帰テスト追加
- [ ] 保存系テスト成功 (全 save entry point の動作確認)
- [ ] Runtime 系テスト成功
- [ ] Premium 系テスト成功 (Stripe CLI でのエンドツーエンド)
- [ ] Disease 系テスト成功 (全11 Analyzer のユニットテスト)

---

# UI Safety Gate

> UI・UX・画面表示に影響する可能性がある変更は、
> 実装前後で表示差分を確認する。

## 対象変更

以下に該当する変更は UI Safety Gate を通過すること。

- [ ] HTML 変更
- [ ] CSS 変更
- [ ] Design Token 変更
- [ ] Design System 変更
- [ ] DOM 構造変更
- [ ] render 系関数変更
- [ ] Module UI 移植
- [ ] app-legacy.js の UI 機能移植
- [ ] Home 画面変更
- [ ] Timeline 画面変更
- [ ] Record 画面変更
- [ ] Settings 画面変更
- [ ] Premium 画面変更
- [ ] Onboarding 変更

## Before / After Capture

- [ ] 変更前スクリーンショット取得
- [ ] 変更後スクリーンショット取得
- [ ] 差分確認完了

## Visual Regression Check

### Home

- [ ] Home 表示一致
- [ ] Insight 表示一致
- [ ] CTA 表示一致

### Record

- [ ] 記録画面表示一致
- [ ] 保存ボタン表示一致
- [ ] 入力フォーム表示一致

### Timeline

- [ ] 一覧表示一致
- [ ] カード表示一致

### Settings

- [ ] 設定画面表示一致

### Premium

- [ ] Premium 画面表示一致
- [ ] 購入導線表示一致

### Onboarding

- [ ] ステップ表示一致
- [ ] 完了導線一致

## Responsive Check

- [ ] iPhone サイズ確認
- [ ] Android サイズ確認
- [ ] Tablet サイズ確認

## Accessibility Check

- [ ] コントラスト維持
- [ ] フォーカス移動維持
- [ ] ボタン押下可能

## Approval Gate

以下をすべて満たした場合のみ完了。

- [ ] 意図しない UI 変更なし
- [ ] 意図しないデザイン変更なし
- [ ] 意図しない導線変更なし
- [ ] スクリーンショット保存済み
- [ ] UI 監査完了

---

# Domain Architecture Audit

> 主要ドメインは実装完了後に個別監査を実施する。

## Save Architecture Audit

- [ ] Save Architecture 監査完了
- [ ] RecordRepository 単一窓口確認
- [ ] Save Entry Point 一覧との整合確認
- [ ] 保存経路図との整合確認

## Runtime Architecture Audit

- [ ] Runtime Architecture 監査完了
- [ ] Runtime 責務分離確認
- [ ] Startup Flow 確認
- [ ] Hydration Flow 確認

## Premium Architecture Audit

- [ ] Premium Architecture 監査完了
- [ ] subscriptions テーブル確認
- [ ] Stripe Webhook 確認
- [ ] Realtime 同期確認
- [ ] Single Source of Truth 確認
- [ ] localStorage 依存ゼロ確認
- [ ] window.isPremium 依存ゼロ確認

## Disease Architecture Audit

- [ ] Disease Layer 監査完了
- [ ] 全11 Analyzer 共通 IF 確認
- [ ] Analyzer 出力統一確認

## Insight Architecture Audit

- [ ] Insight Architecture 監査完了
- [ ] 正規表現依存ゼロ確認
- [ ] 構造データ参照確認

## Design System Audit

- [ ] Design System 監査完了
- [ ] Token 以外の色指定ゼロ確認
- [ ] ハードコード値削減確認

## Edge Platform Audit

- [ ] Edge Platform 監査完了
- [ ] Auth 統一確認
- [ ] Error 形式統一確認
- [ ] Rate Limit 永続化確認

---

# Release Architecture Audit

## Final Validation

- [ ] app-legacy.js 削除済み
- [ ] app-legacy.js 依存ゼロ (`grep -r "app-legacy" src/` で結果なし)
- [ ] 保存経路一本化完了 (`RecordRepository` が唯一の保存窓口)
- [ ] Runtime 責務明確化完了 (重複責務ゼロ)
- [ ] Premium 状態管理一本化完了 (`subscriptions` テーブルのみ・`window.isPremium` 廃止)
- [ ] Disease Layer 標準化完了 (全11 Analyzer が共通インターフェース準拠)
- [ ] Home Insight 構造化完了 (正規表現依存ゼロ・全 Generator が構造データを返す)
- [ ] guard 責務吸収完了
- [ ] 不要 guard 削除完了

## Documentation

- [ ] 保存経路図を最新化
- [ ] Runtime 構成図を最新化
- [ ] Dependency Map を最新化
- [ ] guard 根拠一覧を作成 (残存 guard の存在理由を明文化)
- [ ] 削除根拠一覧を作成 (削除した guard・コードの根拠を記録)

## Architecture Protection

> 完成後のアーキテクチャ劣化を防止する。

- [ ] RecordRepository 以外から保存禁止
- [ ] Supabase 直接呼び出し禁止ルール整備
- [ ] window.* 新規追加禁止
- [ ] 新規 global state 作成禁止
- [ ] Design Token 以外の色指定禁止
- [ ] 新規 legacy ファイル作成禁止
- [ ] ESLint / CI で違反検知

## Release Criteria

- [ ] 全テスト成功
- [ ] リリース監査完了
- [ ] 新規開発者が1日以内に構造を理解可能
- [ ] 長期保守可能と判断
- [ ] ADR 作成完了
- [ ] Architecture Protection Rule 有効化
- [ ] CI による構造監査成功
- [ ] Architecture Completion 達成

---

# Progress Dashboard

| Area | Status | Progress |
|------|--------|----------|
| Legacy Removal | 🔴 Not Started | 0% |
| Runtime | 🟡 In Progress | 89% (production-diagnostics.js 分割のみ延期) |
| Premium | 🟢 Complete | 100% |
| Insight | 🟢 Complete | 100% |
| Disease | 🟢 Complete | 100% |
| Design System | 🟢 Complete | 100% |
| Edge Platform | 🔴 Not Started | 0% |
| **Overall** | 🔴 Not Started | **0%** |

---

> このファイルはすべての開発セッションで参照するマスターチェックリストです。
> 各チェックが完了したら即座に更新し、Progress Dashboard を同期させてください。
> 最終更新: 2026-06-10

---

# Pull Request Strategy

> 各フェーズ完了時に PR を作成する。
>
> PR は監査記録であり、
> 「何を変更したか」だけでなく
> 「なぜ変更したか」を残す。

- [x] Phase1 完了 PR
- [x] Phase2 完了 PR
- [x] Phase3 完了 PR
- [ ] Architecture Review Gate PR
- [ ] Phase4-A PR
- [ ] Phase4-B PR
- [ ] Phase4-C PR
- [ ] Phase4-D PR
- [ ] Phase5 PR
- [ ] Release Architecture Audit PR

## 特別ルール

- [ ] app-legacy.js 削除は単独PRとする
- [ ] 大規模削除は削除根拠ドキュメントを必須とする
- [ ] PRには変更理由・削除理由・影響範囲を記録する
- [ ] 計画変更時は変更理由をPRに記録する
- [ ] ADR更新を伴う変更はPR内で参照する

## PR Audit

- [x] Phase1 PR 監査完了
- [x] Phase2 PR 監査完了
- [x] Phase3 PR 監査完了
- [ ] Architecture Review Gate PR 監査完了
- [ ] Phase4-A PR 監査完了
- [ ] Phase4-B PR 監査完了
- [ ] Phase4-C PR 監査完了
- [ ] Phase4-D PR 監査完了
- [ ] Phase5 PR 監査完了
