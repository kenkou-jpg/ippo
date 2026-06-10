# Architecture Review Gate

> **フェーズ**: Phase 3 完了後 → Phase 4 開始前の統合価値評価
> **作成日**: 2026-06-10
> **方針**: 実コードのみを根拠とする。推測禁止。統合しないという選択肢も評価する。

---

## 1. ROI Evaluation

### 1-A. app-legacy.js 削除の価値証明

**対象**: `src/app-legacy.js` 12,296行

**実コード根拠による重複確認**:

| legacy 関数群 | 移行先（実装済み） | 重複の証拠 |
|---|---|---|
| `openIDB` / `idbPutRecord` / `idbGetAllRecords` / `idbDeleteRecord` | `modules/record-repository.js` | dependency-map.md § Storage Layer |
| `supabaseHeaders` / `supabaseAuth` | `services/supabase.js` | dependency-map.md § Services Layer |
| `syncRecordToCloud` / `pullRecordsFromCloud` / `cloudBackupAll` | `services/supabase.js` | save-architecture.md § 5-A/5-B |
| `showToast` | `modules/ui-notifications.js` | architecture-inventory.md § Module Layer |
| `calcCycleDay` / `getCyclePhase` | `analytics/cycle-engine.js` | dependency-map.md § Analytics Layer |

**削除後の保守コスト削減**:
- 現状: バグ修正のたびに legacy と新実装の両方を確認・同期する必要がある
- 削除後: 単一実装への変更のみ
- 12,296行 のうち推定 ~9,000行（重複済み + 移行対象）が削除対象
- ファイル読み込みコスト削減: 毎回ブラウザが parse する JS 量が大幅減少

**判定**: 削除価値あり。重複実装の存在を実コードで証明済み。

---

### 1-B. Runtime 統合の価値証明

**対象**: 16ファイルのうち重複責務のある箇所

**実コード根拠**:

save-architecture.md § 4 より、`save-transaction-guard.js` / `state-integrity-guard.js` / `rollback-manager.js` は以下の問題を持つ:

1. **bypass フラグによるフック回避の一貫性欠如**:
   - `rollback-manager.js` が `setState` を呼ぶ際 `window._ippoRollbackBypass = true` でフックをスキップ
   - しかし hook 側がこのフラグを正式にサポートする仕組みがない（アドホック）

2. **startup-render-gate.js と hydration-guard.js の責務重複**:
   - 両者とも「起動完了前の描画ブロック」を担当
   - dependency-map.md より両者が `store/state.js` + `rollback-manager` に依存する構造は同一

3. **runtime-orchestrator.js の薄いパススルー問題**:
   - `runtime-brain.js` → `runtime-orchestrator.js` → `runtime-controller.js` の3層が各1ファイルで
     ほぼ委譲のみ行っており、追跡コストが高い

**統合しない場合のリスク**:
- bypass フラグのアドホック管理が継続し、将来のフック追加時に漏れが発生するリスクあり
- startup 系ファイルの責務境界が不明瞭なまま拡張されるリスクあり

**判定**: Runtime 統合は部分的に価値あり。orchestrator の薄型化と startup 系の統合は実施する。全統合は過剰。

---

### 1-C. Save 統合の価値証明

**対象**: 保存経路 2本（3カード経路 vs legacy 経路）

**実コード根拠** (save-architecture.md § 2, § 7):

| 問題 | 所在 | リスク |
|---|---|---|
| `state.records` 直接代入 | record-three-card-save.js:36, recovery.js:33 | setState preHook をバイパスするため整合性チェックが無効化される |
| 保存経路が2本 | record-three-card-save.js vs app-legacy.js | upsert ロジックが分散し、片方のバグが検知されにくい |
| syncRecordImmediately と cloudBackupAll の競合 | record-three-card-save.js:79,86 | 500ms 以内に同一レコードを2回 Supabase へ書く可能性 |
| legacy cloudBackupAll が全 state を上書き | supabase.js | バージョン競合・部分失敗のリスク |

**統合の価値**:
- `RecordRepository` を唯一の保存窓口とすることで `setState preHook` バイパスを撲滅できる
- 経路統一により Supabase 書き込みの競合が解消される
- 将来の保存バグのデバッグコストが大幅に低下する

**統合しない場合の維持コスト**:
- 両経路の同期を維持する人的コストが継続
- 新機能追加のたびに「どの経路を使うか」という判断が必要

**判定**: 統合価値高い。`RecordRepository` への一本化を実施する。

---

### 1-D. Premium 統合の価値証明

**対象**: Premium 状態管理の Source of Truth 分散

**実コード根拠** (architecture-inventory.md § Domain Inventory - Premium):

現在の Premium 判定経路（複数の Source of Truth）:
1. `profiles.is_premium` カラム（Supabase）
2. `window.isPremium` グローバル（インメモリ）
3. `localStorage` キャッシュ（`premium-service.js`）
4. `stripe.js` の `setInterval` ポーリング（2500ms × 12回）

**バグリスクの証明**:
- 4箇所が独立して Premium 状態を保持するため、更新タイミングのズレによって UI が矛盾する可能性がある
- `stripe.js` のポーリング中はユーザーが Premium になっていても最大30秒間 non-premium として表示される
- `profiles.is_premium` への書き込みに失敗してもサイレントに成功扱いになるバグが存在（stripe-webhook 内の `.eq('email', email)` 確認方法の問題）

