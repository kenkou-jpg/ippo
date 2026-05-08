# Phase 3-H / 3-I — record date / edit branch observability

## 目的

`saveRecordScreen` 本体を分解する前に、保存時の date 判定と新規/編集分岐を可視化する。

このフェーズでは保存処理そのものは変更しない。

## 背景

Phase 3-G までで、保存パイプラインの外側には以下の観測レイヤーが入った。

- persist observability
- sync observability
- notify observability
- action timeline
- healthSummary
- storage diagnostics

次に危険なのは、保存対象の日付と編集状態の判定である。

特に以下の値が混在すると、保存先 record がずれる可能性がある。

- `state.editingDate`
- `state.selectedDate`
- draft / UI 由来の `record_date`
- 既存 record の date field
- カレンダー/詳細画面から渡された date

## 絶対方針

- `saveRecordScreen` 本体はまだ変更しない
- 新規/編集保存の分岐はまだ置き換えない
- `buildDraftFromUI` の返却内容はまだ変更しない
- `upsertRecord` の本番置換はまだしない
- Supabase保存順は変更しない
- localStorage保存順は変更しない
- DOM IDは変更しない
- window互換は維持する
- `record-date-rollout-trace.js` は proposal を実保存には使わない
- Phase 3-I-2 の limited adoption experiment は「判定記録のみ」であり保存値を書き換えない

## 現在の関係図

```text
編集導線
  ↓
record-edit-hydrate.js
  ↓
state.editingDate 補完 / hydrate retry
  ↓
record画面
  ↓
saveRecordScreen
  ↓
UIからdraft作成
  ↓
保存対象dateを決定
  ↓
既存record更新 or 新規record追加
  ↓
saveState / cloudBackupAll / notify
  ↓
record-date-branch-observability.js が外側から保存前後を比較
  ↓
record-date-rollout-trace.js が「もし採用するなら」を trace-only で記録
  ↓
limited adoption experiment gate が「採用可能か」を判定だけ記録
```

## 追加した観測レイヤー

### `src/modules/record-date-branch-observability.js`

保存本体に介入せず、以下を行う。

1. `saveRecordScreen` 実行前に snapshot を取る
2. `saveRecordScreen` 実行後に snapshot を取る
3. records差分から changedDates を推定する
4. editingDate / selectedDate / changedDates から保存対象dateを pure helper で推定する
5. 現行保存結果と helper 推定値を shadow compare する
6. 置換候補が採用可能か adoption gate で判定する
7. adoption gate の履歴を実行中メモリに最大20件保持する

### `src/modules/record-date-rollout-trace.js`

保存本体に介入せず、以下を行う。

1. last save context の adoption gate を読む
2. `canAdopt === true` の場合に「もし採用するなら使う値」を trace する
3. 実保存には proposal を使わない
4. rollout trace の履歴を実行中メモリに最大20件保持する
5. limited adoption experiment の有効/無効と採用可否を記録する

## 主要API

### `resolveRecordSaveDateCandidate(input)`

pure helper。

入力:

```js
{
  editingDate,
  selectedDate,
  draftDate,
  changedDates,
  fallbackDate,
}
```

出力:

```js
{
  resolvedDate,
  source,
  confidence,
  candidates,
  uniqueDates,
  warnings,
}
```

### `buildDateResolutionAdoptionGate(proposal, shadowCompare, dateBranch)`

本番置換へ進めるかどうかを判定する。

出力:

```js
{
  status,
  canAdopt,
  proposedDate,
  proposedSource,
  proposedBranch,
  confidence,
  blockers,
  warnings,
}
```

### `ippoDateAdoptionGateSummary()`

直近最大20件の保存結果から adoption gate の傾向を集計する。

```js
ippoDateAdoptionGateSummary()
```

### `ippoDateResolutionRolloutTraceSummary()`

trace-only rollout の傾向を集計する。

```js
ippoDateResolutionRolloutTraceSummary()
```

### `ippoIsLimitedDateAdoptionExperimentEnabled()`

limited adoption experiment が有効かどうかを返す。

```js
ippoIsLimitedDateAdoptionExperimentEnabled()
```

### `ippoSetLimitedDateAdoptionExperimentEnabled(enabled)`

limited adoption experiment の明示ON/OFF。

```js
ippoSetLimitedDateAdoptionExperimentEnabled(true)
ippoSetLimitedDateAdoptionExperimentEnabled(false)
```

ONにしても、このPRでは保存値は書き換えない。採用可能判定を `limitedDateAdoptionExperiment` として記録するだけ。

### `ippoLimitedDateAdoptionExperimentSummary()`

limited adoption experiment の判定履歴を集計する。

```js
ippoLimitedDateAdoptionExperimentSummary()
```

