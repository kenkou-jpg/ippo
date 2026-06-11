# ADR-001 — Save Architecture 統合判断

**日付**: 2026-06-11  
**ステータス**: 採用（段階的移行）  
**作成者**: 実コード監査に基づく (2026-06-11)

---

## 背景

Save Architecture フェーズの目標は「保存経路を RecordRepository に一本化する」ことだが、
変更前に全保存種別の責務・保存先・ライフサイクルを実コードで特定する必要がある。
本 ADR はその監査結果と統合判断を記録する。

---

## 保存種別一覧

### 1. 通常保存 (Normal Save)

**責務**: ユーザーが意図的に記録を完了させたときのフル保存  
**エントリ**: `record.js` → `window.saveRecord` → `record/save.js` パイプライン  
**保存先**:
- `localStorage['ippo_state']` — `saveState()` 経由
- `IndexedDB['ippo_db']['records']` — `idbPutRecord()` 経由  
- `Supabase user_records` — `cloudBackupAll()` 経由（非同期）

**ライフサイクル**:
1. `prepareRecordUpsert()` — upsert マージ判定
2. `persistRecordState()` — localStorage + IDB 書き込み
3. `syncRecordCloud()` — Supabase 非同期同期
4. `notifyRecordUpdated()` — UI 更新イベント発火
5. `verifyRecordSaveContext()` — 整合性検証・警告記録

**ガード**: `save-transaction-guard.js`, `state-integrity-guard.js`  
**オブザーバビリティ**: `recordTimelineEvent()`, `runRecordSaveAction()`

---

### 2. 三カード保存 (Three-Card Daily Check-in)

**責務**: 日次チェックインの3ステップカード完了時の保存  
**エントリ**: `record-three-card.js` → `_integrateWithExistingSave(payload)`  
**保存先**: 通常保存と同じ（委譲経由）

**ライフサイクル**:
1. **Primary**: `window.rtcSaveDelegate(payload)` — `record.js` が注入した委譲関数を呼ぶ（通常保存パイプラインへ）
2. **Fallback**: `window.getState()` → records 直接変更 → `window.saveState()` → `window.cloudBackupAll()` — delegate が未注入の場合のみ

**注意**: Fallback は guards/observability を経由しない直接保存。`rtcSaveDelegate` が常に先行して注入されることを保証できれば削除可能。

---

### 3. 下書き保存 (Draft Save)

**責務**: 入力途中のデータをページ離脱前に退避（データ欠損防止）  
**エントリ**: `record-draft-guard.js` — `visibilitychange` / `pagehide` / `beforeunload`  
**保存先**: `localStorage['ippo_record_draft']`  
**ライフサイクル**: 入力中マーク → ページ離脱 → draft 収集・保存 → 次回起動時に復元プロンプト  
**Legacy 保存先**: `localStorage['ippo_draft']`, `localStorage['ippo_meal_draft']` (app-legacy.js)  
**注意**: 通常保存パイプラインとは完全に独立した経路。RecordRepository とは別責務。

---

### 4. 自動保存 (Auto-Save)

**責務**: ページ離脱前の自動退避（下書き保存と実装は同一）  
**実装**: `record-draft-guard.js` の `_dirtyFlag` に基づくイベント駆動  
**保存先**: `localStorage['ippo_record_draft']`  
**ライフサイクル**: `markRecordDirty()` → 入力中 → 離脱イベント → `_gatherDraft()` → draft 書き込み  
**注意**: タイマーベースの自動保存は存在しない。

---

### 5. バックアップ保存 (Snapshot / Rollback)

**責務**: 危険な操作前に復元ポイントを作成する  
**エントリ**: `rollback-manager.js` → `takeSnapshot(label)`  
**保存先**: メモリ内スナップショット配列（max 5件、localStorage 非永続）  
**ライフサイクル**: `hydration-guard.js` から `pre-hydration:source` 時に自動呼び出し  
**注意**: ページリロードでスナップショットは消える。永続化されない。

---

### 6. 復元保存 (Recovery / Restore)

**責務**: ロールバック・クラウド復元によるデータ復元  
**エントリ**:
- `rollback-manager.js` — `rollbackTo(snapshot)` / `rollbackToBest()`
- `hydration-guard.js` — `checkHydration(incomingData, source)` で stale を拒否
- Supabase cloud restore — `pullRecordsFromCloud()` 経由

