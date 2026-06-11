# ADR-005 — Guard 責務吸収・廃止判断

**日付**: 2026-06-11  
**ステータス**: Accepted  
**根拠**: 実コード監査 (2026-06-11) による

---

## 背景

ippo には保存・起動・同期の各フェーズを保護する 7 つの guard が存在する。
原則として「guard は即削除しない。責務を基盤へ吸収した後にのみ削除する」。
本 ADR では各 guard の存在理由・防いでいる障害・吸収先・削除可否を記録する。

---

## Guard 一覧と分析結果

### 1. `save-transaction-guard.js` (79行)

**存在理由**: `saveState()` 呼び出しをトランザクション化し、保存前後の localStorage 整合性を検証する。

**防いでいる障害**:
- 保存後に localStorage の records 件数が減少するサイレント失敗
- 保存失敗時のメトリクス未記録

**再発条件**: RecordRepository の write facade が post-save 検証を省略した場合に再発する。

**現在の動作**:
- `addPreSaveHook`: `rollback-manager.takeSnapshot()` を呼ぶ
- `addPostSaveHook`: localStorage から records 件数を読み取り、保存前より減少していたら `logWarning`

**吸収先**: `RecordRepository.persistRecords()` に post-save 整合性チェックを組み込む。

**削除条件**:
- RecordRepository が全保存経路の窓口になった後
- post-save 整合性チェックが RecordRepository 内で再実装された後
- テストで「保存後に件数が維持されること」を証明した後

**判断**: Phase 4-D 後に吸収・削除を検討。現時点では維持。

---

### 2. `state-integrity-guard.js` (93行)

**存在理由**: `setState()` 時に records が大幅減少（3件以上かつ 50% 未満）した場合に setState をブロックし、自動ロールバックを発動する。

**防いでいる障害**:
- 誤った setState による大量レコード消失
- cloud sync による空 state 上書き

**再発条件**: RecordRepository の write facade が setState フックを迂回した場合に再発する。

**現在の動作**:
- `addSetStateHook` で全 setState をインターセプト
- DROP_ABS_THRESHOLD=3 かつ DROP_RATIO_THRESHOLD=0.5 の両条件で `rollbackToBest()` を発動
- cloud sync もブロック (`ippoSyncConsistencyChecker.markCloudSyncBlocked(true)`)

**吸収先**: RecordRepository の `persistRecords()` に「records 大幅減少の事前検証」を組み込む（書き込みを拒否してログに記録）。

**削除条件**:
- RecordRepository が全 records 書き込みを制御するようになった後
- 書き込み前バリデーションが RecordRepository 内で実装された後
- テストで「50% 以上の records 減少は拒否されること」を証明した後

**判断**: Phase 4-D 後に吸収・削除を検討。現時点では維持。

---

### 3. `record-freshness-guard.js` (351行)

**存在理由**: stale overwrite（古いデータによる新しいデータの上書き）を検出し、自動修復する。

**防いでいる障害**:
- cloud restore / visibilitychange などのタイミングで発生する stale 上書き
- records 件数減少・contentHash 変化・lastDate 後退の 3 条件で検出

**再発条件**:
- SyncService (supabase.js) の cloudRestore() が hydration-guard を経由しない場合
- offline/online イベント時のデータ競合

**現在の動作**:
- `offline` / `online` イベント時に fingerprint スナップショットを取得
- 保存直前に fingerprint を比較し、stale 候補なら `lastKnownFreshRecords` で修復
- Save Consolidation 後は `persistRecords()` 経由で保存

**吸収先**: SyncService に「hydration 前の freshness チェック」を組み込む。`hydration-guard.checkHydration()` が既にこの役割を部分的に担っている。

**削除条件**:
- `hydration-guard.checkHydration()` が online/offline ケースも完全にカバーした後
- テストで「offline → online 復帰時に stale 上書きが発生しないこと」を証明した後

**判断**: Phase 5 で `hydration-guard` との責務統合を評価する。現時点では維持。

---

### 4. `record-draft-guard.js` (237行)

**存在理由**: 記録入力中にページリロード / SW更新 / pagehide が発生した場合に、入力内容を `ippo_record_draft` (localStorage) に退避し、次回起動時に復元プロンプトを表示する。

**防いでいる障害**:
- 入力途中のデータ消失（保存ボタン押下前のページ離脱）

**再発条件**: この guard を削除した場合、入力途中のデータは常に失われる。

**現在の動作**:
- `visibilitychange(hidden)` / `pagehide` / `beforeunload` でドラフトを localStorage に保存
- 起動時に `ippo_record_draft` を確認し、正式保存済みでなければ復元プロンプトを表示
- `_dirtyFlag` で入力中かどうかを管理

**吸収先**: なし。この guard は UX 層の責務（入力途中データの保護）であり、基盤層への吸収対象ではない。