主な出力:

```js
{
  count,
  enabledCount,
  experimentallyAdoptableCount,
  blockedCount,
  blockedByCounts,
  branchCounts,
  sourceCounts,
  recent,
}
```

### `ippoLimitedDateAdoptionExperimentHistory()`

limited adoption experiment の詳細履歴を返す。

```js
ippoLimitedDateAdoptionExperimentHistory()
```

### `ippoClearLimitedDateAdoptionExperimentHistory()`

limited adoption experiment の履歴をクリアする。

```js
ippoClearLimitedDateAdoptionExperimentHistory()
```

## DevTools確認

新規保存・編集保存のあとに確認する。

```js
ippoLastRecordSaveContext()?.dateBranch
```

```js
ippoLastRecordSaveContext()?.dateResolutionAdoptionGate
```

```js
ippoLastRecordSaveContext()?.dateResolutionRolloutTrace
```

```js
ippoLastRecordSaveContext()?.limitedDateAdoptionExperiment
```

```js
ippoVerifyLastRecordSave()
```

複数回保存した後に確認する。

```js
ippoDateAdoptionGateSummary()
```

```js
ippoDateResolutionRolloutTraceSummary()
```

```js
ippoLimitedDateAdoptionExperimentSummary()
```

## limited adoption experiment のゲート

`canExperimentallyAdopt` が true になる条件は以下すべて。

1. `ippoSetLimitedDateAdoptionExperimentEnabled(true)` で明示ON
2. `dateResolutionAdoptionGate.canAdopt === true`
3. rollout trace が proposal を使える状態
4. branch が `create-by-selectedDate` または `create-by-detected-date`
5. proposedDate が存在する
6. rollout blockers が空
7. rollout warnings が空

ただし、このPRでは true になっても保存値は書き換えない。

## limited adoption blocker

| blocker | 意味 |
|---|---|
| `experiment-disabled` | 明示ONされていない。デフォルト状態 |
| `adoption-gate-blocked` | adoption gate が通っていない |
| `rollout-trace-not-usable` | rollout trace 上 proposal が使えない |
| `not-new-record-branch` | 新規保存branchではない |
| `missing-proposed-date` | 提案dateがない |
| `rollout-blockers-present` | rollout trace に blocker がある |
| `rollout-warnings-present` | rollout trace に warning がある |

## 複数回テスト例

```text
1. ippoClearDateAdoptionGateHistory()
2. ippoClearDateResolutionRolloutTraceHistory()
3. ippoClearLimitedDateAdoptionExperimentHistory()
4. ippoSetLimitedDateAdoptionExperimentEnabled(false)
5. 新規recordを保存
6. ippoLimitedDateAdoptionExperimentSummary()
7. ippoSetLimitedDateAdoptionExperimentEnabled(true)
8. 新規recordを保存
9. ippoLimitedDateAdoptionExperimentSummary()
10. 既存recordを編集保存
11. ippoLimitedDateAdoptionExperimentSummary()
```

見たいもの:

- OFF時は `experiment-disabled` が出る
- ON時でも編集保存では `not-new-record-branch` が出る
- 新規保存かつadoptableな場合のみ `experimentallyAdoptableCount` が増える
- `shadow-date-mismatch` が出ない
- 保存結果そのものは従来通り

## まだやらないこと

- `saveRecordScreen` の draft 作成を移動しない
- `saveRecordScreen` 内の date 判定を置換しない
- `state.records` の更新処理を置換しない
- `record-upsert.js` を本番経路に差し替えない
- 編集完了後の `editingDate` clear 挙動を変更しない
- limited adoption experiment の proposal を実保存に使わない

## 動作確認チェックリスト

- 新規record保存
- 編集record保存
- 編集保存後に未編集フィールドが保持される
- 編集対象日と保存対象日が一致する
- 新規保存時に古いeditingDateが使われない
- カレンダー該当日に反映される
- `ippoVerifyLastRecordSave()` の既存warningsが悪化しない
- `ippoLimitedDateAdoptionExperimentSummary()` が確認できる
- ON/OFFで blocker が想定通り変わる
- ONにしても保存結果が変わらない

## 次PRの推奨内容

Phase 3-I-3 — dry-run field injection experiment

まだ全面置換はしない。

次にやること:

1. limited adoption experiment で新規保存ケースの判定が安定することを確認する
2. proposal date を保存には使わず、draft candidate として別フィールドに dry-run 記録する案を検討する
3. 編集保存はまだ置換しない

## 判断

Phase 3-H / 3-Iでは、保存本体の薄型化へ入る前に date branch を観測可能にする。

このPRでは、limited adoption experiment の判定ゲートまで追加するが、保存本体変更・保存値変更・upsert置換は行わない。