**保存先**: 復元先は `state.js` の `setState()` + `saveState()`  
**ライフサイクル**: 障害検知 → snapshot 選択 → `setState()` → `saveState()`

---

### 7. クラウド同期 (Cloud Sync)

**責務**: ローカル保存完了後に Supabase へ非同期バックアップ  
**エントリ**: `record/save.js` → `syncRecordCloud()` → `cloudBackupAll()`  
**保存先**: `Supabase user_records テーブル`  
**ライフサイクル**: ローカル保存完了 → 500ms delay → `cloudBackupAll()` → Supabase upsert  
**重複リスク**: `record-three-card.js` の fallback も `cloudBackupAll()` を直接呼ぶ（重複経路あり）

---

## 保存責務境界

| カテゴリ | 対象 | 保存先 | RecordRepository 管轄か |
|----------|------|--------|------------------------|
| Record データ | `state.records` 配列 | localStorage / IDB / Supabase | **対象** |
| UI 状態 | `currentScreen`, `fastingActive` 等 | `localStorage['ippo_state']` に混在 | 例外（saveState 経由） |
| 設定値 | `reminderTime`, `cycleLength`, `myDiseases` 等 | `localStorage['ippo_state']` に混在 | 例外（saveState 経由） |
| 下書き | 入力途中テキスト | `localStorage['ippo_record_draft']` | 対象外（独立責務） |
| スナップショット | メモリ内復元ポイント | メモリのみ | 対象外（rollback-manager） |
| クラウド同期 | Supabase バックアップ | Supabase | 将来: SyncService |

---

## Save Consolidation Gate 評価

### 全保存種別の責務定義
✅ 完了（本 ADR に記録）

### 全保存種別の保存先特定
✅ 完了（本 ADR に記録）

### 全保存種別のライフサイクル記録
✅ 完了（本 ADR に記録）

### 保存機能消失リスク評価

**リスク: 高**

- `saveState()` は state.js に実装されており、localStorage への唯一の書き込み口。
- `idbPutRecord()` は record-repository.js にある IDB 書き込み口。
- これら2つを RecordRepository に統合するには、`state.js` の saveState フックシステム（pre/post save hooks）を複製または再配線する必要がある。
- `save-transaction-guard.js` および `state-integrity-guard.js` は `addPreSaveHook()` 経由で `saveState` に接続しているため、統合時に切れる可能性がある。
- `record-three-card.js` の fallback 経路（直接 `window.saveState`）は `rtcSaveDelegate` が未注入の場合に発動する。削除前に bootstrap 順序を保証する必要がある。

**統合の前提条件 (未完了)**:
- [ ] `save-transaction-guard.js` が RecordRepository 経由でも機能することを確認
- [ ] `state-integrity-guard.js` が RecordRepository 経由でも機能することを確認
- [ ] `addPreSaveHook` / `addPostSaveHook` の接続先を RecordRepository に移行するテストを書く
- [ ] `rtcSaveDelegate` が三カードを開く前に常に注入される bootstrap 保証を実装・テスト

### 統合 ROI 評価

**メリット**:
- 保存経路が 1 本になりデバッグ容易になる
- guards が確実に全保存経路をカバーする

**コスト**:
- `saveState()` フックシステムの再配線（高リスク）
- 三カード fallback の除去（bootstrap 順序の保証が必要）
- エンドツーエンド統合テストが現時点で不足

**判断: 段階的移行**

1. **今すぐ実施**: 保存種別の文書化（本 ADR）
2. **次フェーズ**: `save-transaction-guard` / `state-integrity-guard` の RecordRepository 互換テスト追加
3. **その後**: RecordRepository に書き込み API を追加、段階的に切り替え
4. **最終**: `window.saveState` 直接依存の除去

---

## 決定事項サマリー

| 項目 | 判断 |
|------|------|
| 保存種別一覧の文書化 | ✅ 完了 (本ADR) |
| RecordRepository 即時統合 | ⏸ 段階的移行 (ガード互換テスト先行) |
| 三カード fallback 即時削除 | ⏸ 延期 (bootstrap 保証が必要) |
| 下書き保存の統合 | ❌ 却下 (独立責務, 統合不要) |
| クラウド同期の統合 | ⏸ 延期 (SyncService 設計が必要) |
| Sync 重複経路の削除 | ⏸ 延期 (三カード fallback 経路の削除と連動) |
