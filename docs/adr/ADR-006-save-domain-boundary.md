# ADR-006 — Save Domain Boundary 判断

**日付**: 2026-06-11  
**ステータス**: Accepted  
**根拠**: 実コード監査 (2026-06-11) による

---

## 背景

Save Architecture 統合の前提として「RecordRepository を唯一の保存窓口にする」という目標が
ADR-001 に記録されている。Phase 4-C 完了後の実コードを監査し、
現時点での保存経路の分散状況と統合の判断根拠を記録する。

---

## 現状の保存経路（監査結果）

### 保存経路 — 6 本が独立して存在

| # | 呼び出し元 | 保存関数 | トリガー |
|---|---|---|---|
| 1 | `record/save.js:persistRecordState()` | `window.saveState()` | 通常保存（主経路） |
| 2 | `record-three-card-save.js:_rtcPipelineSave()` | `persistRecordState()` 経由 | 三カード保存 |
| 3 | `record-edit-save-identity-guard.js:repairDuplicateDatesAfterSave()` | `saveState()` 直接 | 編集後重複修復 |
| 4 | `record-freshness-guard.js:persistFreshnessRepair()` | `saveState()` 直接 | 鮮度修復 |
| 5 | `recovery.js:autoRecoveryCheck()` | `setState()` + `saveState()` 直接 | 起動時自動復旧 |
| 6 | `rollback-manager.js:rollbackTo()` | `window.saveState()` 直接 | ロールバック復旧 |

### RecordRepository の現状

`src/modules/record-repository.js` は **READ-ONLY** である。

- `getRecords()` / `findRecordByDate()` / `getRecordStorageDiagnostics()` などを提供
- **write API（state への書き込み窓口）は存在しない**
- IndexedDB write (`idbPutRecord`) は export されているが、主保存経路の外で使われる

「RecordRepository が唯一の保存窓口」という目標は **未達成** である。

---

## 問題の実態

### 問題1: saveState() の直接呼び出しが散在

`saveState()` は `store/state.js` が管理するが、
4 箇所のファイルが import または window 経由で直接呼び出している。
これにより以下が発生しうる:

- save pipeline (save-transaction-guard による post-save 検証) を迂回した書き込みが存在する
- 診断 context（timeline / action tracking）が記録されない保存経路がある

### 問題2: RecordRepository に write 経路が存在しない

現在の責務分担:
- `record-repository.js`: read（state.records / localStorage / IDB 読み取り）
- `state.js:saveState()`: write（localStorage へのシリアライズ）
- `record-upsert.js`: merge ロジック（immutable / mutable API）

RecordRepository に write facade を追加するには、
`saveState()` を内包するか、それを呼び出す書き込み API を設計する必要がある。
この変更は save pipeline 全体に影響するため、段階的移行が必要。

### 問題3: guard による直接書き込みは意図的な設計

`record-freshness-guard.js` と `record-edit-save-identity-guard.js` が
`saveState()` を直接呼ぶのは、guard の「保護的修復」という性質によるもの。
guard が RecordRepository を経由するようにするには、
先に RecordRepository が write API を持つ必要がある。

---

## 採用した判断

### 判断: RecordRepository への write facade 追加は Phase 4-D 後に延期

**理由**:

1. `app-legacy.js` が未削除の現在、`window.saveState` を上書き・置換すると
   legacy 側の保存経路が破損するリスクが高い

2. `save-transaction-guard.js` / `state-integrity-guard.js` が
   `saveState()` のフックシステムを前提に動作しており、
   RecordRepository を挟んでも同フックが維持されることを保証する必要がある

3. テストが存在しない状態で 6 本の保存経路を一括リファクタリングするのは
   「テストで保証できない変更は実施しない」原則に反する

### 段階的移行計画

```
Step 1 (Phase 4-D): app-legacy.js 削除 → window.saveState 依存を正規 import に置換
Step 2 (Phase 5):   各 guard の saveState() 直接呼び出しを
                    RecordRepository.save() / SyncService.sync() に切り替え
Step 3 (Post-5):    RecordRepository を write facade として完成させ、
                    state.js:saveState() を直接呼ぶ経路をゼロにする
```

---

## Save Domain Boundary 定義（現行・確定版）

| 領域 | 現在の実装 | 目標実装 |
|---|---|---|
| record 保存 | `saveState()` を複数箇所から直接呼び出し | `RecordRepository.save()` のみ |
| IDB 書き込み | `idbPutRecord()` を各ファイルが直接呼ぶ | `RecordRepository` 内に統合 |
| cloud 同期 | `cloudBackupAll()` / `syncRecordImmediately()` を複数箇所から直接呼ぶ | `SyncService` のみ（ADR-007） |
| draft 保存 | `localStorage['ippo_record_draft']` を `record-draft-guard.js` が管理 | 現行維持（UX 層として独立） |
| rollback | `rollback-manager.js` が `window.saveState()` を直接呼ぶ | `RecordRepository.save()` 経由へ（Phase 5） |

---

## 却下した案

### 「今すぐ RecordRepository を write facade にする」

- app-legacy.js が未削除の現在は window.saveState を抽象化する前提が整っていない
- save-transaction-guard / state-integrity-guard の動作保証ができない
- テスト不在のため実施しない

### 「saveState() の直接呼び出しを全部削除する」

- guard による direct saveState() は意図的な設計（pipeline 迂回が必要なケース）
- 削除前に「guard 責務の吸収先」を決定する必要があり、Phase 5 が前提

---

## 関連 ADR

- ADR-001: Save Architecture 統合判断（保存種別定義・ライフサイクル）
- ADR-007: Sync Architecture 判断（同期経路の統一）
- ADR-005: Guard 責務吸収・廃止判断（未作成）
