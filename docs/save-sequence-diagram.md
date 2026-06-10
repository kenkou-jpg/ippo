# Save Sequence Diagram

> Phase 3 成果物。保存パイプラインのシーケンス図。
> 作成日: 2026-06-10
> 根拠: 実コード読み取り（推測なし）

---

## A. 3カード記録フロー（正式経路）

```
User              record-three-card.js   record-three-card-save.js   record/save.js     state.js           supabase.js
 |                        |                        |                      |                  |                  |
 |-- 保存ボタン tap ------>|                        |                      |                  |                  |
 |                _saveRecord()                     |                      |                  |                  |
 |                _buildPayload()                   |                      |                  |                  |
 |                        |-- rtcSaveDelegate(payload) ------------------>|                  |                  |
 |                        |                  _rtcPipelineSave(payload)    |                  |                  |
 |                        |                        |                      |                  |                  |
 |                        |                  [1] upsertRecord(records, payload)              |                  |
 |                        |                  s.records = upsertResult.records (直接代入)      |                  |
 |                        |                        |                      |                  |                  |
 |                        |                  [2] persistRecordState()     |                  |                  |
 |                        |                        |-- saveState() ------>|                  |                  |
 |                        |                        |                      |-- _preSaveHooks[]|                  |
 |                        |                        |                      |   takeSnapshot() |                  |
 |                        |                        |                      |-- localStorage.setItem('ippo_state')
 |                        |                        |                      |-- _postSaveHooks[]                  |
 |                        |                        |                      |   count検証       |                  |
 |                        |                        |<----- return --------|                  |                  |
 |                        |                        |                      |                  |                  |
 |                        |                  [3] notifyRecordUpdated()    |                  |                  |
 |                        |                        | buildCalendar()      |                  |                  |
 |                        |                        | renderHome() 等      |                  |                  |
 |                        |                        |                      |                  |                  |
 |                        |                  [4] finalizeRecordSaveContext()                 |                  |
 |                        |                        |                      |                  |                  |
 |                        |                  [5] syncRecordImmediately(savedRecord) -------->|                  |
 |                        |                        |                      |           user_records upsert      |
 |                        |                        |                      |           失敗→syncPending=true    |
 |                        |                        |                      |                  |                  |
 | <- _showSuccessState() |                        |                      |                  |                  |
 | (1800ms後 close)       |                        |                      |                  |                  |
 |                        |                        |                      |                  |                  |
 |                   [500ms後]                     |                      |                  |                  |
 |                        |                  [6] syncRecordCloud() ------>|                  |                  |
 |                        |                        |              cloudBackupAll()----------->                  |
 |                        |                        |                      |           auth check               |
 |                        |                        |                      |           Empty Records Guard      |
 |                        |                        |                      |           user_data UPDATE/INSERT  |
```

---

## B. 従来記録フロー（legacy 経路）

```
User         app.html / app-legacy.js   record.js (wrapper)   record/save.js     state.js         supabase.js
 |                    |                       |                      |                |                 |
 |-- 保存ボタン tap -->|                       |                      |                |                 |
 |            saveRecordScreen()              |                      |                |                 |
 |                    |-- (tracedSaveRecordScreen wrapper) -------->|                |                 |
 |                    |                createRecordSaveContext()     |                |                 |
 |                    |                       |                      |                |                 |
 |            buildDraftFromUI()              |                      |                |                 |
 |            state.records 直接代入          |                      |                |                 |
 |                    |                       |                      |                |                 |
 |            saveState() [window経由] ------------------------------------------>  |                 |
 |                    |                       | persistRecordState() (hook経由)       |                 |
 |                    |                       |                      |  _preSaveHooks |                 |
 |                    |                       |                      |  localStorage.setItem           |
 |                    |                       |                      |  _postSaveHooks                 |
 |                    |                       |                      |                |                 |
 |            renderHome() / buildCalendar()  |                      |                |                 |
 |                    | notifyRecordUpdated() (hook経由)             |                |                 |
 |                    |                       |                      |                |                 |
 |            cloudBackupAll() 直接呼び出し ----------------------------------------->                 |
 |            または setTimeout(cloudBackupAll, 500ms)               |                |  user_data UPD  |
 |                    |                       |                      |                |                 |
 |                    |-- finalizeRecordSaveContext() ------------->  |                |                 |
 |                    |                       |                      |                |                 |
```

---

## C. 起動時 hydration フロー

```
app-bootstrap.js      state.js         supabase.js       recovery.js         rollback-manager.js
      |                   |                 |                  |                      |
  bootstrap()            |                 |                  |                      |
      |                  |                 |                  |                      |
  migrateStorageKeys()   |                 |                  |                      |
  (kk_records → ippo_state)               |                  |                      |
      |                  |                 |                  |                      |
  loadState() --------> |                 |                  |                      |
      |           localStorage('ippo_state')                  |                      |
      |           → setState(_state)       |                  |                      |
      |                  |                 |                  |                      |
  autoRecoveryCheck() ---------------------------------->    |                      |
      |                  |                 |  ippo_last_record_count 比較            |
      |                  |                 |  件数減少 → idbGetAllRecords()          |
      |                  |                 |  activeRecs > current → mergeRecords   |
      |                  |                 |  → setState + saveState                |
      |                  |                 |  それ以外 → manualCloudRestore(15s timeout)
      |                  |                 |                  |                      |
  initialCloudSync() --> |                 |                  |                      |
      |                  |       cloudRestore()               |                      |
      |                  |         user_data SELECT           |                      |
      |                  |         mergeRecords               |                      |
      |                  |         setState + saveState       |                      |
      |                  |                 |                  |                      |
  save-transaction-guard.install()        |                  |                      |
      |           addPreSaveHook(_preSave)  |                 |                      |
      |           addPostSaveHook(_postSave)|                 |                      |
      |                  |                 |                  |                      |
```

---

## D. ロールバックフロー

```
rollback-manager.js      state.js           save-transaction-guard.js
       |                    |                          |
  (saveState 毎に)          |                          |
  takeSnapshot('pre-save') <----- _preSave hook -------|
  _snapshots[] に push      |                          |
       |                    |                          |
  (記録消失検知時)            |                          |
  rollbackToBest()          |                          |
       |                    |                          |
  _ippoRollbackBypass=true  |                          |
  setState(bestSnapshot.data)|                         |
  _ippoRollbackBypass=false  |                         |
       |                    |                          |
  saveState() -----------> |                          |
       |            _preSaveHooks (takeSnapshot 再取得)|
       |            localStorage.setItem              |
       |            _postSaveHooks (count 検証)        |
       |                    |                          |
```

---

## E. 現在の問題: 保存経路分岐まとめ

```
UI 入口
  ├── 3カード記録 (openThreeCardRecord)
  │     └── _saveRecord → rtcSaveDelegate → _rtcPipelineSave
  │           └── [1] upsertRecord (直接代入)
  │               [2] persistRecordState → saveState()
  │               [3] notifyRecordUpdated
  │               [5] syncRecordImmediately (即時)
  │               [6] cloudBackupAll (500ms後)
  │
  └── 従来記録 (saveRecord / saveRecordScreen from app-legacy.js)
        └── state.records 直接代入
            saveState() 直接呼び出し
            renderHome 等 直接呼び出し
            cloudBackupAll 直接呼び出し
```

**Phase 4 目標**: 2 経路を `RecordRepository` → `saveState()` → `syncRecordImmediately` の 1 本に統一。