**判断**: **削除しない**。この機能は RecordRepository / SyncService に吸収できる性質ではなく、独立した UX 保護として維持する。

---

### 5. `record-edit-save-identity-guard.js` (375行)

**存在理由**: 編集保存時に `buildDraftFromUI()` が返す空値・初期値で既存レコードを上書きしないよう保護する。保存後の同一日付レコード重複を統合する。

**防いでいる障害**:
- UI フォームのデフォルト値（rating=3, score=5 など）が既存値を上書きする問題
- 保存後に同一日付レコードが重複して作成される問題

**再発条件**:
- `buildDraftFromUI()` が空値・デフォルト値を返す実装が維持される限り再発する
- 編集フローが RecordRepository の `upsertRecord(preserveExisting: true)` を経由しない場合

**現在の動作**:
- `window.buildDraftFromUI` をラップし、編集中の既存レコードと merge
- `window.saveRecordScreen` をラップし、保存後に重複日付レコードを統合
- Save Consolidation 後は `persistRecords(list)` 経由で保存

**吸収先**: `record-upsert.js:mergeRecordPreservingExisting()` が既に同様のロジックを持つ。`RecordRepository.persistRecords()` が upsert 時に既存値保護を内包すれば、このガードの大部分は不要になる。

**削除条件**:
- `buildDraftFromUI()` が既存値を保護する形に修正された後
- RecordRepository の write facade が「既存値保護付き upsert」を提供するようになった後
- テストで「編集保存時に既存値が消えないこと」を証明した後

**判断**: Phase 5 で `record-upsert.js` への吸収を評価する。現時点では維持。

---

### 6. `hydration-guard.js` (84行)

**存在理由**: cloud restore / IDB restore / auto-recovery が、より新しいローカル state を stale なデータで上書きしないよう保護する。

**防いでいる障害**:
- タイムスタンプが古い cloud データによるローカル state の上書き
- records 件数が少ない cloud データによる上書き

**再発条件**: SyncService (cloudRestore) が hydration-guard を経由しない保存経路を使った場合に再発する。

**現在の動作**:
- `checkHydration(incomingData, source)` を呼ぶ側（cloudRestore など）が上書き前に確認する「opt-in」方式
- `isNewerOrEqual()` でタイムスタンプ比較（不明時は records 件数で比較）
- 通過時は `rollback-manager.takeSnapshot()` でスナップショットを取得

**吸収先**: SyncService (supabase.js) の cloudRestore() / initialCloudSync() に組み込む。現在は cloudRestore が既に `checkHydration` を呼んでいる可能性があるが、全経路でのカバーを確認する必要がある。

**判断**: 責務が明確で軽量（84行）のため、SyncService に組み込まれるまで維持。独立モジュールとしての存在意義がある。現時点では**削除しない**。

---

### 7. `startup-validator.js` (77行)

**存在理由**: 起動フェーズの重複（duplicate init / duplicate hydration / duplicate render / startup race）を検知・警告する。

**防いでいる障害**:
- 同一フェーズが 2 回実行されることによる初期化の二重実行
- 起動シーケンスのデバッグを困難にする無声の重複実行

**再発条件**: startup フェーズを管理する orchestrator が phase tracking を内包すれば不要になる。

**現在の動作**:
- `markPhase(name)` を呼ぶ側（各 runtime モジュール）が重複を自己申告する「opt-in」方式
- 重複検知時は `console.warn` + `health-monitor.logWarning` で記録
- `_phases` モジュール変数でフェーズ履歴を管理

**吸収先**: `runtime-orchestrator.js` / `runtime-brain.js` が phase tracking を内包する形に拡張する。

**判断**: 責務が明確で軽量（77行）のため、Runtime orchestrator に統合されるまで維持。現時点では**削除しない**。

---

## Guard 削除優先順位

| Guard | 削除優先度 | 吸収先 | 前提条件 |
|---|---|---|---|
| `record-edit-save-identity-guard.js` | 高 | `record-upsert.js` + RecordRepository | buildDraftFromUI 修正後 |
| `save-transaction-guard.js` | 中 | RecordRepository | Phase 4-D + write facade 完成後 |
| `state-integrity-guard.js` | 中 | RecordRepository | Phase 4-D + write facade 完成後 |
| `record-freshness-guard.js` | 中 | SyncService + hydration-guard | SyncService 統合後 |
| `startup-validator.js` | 低 | runtime-orchestrator | Runtime 整理後 |
| `hydration-guard.js` | 低 | SyncService | SyncService 統合後 |
| `record-draft-guard.js` | **削除しない** | — | UX 保護層として維持 |

---

## 関連 ADR

- ADR-001: Save Architecture 統合判断
- ADR-006: Save Domain Boundary 判断（RecordRepository write facade）
- ADR-007: Sync Architecture 判断（SyncService 統一）
