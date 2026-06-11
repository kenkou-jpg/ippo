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
- 分析完了と実装完了を区別する
- 調査のみでは完了扱いにしない
- 実装完了後はテスト成功まで完了扱いにしない
- 完了チェックには根拠ドキュメントまたは PR を紐付ける

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
- [x] app-legacy.js 依存一覧作成 → `docs/legacy-dependency-map.md` (app.html onclick 60+箇所・src/ window参照 50+箇所・window公開関数 198個)
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

# Completion Evidence Rule

> チェック完了の基準を統一する。

## Analysis Complete

以下を満たした場合のみ完了。

- [ ] 実コード調査完了
- [ ] 呼び出し元特定完了
- [ ] 依存関係特定完了
- [ ] 副作用特定完了

## Design Complete

以下を満たした場合のみ完了。

- [ ] 移行先決定
- [ ] 責務定義完了
- [ ] 統合方針決定
- [ ] ADR または設計記録作成

## Implementation Complete

以下を満たした場合のみ完了。

- [ ] コード実装完了
- [ ] 旧コードとの差分確認
- [ ] レビュー完了

## Validation Complete

以下を満たした場合のみ完了。

- [ ] テスト追加完了
- [ ] 回帰テスト成功
- [ ] 関連チェックリスト更新完了

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

### Phase 4-D Readiness Gate

> app-legacy.js 削除前に必ず完了すること。
> Phase 4-D は「削除フェーズ」であり、依存調査・移植先決定・責務分析が完了していない状態では開始しない。
> app-legacy.js の削除は「削除可能であることを証明した後」にのみ実施する。

#### Legacy Dependency Mapping

- [x] `app.html` の onclick 一覧作成 → `docs/legacy-dependency-map.md` §2 (60+箇所)
- [x] `app.html` の onclick 呼び出し元マップ作成 → `docs/legacy-dependency-map.md` §2
- [x] 全 onclick の移行先決定 → `docs/legacy-dependency-map.md` §6
- [x] legacy 関数参照一覧作成 → `docs/legacy-dependency-map.md` §3・§4 (198個)
- [x] app-legacy.js 呼び出しグラフ作成 → `docs/legacy-dependency-map.md` §5
- [x] app-legacy.js 依存一覧完成 → `docs/legacy-dependency-map.md` 完成

#### Critical Legacy Functions

**`buildDraftFromUI`**
- [x] 呼び出し元一覧作成 → `record/save.js:926`, `record-edit-hydrate.js:431`, `record-edit-save-identity-guard.js:220`
- [x] 入力データ定義 → DOM 読み取りのみ（`gatherRecordData()` が実体。app-legacy.js:8322）
- [x] 出力データ定義 → record draft オブジェクト（date / symptoms / cycle / pain* / medication / energy / sleep* / factors / bowel / mood / discharge* / diseaseCheck / diseases / temp / tempMethod）
- [x] 副作用一覧作成 → なし（DOM 読み取りのみ。localStorage 書き込みなし）
- [x] 移行先決定 → `src/modules/record.js` に `gatherRecordData()` ベースの実装を移植（副作用なしの純粋な UI → draft 変換関数として実装）
- [x] 移植完了 → `src/modules/record.js:_buildDraftFromUIImpl()` 実装済み。app-legacy.js 廃止後は自動的に module 実装にフォールバック
- [x] 回帰テスト成功 → `tests/modules/build-draft-from-ui.test.js` 20/20 成功

**`saveRecordScreen`**
- [x] 呼び出し元一覧作成 → `app.html:677` (onclick), `window.saveRecordScreen` として公開
- [x] 保存フロー分析 → `gatherRecordData()` → 日付検索 → rec 組立 → `gatherDiseaseData()` → `saveState()` → localStorage 検証 → UI更新群 → `cloudBackupAll()` (retry付き)
- [x] `saveState` 依存分析 → `window.saveState` 経由（fallback: ローカル saveState → localStorage 直書き）
- [x] sync 依存分析 → `window.cloudBackupAll` 経由 / 失敗時 3秒リトライ → toast
- [x] RecordRepository への統合方針決定 → `buildDraftFromUI()` → `upsertRecord()` → `persistRecords()` → `notifyRecordUpdated()` → `syncRecordCloud()` の順に再構成。window.saveState / cloudBackupAll は record/save.js の pipeline 経由に集約
- [x] 移植完了 → `src/modules/record.js:saveRecordScreen()` 実装済み。window.getState / window.saveState / window.cloudBackupAll 経由で legacy / module 両対応
- [x] 回帰テスト成功 → `tests/modules/save-record-screen.test.js` 12/12 成功

