# Save Architecture

> Phase 3 成果物。実コードを根拠とした保存パイプライン全体の文章説明。
> 作成日: 2026-06-10

---

## 1. 保存入口 (Save Entry Points)

ippo の保存フローを起動する UI トリガーは 2 系統ある。

### 1-A. 3カード記録フロー (`record-three-card.js`)

`window.openRecordScreen` → `openThreeCardRecord()` で `screen-record-three-card` 画面を表示。
Card 3 の「保存する」ボタン押下 → `rtcGoNext()` → `_goNext()` → `_saveRecord()`。

`_saveRecord()` は `_buildPayload()` でレコード構造を組み立て、`_integrateWithExistingSave(payload)` を呼ぶ。
`window.rtcSaveDelegate` が登録済みであれば委譲し、なければフォールバック（直接 state 変更 + `saveState()`）。

`window.rtcSaveDelegate` は `record-three-card-save.js` の `installRtcSaveDelegate()` が登録する。

### 1-B. 従来の記録画面 (`app-legacy.js` → `saveRecordScreen`)

`record.js` が `window.saveRecordScreen` をラップして traceContext を付与する。
呼び出し元は `app.html` のインライン onclick / `app-legacy.js` の `saveRecord()`。

---

## 2. 保存パイプライン (Save Pipeline)

### 経路 A: 3カード記録（`record-three-card-save.js` 経由）

```
_rtcPipelineSave(payload)
  │
  ├─ 1. upsertRecord(state.records, payload)          ← record-upsert.js
  │       mergeRecordPreservingExisting() で既存 record に新データをマージ
  │       (直接 s.records 変更 — setState preHook 干渉を避ける設計)
  │
  ├─ 2. persistRecordState({ context: ctx })          ← record/save.js
  │       window.saveState() を呼び出す
  │       → state.js#saveState()
  │           _preSaveHooks 実行（save-transaction-guard の _preSave）
  │           JSON.stringify → localStorage.setItem('ippo_state', …)
  │           _postSaveHooks 実行（save-transaction-guard の _postSave: 検証）
  │
  ├─ 3. notifyRecordUpdated({ context: ctx })         ← record/save.js
  │       buildCalendar / renderCalendar / renderHome / updateHome / updateStats
  │       各関数が window に存在すれば順次呼び出す
  │
  ├─ 4. finalizeRecordSaveContext(ctx)                ← record/save.js
  │       persist + notify の結果をコンテキストに集約、window.__IPPO_LAST_RECORD_SAVE_CONTEXT__ へ格納
  │
  ├─ 5. syncRecordImmediately(savedRecord)            ← services/supabase.js (即時)
  │       user_records テーブルへ record 単位で upsert
  │       失敗時: syncPending=true を立てて次回再試行
  │
  └─ 6. setTimeout(syncRecordCloud, 500ms)            ← record/save.js (非同期)
          cloudBackupAll() を呼び出す（全 state の Supabase バックアップ）
```

### 経路 B: 従来記録（`saveRecordScreen` 経由）

```
saveRecordScreen()  [app-legacy.js 内の実装]
  │
  ├─ buildDraftFromUI()      UI から record オブジェクトを構築
  ├─ state.records への追加/更新 (直接代入)
  ├─ saveState()             → 上記と同じ state.js#saveState()
  ├─ renderHome() / buildCalendar() 等
  └─ cloudBackupAll() / setTimeout(cloudBackupAll, 500ms)
```

`record.js` の `tracedSaveRecordScreen` ラッパーが上記の前後に context を作成・確定し、
`window.__IPPO_LAST_RECORD_SAVE_CONTEXT__` へ保存する。

---

## 3. Core: state.js#saveState()

保存の唯一の実体。

```
saveState()
  _preSaveHooks[]  →  save-transaction-guard: takeSnapshot('pre-save')
  localStorage.setItem('ippo_state', JSON.stringify(state))
  _postSaveHooks[] →  save-transaction-guard:
                        storedCount と expectedCount の比較
                        不一致なら logWarning('save-verify-count-mismatch')
```

`saveState` は `state.js` からエクスポートされ、`window.saveState` としても公開される。
両者は同一関数参照のため、どちら経由で呼ばれても hook が動作する。

---

## 4. Runtime Flow (Guard / Snapshot / Rollback)

### 4-A. save-transaction-guard.js

`addPreSaveHook` / `addPostSaveHook` 経由で `state.js#saveState()` にフックを登録する。
- **preSave**: `rollback-manager.takeSnapshot('pre-save')` でスナップショット取得
- **postSave**: localStorage の record 件数と snapshot 件数を比較し、減少なら `logWarning`

### 4-B. rollback-manager.js