**統合の価値**:
- `subscriptions` テーブルを唯一の Source of Truth にすることで 4箇所の不整合を解消
- Supabase Realtime による即時反映でポーリング廃止
- サイレント失敗バグを修正することで課金ユーザーが Premium にならないケースを防止

**判定**: 統合価値最高。課金バグが存在するため早期に実施すべき。

---

### 1-E. Disease Analyzer 標準化の価値証明

**対象**: 11疾患の Analyzer のインターフェース不一致

**実コード根拠** (architecture-inventory.md § Disease Layer):

`BaseAnalyzer.analyze()` の共通出力に `severity` / `riskLevel` / `recommendation` が欠落しており、
各 Analyzer が独自フィールドを返している。

**具体的な不一致（実コード確認分）**:
- `EndometriosisAnalyzer`: `cyclePainCorrelation` / `nonMenstrualFlareProfile` を独自追加（他の Analyzer にない）
- `PCOSAnalyzer`: `weightCorrelation` の実装が不完全
- 上位層（`home-insight-engine.js`、`analysis-module.js`）がフィールドの存在チェックを各所に持つ

**問題の影響**:
- `disease-registry.js` が全 Analyzer を統合する際にフィールド存在チェックが必要
- Pro 分析画面 (`analysis-module.js`) で Analyzer 毎の条件分岐が発生
- 新疾患追加時にどのフィールドが必須かが不明確

**判定**: 標準化価値あり。ただし優先度は Premium 統合より低い。

---

## 2. Decision Review

### 2-A. 「統合しない」案の評価

| 対象 | 統合しない場合の状態 | 統合しない判断が成立するか |
|---|---|---|
| app-legacy.js | 12,296行の重複が永続化。保守対象が2倍になる | 成立しない（重複コストが大きすぎる） |
| Runtime 全統合 | 現状維持。bypass フラグの管理が継続 | 部分的に成立（全統合より絞った統合が適切） |
| Save 経路統一 | `setState preHook` バイパスが永続化。デバッグ困難 | 成立しない（整合性リスクが実在する） |
| Premium 統合 | サイレント失敗バグが継続。課金ユーザーへの影響あり | 成立しない（既知バグが存在する） |
| Disease 標準化 | 条件分岐が継続。新疾患追加コストが高いまま | 暫定的に成立（ただし拡張の都度コストが増加） |

---

### 2-B. 維持コスト vs 統合コストの評価

| 対象 | 維持コスト（年間推定） | 統合コスト（1回） | 判断 |
|---|---|---|---|
| app-legacy.js | バグ修正の都度 legacy + 新実装の両確認（×2倍） | Phase 4-A~D で段階的削除 | **統合実施** |
| Runtime | startup 系の責務境界調査（低頻度） | 薄いファイルを統合する程度 | **部分統合** |
| Save 経路 | 経路分岐のデバッグ（バグ発生時に高コスト） | RecordRepository への一本化 | **統合実施** |
| Premium | 課金バグ対応（顧客影響） | subscriptions テーブル + Realtime 実装 | **統合実施（優先）** |
| Disease | 条件分岐追加（新疾患追加時） | BaseAnalyzer 拡張 + 11 Analyzer 修正 | **統合実施（後回し可）** |

---

### 2-C. ROI 記録

| 改修 | 価値 | コスト | ROI |
|---|---|---|---|
| app-legacy.js 削除 | 保守対象 -50%・バンドルサイズ削減 | 高（段階的移行が必要） | 高 |
| Save 経路統一 | 整合性バグ根絶・デバッグコスト削減 | 中（RecordRepository 拡充） | 高 |
| Premium 統合 | 課金バグ修正・顧客影響解消 | 中（migration + Realtime） | 最高 |
| Runtime 部分統合 | orchestrator 削除・startup 統合 | 低 | 中 |
| Disease 標準化 | 新疾患追加コスト削減 | 中（11 Analyzer 修正） | 中（優先度低） |

---

## 3. Phase 4 進行判断

### 承認された統合

- ✅ **Phase 4-A**: legacy 内 重複済み関数の削除（~3,000行）
- ✅ **Phase 4-B**: Runtime / Service 移行（~2,000行）
- ✅ **Phase 4-C**: Module 新設・移植（~4,000行）
- ✅ **Phase 4-D**: app-legacy.js 最終廃止
- ✅ **Save 統合**: RecordRepository を唯一の保存窓口とする
- ✅ **Premium 統合**: subscriptions テーブルへの一本化（最優先）

### 却下・保留した案

- ❌ **Runtime 全統合**: runtime-brain / orchestrator / controller の完全統合は過剰。責務が異なる可能性がある。部分統合（orchestrator 薄型化 + startup 統合）のみ実施。
- ⏸ **Disease 標準化**: 機能的問題ではなく拡張性の問題。Phase 4 の他作業完了後に実施。

### 前提条件

- **Test Coverage Gate を Phase 4 開始前に満たすこと**
- **guard の削除は Phase 5 の Guard Removal Gate を通過後のみ承認**
- **各統合は ADR に記録すること**

---

## 4. 成果物チェック

- [x] ROI 評価完了（各統合の価値を実コードで証明）
- [x] 「統合しない」案を評価した記録
- [x] 維持コストの評価
- [x] 統合コストの評価
- [x] ROI の記録（各改修の価値 vs コスト）

---

> 次のステップ: Architecture Review Gate PR を作成し、Phase 4 の開始承認を得ること。
> 最終更新: 2026-06-10