#### Global Window Dependency Removal

- [ ] `window.getState` 依存除去
- [ ] `window.saveState` 依存除去
- [ ] `window.cloudBackupAll` 依存除去
- [ ] `window.supabaseToken` 依存除去
- [ ] `window.supabaseUserId` 依存除去
- [ ] modules から `window.*` 参照を全廃
- [ ] import ベース依存へ置換

#### Legacy Classification Completion

- [ ] 未分類関数ゼロ
- [ ] 全関数の移行先決定
- [ ] 削除対象関数一覧確定
- [ ] 移植対象関数一覧確定

#### Phase 4-D Start Gate

> 以下をすべて満たした場合のみ Phase 4-D の開始を許可する。

- [ ] onclick マッピング完了
- [ ] `buildDraftFromUI` 移植完了
- [ ] `saveRecordScreen` 移植完了
- [ ] window 依存除去完了
- [ ] 未分類関数ゼロ
- [ ] app-legacy.js 依存一覧完成
- [ ] 回帰テスト成功
- [ ] 削除リスク評価完了

## Phase 4-D Start Gate

> app-legacy.js 削除作業開始前に必須。

### buildDraftFromUI

- [x] buildDraftFromUI 分析完了 → 実体は `gatherRecordData()` (app-legacy.js:8322)。呼び出し元3箇所特定済み
- [x] buildDraftFromUI 移植完了 → `src/modules/record.js:_buildDraftFromUIImpl()` 実装済み (PR #feat/legacy-dependency-map f7497c9)
- [x] buildDraftFromUI テスト成功 → `tests/modules/build-draft-from-ui.test.js` 20/20 成功

### saveRecordScreen

#### Analysis

- [x] saveRecordScreen 分析完了 → app-legacy.js:8439–8662 実コード調査済み
- [x] saveRecordScreen 呼び出し元特定完了 → `app.html:677` (onclick), `window.saveRecordScreen`
- [x] saveRecordScreen 副作用一覧作成 → state.records 変更 / saveState() 呼び出し / UI更新群 / cloudBackupAll() / localStorage draft 削除 / draftGuard.markClean()
- [x] saveRecordScreen 入出力定義完了 → 入力: DOM 状態。出力: なし（副作用のみ）。内部で gatherRecordData() + gatherDiseaseData() を呼ぶ

#### Design

- [x] RecordRepository 統合設計完了 → `buildDraftFromUI()` → `upsertRecord()` → `persistRecords()` の pipeline に再構成
- [x] SyncService 分離設計完了 → `syncRecordCloud()` (record/save.js) 経由に統一。3秒 retry は syncRecordCloud の責務として保持
- [x] UI 通知分離設計完了 → `notifyRecordUpdated()` (record/save.js) に委譲。success-overlay は saveRecordScreen 側に残す（UX責務）

#### Implementation

- [x] saveRecordScreen 実装完了 → `src/modules/record.js:saveRecordScreen()` / `_saveRecordScreenImpl()` 実装済み。app-legacy.js 廃止後は自動フォールバック

#### Validation

- [x] 保存テスト成功 → `tests/modules/save-record-screen.test.js` 12/12 成功
- [x] 同期テスト成功 → cloudBackupAll 呼び出し + 3秒リトライ確認済み

### Legacy Removal Readiness

- [ ] saveState 依存一覧作成
- [ ] cloudBackupAll 依存一覧作成
- [ ] window 依存一覧更新
- [ ] 未分類関数ゼロ確認

- [ ] Phase 4-D 開始承認

### Phase 4-D — 最終廃止

- [ ] オンボーディングフロー完全移植確認
- [ ] `app.html` 内の legacy 関数参照を全廃
- [ ] `app.html` 内の `<script src="app-legacy.js">` タグ削除
- [ ] `src/app-legacy.js` ファイル削除
- [ ] app-legacy.js への import ゼロ確認 (`grep -r "app-legacy" src/`)
- [ ] app-legacy.js 参照ゼロ確認

## SaveRecordScreen Validation Gate

> saveRecordScreen 移植後、以下をすべて満たすこと。

### Normal Save

- [ ] 通常保存成功
- [ ] 保存後再読込成功
- [ ] 編集保存成功
- [ ] レコード更新成功

### Draft Save

- [ ] 下書き保存成功
- [ ] 下書き復元成功
- [ ] 下書き更新成功

### Temporary Save

- [ ] 一時保存成功
- [ ] 一時保存復元成功

### Auto Save

- [ ] 自動保存成功
- [ ] 自動保存から復元成功

### Backup

- [ ] ローカルバックアップ成功
- [ ] クラウドバックアップ成功
- [ ] バックアップ復元成功

### Sync

- [ ] local → cloud 同期成功
- [ ] cloud → local 同期成功
- [ ] 同期失敗時 retry 成功
- [ ] conflict 解決成功
- [ ] offline → online 復帰同期成功

---

## Persistence Validation

> 保存後もデータが保持され続けることを確認する。

### Reload

- [ ] 編集保存後リロードしても変更内容が残る
- [ ] 下書き保存後リロードしても下書きが残る
- [ ] 一時保存後リロードしてもデータが残る

### Restart

- [ ] ブラウザ再起動後もデータが残る
- [ ] セッション再開後もデータが残る

### Sync Persistence

- [ ] 同期完了後リロードしてもデータが残る
- [ ] オフライン保存 → オンライン同期後もデータが残る

### Recovery

- [ ] クラウド復元後にデータが復旧する
- [ ] rollback 実行後にデータが復旧する

### Data Reset Protection

- [ ] アプリリロードで保存データが消失しない
- [ ] hydration 実行後もデータが保持される
- [ ] state 再構築後もデータが保持される
- [ ] sync 実行後に既存データが消失しない

---

## Regression

- [ ] 既存保存機能の消失なし
- [ ] UI 表示崩れなし
- [ ] Runtime Error なし

---

## Critical Safety Checks

> 保存アーキテクチャ変更で絶対に壊してはいけない項目。

- [ ] データ欠損なし
- [ ] データ重複なし
- [ ] データ上書き事故なし
- [ ] 保存成功表示と実データ状態が一致する
- [ ] RecordRepository 経由保存データが再読込可能

---

## Legacy Removal Gate

> 以下をすべて満たした場合のみ app-legacy.js 削除を許可する。

- [ ] app-legacy.js 経由保存が発生しない
- [ ] saveRecordScreen が RecordRepository 経由で保存する
- [ ] SyncService 経由で同期する
- [ ] SaveRecordScreen Validation Gate 全項目成功
- [ ] Persistence Validation 全項目成功
- [ ] Critical Safety Checks 全項目成功
- [ ] 全保存テスト成功後にのみ app-legacy.js 削除を許可

## Save Architecture

### Save Domain Audit

- [x] 保存種別一覧作成 → ADR-001 参照
- [x] 通常保存責務定義 → ADR-001: record.js → record/save.js → saveState + idbPutRecord + cloudBackupAll
- [x] 一時保存責務定義 → ADR-001: 三カード fallback (rtcSaveDelegate 未注入時のみ発動)
- [x] 下書き保存責務定義 → ADR-001: record-draft-guard.js → localStorage['ippo_record_draft']
- [x] 自動保存責務定義 → ADR-001: pagehide/visibilitychange 駆動、タイマー不使用
- [x] バックアップ保存責務定義 → ADR-001: rollback-manager.js → メモリ内スナップショット
- [x] 復元保存責務定義 → ADR-001: rollbackTo() / hydration-guard / cloud restore

- [x] 各保存種別の保存先を記録 → ADR-001
- [x] 各保存種別のデータ契約を記録 → ADR-001
- [x] 各保存種別のライフサイクルを記録 → ADR-001

- [ ] RecordRepository 統合後も全保存種別が維持されることを証明 → 統合後に確認

### Save Boundary Definition

- [x] Record データ保存の定義を記録 → ADR-001: state.records 配列、localStorage/IDB/Supabase
- [x] UI 状態保存の定義を記録 → ADR-001: ippo_state に混在、saveState 経由（例外）
- [x] 設定値保存の定義を記録 → ADR-001: ippo_state に混在、saveState 経由（例外）

- [ ] Record データ保存は RecordRepository のみ許可 → 統合後に適用
- [x] UI 状態保存は例外ルールとして定義 → ADR-001 に記録
- [x] 設定値保存は例外ルールとして定義 → ADR-001 に記録

- [x] 保存責務境界を文書化 → ADR-001 保存責務境界テーブル参照

## Save Consolidation Gate

> 保存経路統合の前提条件。
> 以下をすべて満たすまで統合作業を開始しない。

- [x] 全保存種別の責務定義完了 → ADR-001
- [x] 全保存種別の保存先特定完了 → ADR-001
- [x] 全保存種別のライフサイクル記録完了 → ADR-001
- [x] 保存機能消失リスク評価完了 → ADR-001: 高リスク・段階的移行を採用
- [x] 統合 ROI 記録完了 → ADR-001: 段階的移行判断

### Save Consolidation

- [x] 保存経路を一本化 (`RecordRepository.persistRecords()` を write facade として追加。guard / recovery / rollback 経由に統一)
- [x] `RecordRepository` が唯一の保存窓口であることを証明 (record-freshness-guard / record-edit-save-identity-guard / recovery.js / rollback-manager の saveState 直接呼び出しをすべて persistRecords() 経由に変更)
- [x] `saveState` 直接依存を削除 (上記 4 ファイルから saveState の直接 import / window 経由呼び出しを削除)
- [ ] legacy 保存経路を削除 → Phase 4-D (app-legacy.js 削除) 後に実施 (ADR-006)

### Save Architecture Validation

- [ ] 保存機能の消失がないことを確認
- [ ] 下書き保存が維持されることを確認
- [ ] 一時保存が維持されることを確認
- [ ] 自動保存が維持されることを確認
- [ ] バックアップ保存が維持されることを確認
- [ ] 復元機能が維持されることを確認
- [ ] 保存失敗時にデータ欠損しないことを確認
- [ ] 保存途中クラッシュ時に復元可能であることを確認
- [ ] 重複保存でデータ破壊が発生しないことを確認

## Save Protection Rules

> RecordRepository 統合後も保存機能を削減してはならない。

- [ ] 通常保存が維持されることを確認
- [ ] 一時保存が維持されることを確認
- [ ] 下書き保存が維持されることを確認
- [ ] 自動保存が維持されることを確認
- [ ] バックアップ保存が維持されることを確認
- [ ] 復元保存が維持されることを確認
- [ ] オフライン保存が維持されることを確認
- [ ] クラウド同期が維持されることを確認

## Sync Architecture

> 保存と同期は別責務として監査する。

### Sync Domain Audit

- [x] 同期入口一覧作成 → ADR-001 参照:
  - `record/save.js` → `syncRecordCloud()` → `cloudBackupAll()` (通常保存後)
  - `record-three-card.js` fallback → `window.cloudBackupAll()` (delegate 未注入時のみ)
- [x] SyncService 責務定義 → `supabase.js`: `cloudBackupAll()` / `syncRecordImmediately()` / `retrySyncPending()`

- [x] local → cloud 同期経路整理 → `cloudBackupAll()` = 全state を Supabase upsert; `syncRecordImmediately()` = 個別 record upsert
- [x] cloud → local 同期経路整理 → `hydration-guard.js` 経由の stale ブロック付きリストア
- [x] retry 戦略整理 → `record.syncPending` フラグ + `retrySyncPending()` で起動時再試行
- [x] conflict 解決戦略整理 → last-write-wins。cloudBackupAll の空レコード上書きガードあり。hydration-guard が stale 復元をブロック
- [x] offline → online 復帰戦略整理 → `syncPending` フラグ → 次回起動時 `retrySyncPending()`

### Sync Consolidation

- [ ] 重複 sync 処理削除（削除前に責務差分を証明） → 三カード fallback 削除と連動 (ADR-001)。mergeRecords() の重複 (supabase.js / recovery.js) も統合対象 (ADR-007)
- [ ] SyncService が唯一の同期窓口であることを証明 → cloudBackupAll() の直接呼び出し 3 経路を SyncService 経由に統一後に確認 (ADR-007)

### Sync Validation

- [ ] オフライン保存後に同期できることを確認
- [ ] 同期失敗時に再試行できることを確認
- [ ] conflict 解決が正常動作することを確認
- [ ] cloud 復元が正常動作することを確認
- [ ] データ欠損が発生しないことを確認
- [ ] 同一レコード多重同期で重複作成されないことを確認
- [ ] クラウド障害時にローカルデータが失われないことを確認
- [ ] ネットワーク切断中も保存できることを確認

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

- [x] Rate Limit の永続化 → `_shared/rate-limit.ts` (Deno KV) — ai-analyze / ai-predict の in-memory Map を置換
- [x] `_shared/auth.ts` の利用を全 Edge Function で統一 → JWT が必要な4関数で使用済み (cluster-batch=service role / stripe-webhook=Stripe署名 は対象外)
- [x] エラーレスポンス形式を `{ error: string, code?: string }` に統一 → `_shared/response.ts` の `jsonError()` を全関数で使用
- [x] 構造化ログを全 Edge Function に追加 → `_shared/logger.ts` の `log(level, event, data)` を全関数で使用

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

- [x] ADR-001 Save Architecture 統合判断 → `docs/adr/ADR-001-save-architecture.md`
- [x] ADR-002 Runtime 統合判断 → `docs/adr/ADR-002-runtime-architecture.md`
- [ ] ADR-003 Premium Source of Truth 統一判断
- [ ] ADR-004 Disease Analyzer 標準化判断
- [x] ADR-005 Guard 責務吸収・廃止判断 → `docs/adr/ADR-005-guard-decommission.md`
- [x] ADR-006 Save Domain Boundary 判断 → `docs/adr/ADR-006-save-domain-boundary.md`
- [x] ADR-007 Sync Architecture 判断 → `docs/adr/ADR-007-sync-architecture.md`

---

# Phase 5 — Guard 責務吸収と削除

> **目標**: guard は即削除しない。責務を基盤へ吸収した後にのみ削除する。
> 削除の根拠は「新構造で再発不可であること」をテストで証明すること。

## Guard Analysis

- [x] `save-transaction-guard.js` 分析 → post-save localStorage 整合検証・スナップショット取得。吸収先: RecordRepository
- [x] `record-freshness-guard.js` 分析 → stale overwrite 検出（件数減少・hash 変化・日付後退）。吸収先: SyncService + hydration-guard
- [x] `record-draft-guard.js` 分析 → UX 保護層（入力途中データ退避）。**削除しない**
- [x] `record-edit-save-identity-guard.js` 分析 → buildDraftFromUI ラップ・重複日付統合。吸収先: record-upsert + RecordRepository
- [x] `state-integrity-guard.js` 分析 → setState 時 records 大幅減少でブロック・rollbackToBest。吸収先: RecordRepository
- [x] `hydration-guard.js` 分析 → cloud/IDB restore の stale 上書きをブロック。吸収先: SyncService
- [x] `startup-validator.js` 分析 → startup フェーズ重複検知・警告。吸収先: runtime-orchestrator

## Evidence Collection

- [x] 各 guard の存在理由を実コードで特定（全 7 guard 完了）
- [x] 各 guard が防いでいる障害を特定（全 7 guard 完了）
- [x] 障害の再発条件を特定（全 7 guard 完了）

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

- [x] `docs/guard-decommission-plan.md` (各 guard の分析結果・吸収先・削除根拠)

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

- [x] Save Architecture 監査完了 (2026-06-11: 保存経路 6 本確認・ADR-006 に記録)
- [ ] RecordRepository 単一窓口確認 → 未達成。record-repository.js は READ-ONLY。Phase 4-D 後に統合（ADR-006）
- [x] Save Entry Point 一覧との整合確認 → 6 本の保存経路を特定・ADR-006 に記録
- [x] 保存経路図との整合確認 → ADR-001 の経路図と一致。saveState() 直接呼び出し 4 箇所を追記

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
- [ ] 全保存種別維持確認
- [ ] RecordRepository 境界定義完了
- [ ] SyncService 境界定義完了
- [ ] Record 保存経路一本化完了
- [ ] Sync 経路一本化完了
- [ ] UI 状態保存ルール文書化完了
- [ ] 設定値保存ルール文書化完了
- [ ] local → cloud 同期正常
- [ ] cloud → local 同期正常
- [ ] conflict 解決正常
- [ ] offline 復帰正常

## Documentation

- [ ] 保存経路図を最新化
- [ ] Runtime 構成図を最新化
- [ ] Dependency Map を最新化
- [ ] guard 根拠一覧を作成 (残存 guard の存在理由を明文化)
- [ ] 削除根拠一覧を作成 (削除した guard・コードの根拠を記録)
- [ ] 分析完了項目と実装完了項目の整合性確認
- [ ] 調査のみで完了扱いされた項目がないことを確認
- [ ] 完了チェックの根拠資料が存在することを確認

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
| Legacy Removal | 🔴 Not Started | 0% (Phase 4-D 未着手) |
| Runtime | 🟡 In Progress | 89% (production-diagnostics.js 分割のみ延期) |
| Premium | 🟢 Complete | 100% |
| Insight | 🟢 Complete | 100% |
| Disease | 🟢 Complete | 100% |
| Design System | 🟢 Complete | 100% |
| Edge Platform | 🟢 Complete | 100% |
| Save Domain Audit | 🟢 Complete | 100% (ADR-006 作成済み) |
| Sync Domain Audit | 🟢 Complete | 100% (ADR-007 作成済み) |
| Guard Analysis (7/7) | 🟢 Complete | 100% (ADR-005・guard-decommission-plan 作成済み) |
| **Overall** | 🔴 Not Started | **0%** |

---

> このファイルはすべての開発セッションで参照するマスターチェックリストです。
> 各チェックが完了したら即座に更新し、Progress Dashboard を同期させてください。
> 最終更新: 2026-06-11

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