リングバッファ (上限 8) でインメモリ state スナップショットを保持。
```
takeSnapshot(label)     state を deepClone して _snapshots へ push
getBestSnapshot()       件数が最多のスナップショットを返す
rollbackToBest()        getBestSnapshot() を setState + saveState で復元
```
ロールバック実行時は `window._ippoRollbackBypass = true` で setState のブロック hook をスキップ。

### 4-C. state-integrity-guard.js

`addSetStateHook` 経由で `setState()` の全呼び出しにフックを登録。
```
トリガー条件: dropped >= 3 かつ nextCount / currentCount < 0.5
  → rollbackToBest() でロールバック
  → markCloudSyncBlocked(true) で cloud sync をブロック
  → setState を return false でブロック
例外: window._ippoRollbackBypass === true（rollback-manager 自身の書き込み）
```

### 4-D. sync-consistency-checker.js

localStorage の record 件数 vs in-memory state の件数を定期チェック。
不一致時: `logWarning('sync-count-mismatch')`, `markCloudSyncBlocked(true)` で cloud sync をブロック。

---

## 5. Cloud Flow (Supabase 同期)

### 5-A. syncRecordImmediately (record 単位・即時)

`services/supabase.js` に実装。
- `user_records` テーブルへ record を単独 upsert
- 失敗時は `syncPending=true` を設定し次回起動時に再試行

### 5-B. cloudBackupAll (全 state バックアップ)

`services/supabase.js` に実装。`_cloudBackupLock` でバックアップ中の重複実行を防ぐ。

**Empty Records Guard (P0-FIX-9)**:
- ローカルが空 (`records=[]`) かつ `window.__ippoExplicitDataReset !== true` の場合
  - クラウドの record 件数を SELECT して確認
  - クラウドにデータがあれば **上書きをブロック**（誤同期防止）
  - クラウドも空なら新規ユーザーとして通過

**書き込み方式**: `user_data` テーブルへ UPDATE → 失敗なら INSERT フォールバック (`_doCloudUpdate`)

### 5-C. cloudRestore (cloud → local 復元)

起動時に `initialCloudSync()` が呼ぶ。
- `user_data` から state を取得
- 安全マージ (`mergeRecords`) で既存ローカルデータと結合
- `setState + saveState` で確定

### 5-D. autoRecoveryCheck (IDB 自動復元)

`services/recovery.js` に実装。起動時に呼ばれる。
```
lastCount = localStorage('ippo_last_record_count')
currentCount = state.records.length
差が 2 以上なら:
  idbGetAllRecords() → activeRecs
  activeRecs > currentCount なら mergeRecords → setState → saveState
  それ以外は manualCloudRestore() (timeout: 15s)
```

---

## 6. State Flow (hydration / restore)

### 6-A. 起動時 hydration

```
app-bootstrap.js
  migrateStorageKeys()   kk_records / records キーを ippo_state へ統合
  loadState()            localStorage('ippo_state') → setState(_state)
  autoRecoveryCheck()    記録件数減少チェック → 必要なら IDB / cloud 復元
  initialCloudSync()     cloudRestore() → 最新 cloud state を取得
```

### 6-B. saveState / addPreSaveHook / addPostSaveHook

`state.js` が hook registry を持ち、`addPreSaveHook` / `addPostSaveHook` でフックを登録できる。
現在の登録者: `save-transaction-guard.js` のみ。

### 6-C. rollback / recovery による復元

- **rollback-manager**: `rollbackToBest()` → `setState` + `saveState`
- **recovery.js**: `mergeRecords` + `setState` + `saveState`
- どちらも最終的に `saveState()` を通るため save-transaction-guard の post-hook が動作する

---

## 7. 問題点・Phase 4 統合判断用メモ

| 問題 | 所在 | 影響 |
|------|------|------|
| 保存経路が 2 本（3カード / legacy） | record-three-card-save.js vs app-legacy.js | どちらの経路も `saveState()` を呼ぶが upsert ロジックが分散 |
| `state.records` 直接代入 | record-three-card-save.js:36, recovery.js:33 | setState preHook をバイパスするため hook での整合性チェックが通らない |
| cloudBackupAll は全 state を `user_data` テーブルへ上書き | supabase.js | 大型データ・バージョン競合・部分失敗のリスク |
| syncRecordImmediately と cloudBackupAll が競合する可能性 | record-three-card-save.js:79,86 | 500ms 内に両方が Supabase へ書く |
| autoRecoveryCheck が IDB を直接参照 | recovery.js:22 | `window.idbGetAllRecords` が存在しない場合は空配列フォールバック |
| rollback の setState が preHook をバイパス | rollback-manager.js:64 | `_ippoRollbackBypass` フラグで回避しているが hook 側でも受け取る仕組みがない |

---

> 次のステップ: Phase 4-A で legacy 経路の重複を削除し、RecordRepository を唯一の保存窓口とする。
