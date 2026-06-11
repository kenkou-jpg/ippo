# ADR-007 — Sync Architecture 判断

**日付**: 2026-06-11  
**ステータス**: Accepted  
**根拠**: 実コード監査 (2026-06-11) による

---

## 背景

保存と同期は別責務として監査する（ARCHITECTURE_COMPLETION_CHECKLIST.md 方針）。
Phase 4 完了後の実コードを監査し、同期経路の現状と統合の判断根拠を記録する。

---

## 現状の同期経路（監査結果）

### 同期経路 — 5 本が独立して存在

| # | 呼び出し元 | 同期関数 | トリガー |
|---|---|---|---|
| 1 | `record/save.js:syncRecordCloud()` | `window.cloudBackupAll()` | 通常保存後（主経路） |
| 2 | `record-three-card-save.js:_rtcPipelineSave()` | `syncRecordImmediately()` + `cloudBackupAll()`（500ms delay） | 三カード保存後 |
| 3 | `record-edit-save-identity-guard.js:repairDuplicateDatesAfterSave()` | `cloudBackupAll()` 直接 | 重複修復後 |
| 4 | `supabase.js` (visibilitychange listener) | `cloudRestore()` | タブ復帰時 |
| 5 | `recovery.js:autoRecoveryCheck()` | `window.manualCloudRestore()` | 起動時大幅件数減少検知 |

### SyncService の現状

`src/services/supabase.js` が事実上の SyncService として機能している。

提供する関数:
- `cloudBackupAll()` — 全 state を Supabase upsert（主バックアップ）
- `syncRecordImmediately(record)` — record 単体を `user_records` テーブルへ即時 upsert
- `retrySyncPending()` — `syncPending=true` のレコードを再同期
- `cloudRestore()` — Supabase から取得してローカルとマージ
- `initialCloudSync()` — 初回同期

**SyncService は既に存在するが、直接呼び出しを経由しない経路が 3 本ある。**

---

## 問題の実態

### 問題1: cloudBackupAll() の直接呼び出しが散在

`cloudBackupAll` は `record-edit-save-identity-guard.js` が直接 import して呼び出している。
これはガードの修復後に cloud を最新化するための意図的な実装だが、
SyncService のロック機構 (`_cloudBackupLock`) は経由するため、
競合は回避されている。ただし診断 context には記録されない。

### 問題2: mergeRecords() が 2 箇所に重複実装

```
supabase.js:cloudRestore()  — cloud records と local records のマージロジック
recovery.js:mergeRecords()  — IDB / localStorage 復旧時のマージロジック
```

両者は類似しているが独立実装:

- `supabase.js`: `myDiseases` / `experiments` の有効値優先、`currentScreen` 除外の特殊処理あり
- `recovery.js`: `deleted_at` フラグによる削除済み除外、`id` キーでの集約

統一する場合は両方の条件を満たす merge 関数が必要。

### 問題3: syncRecordImmediately() は三カード経路のみ

`record-three-card-save.js` だけが `syncRecordImmediately()` を呼び出す。
通常保存経路（`record/save.js`）は `cloudBackupAll()` のみ（全 state backup）。
このため通常保存後の同期粒度が三カードより粗い（全 state vs 個別 record）。

---

## 採用した判断

### 判断1: SyncService (supabase.js) は唯一の同期窓口として維持

- `cloudBackupAll()` / `cloudRestore()` / `syncRecordImmediately()` / `retrySyncPending()` の 4 関数が
  同期の全パターンをカバーしている
- 新規ファイルを作成して SyncService を再設計するより、
  現在の `supabase.js` を Single Source として固める方が変更コストが低い
- `_cloudBackupLock` による並行実行防止は維持する

### 判断2: mergeRecords() の統合は Phase 4-D 後に実施

- `supabase.js` の merge ロジックと `recovery.js` の merge ロジックは
  呼び出しコンテキストが異なる（cloud restore vs local recovery）
- 現時点で統合してもテストで保証できないため延期
- 統合時は `record-upsert.js:mergeRecordPreservingExisting()` を merge の中核として活用する

### 判断3: 三カード fallback (window.cloudBackupAll 直接呼び出し) の削除は Phase 4-D 後

ADR-001 の記録通り、三カード fallback（`rtcSaveDelegate` 未注入時の直接呼び出し）は
`record-three-card-save.js` の import 削除により切り替わる設計になっている。
Phase 4-D で app-legacy.js 削除と同時に整理する。

---

## SyncService 境界定義（現行・確定版）

| 操作 | 関数 | 呼び出し経路 | 現状 |
|---|---|---|---|
| 全 state → cloud | `cloudBackupAll()` | save pipeline + guard 直接 | 複数経路あり（整理対象） |
| record 単体 → cloud | `syncRecordImmediately(record)` | record-three-card-save.js のみ | 三カード専用 |
| cloud → local（マージ） | `cloudRestore()` | visibilitychange + autoRecovery | 2 経路 |
| 保留 record 再同期 | `retrySyncPending()` | 起動時 | 単一経路（問題なし） |

---

## Sync Validation 前提条件（統合後に確認すること）

- [ ] オフライン保存後に同期できることを確認（`syncPending` → `retrySyncPending()`）
- [ ] 同期失敗時に再試行できることを確認
- [ ] conflict 解決が正常動作することを確認（last-write-wins + empty guard）
- [ ] cloud 復元が正常動作することを確認
- [ ] データ欠損が発生しないことを確認
- [ ] 同一レコード多重同期で重複作成されないことを確認（`_cloudBackupLock` で保護）
- [ ] クラウド障害時にローカルデータが失われないことを確認
- [ ] ネットワーク切断中も保存できることを確認

---

## 却下した案

### 「SyncService を新規ファイルとして再設計する」

- supabase.js は既に SyncService として十分機能している
- 新規ファイルへの移行はリスクが高く、ROI が低い

### 「mergeRecords() を今すぐ統合する」

- テストなし・動作保証できない
- 呼び出しコンテキストの差異が大きく、単純統合できない

---

## 関連 ADR

- ADR-001: Save Architecture 統合判断（保存種別・同期タイミング）
- ADR-006: Save Domain Boundary 判断（保存経路・RecordRepository）
- ADR-005: Guard 責務吸収・廃止判断（未作成）
