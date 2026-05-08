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
- limited adoption experiment は「判定記録のみ」であり保存値を書き換えない
- dry-run field injection は context にだけ候補フィールドを記録し、record/draft/localStorage/Supabase へは書かない

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
  ↓
dry-run field injection が候補フィールドを context にだけ記録
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
6. dry-run field injection の候補フィールドを context にだけ記録する

## 主要API

### `ippoDateDryRunFieldInjectionSummary()`

dry-run field injection の判定履歴を集計する。

```js
ippoDateDryRunFieldInjectionSummary()
```

主な出力:

```js
{
  count,
  injectableCount,
  blockedCount,
  blockedByCounts,
  sourceCounts,
  branchCounts,
  recent,
}
```

### `ippoDateDryRunFieldInjectionHistory()`

dry-run field injection の詳細履歴を返す。

```js
ippoDateDryRunFieldInjectionHistory()
```

### `ippoClearDateDryRunFieldInjectionHistory()`

dry-run field injection の履歴をクリアする。

```js
ippoClearDateDryRunFieldInjectionHistory()
```

## dry-run fields

以下の候補フィールドを save context にだけ記録する。

```js
{
  __dryRunResolvedDate,
  __dryRunResolvedDateSource,
  __dryRunResolvedDateBranch,
  __dryRunResolvedDateConfidence,
}
```

重要:

- record本体には入れない
- draftには入れない
- localStorageには入れない
- Supabaseには送らない
- 保存対象dateとして使わない

## DevTools確認

```js
ippoLastRecordSaveContext()?.dateDryRunFieldInjection
```

```js
ippoDateDryRunFieldInjectionSummary()
```

```js
ippoVerifyLastRecordSave()
```

## dry-run injection のゲート

`canDryRunInject` が true になる条件は以下すべて。

1. limited adoption experiment が adoptable
2. `wouldAdoptDate` が存在する
3. branch mismatch がない
4. actualDate mismatch がない

## dry-run blocker

| blocker | 意味 |
|---|---|
| `limited-experiment-not-adoptable` | limited adoption experiment が通っていない |
| `missing-dry-run-date` | dry-run候補dateがない |
| `branch-mismatch` | branch判定が一致しない |
| `actual-date-mismatch` | 現行保存結果のdateと候補dateが一致しない |

## 複数回テスト例

```text
1. ippoClearDateAdoptionGateHistory()
2. ippoClearDateResolutionRolloutTraceHistory()
3. ippoClearLimitedDateAdoptionExperimentHistory()
4. ippoClearDateDryRunFieldInjectionHistory()
5. ippoSetLimitedDateAdoptionExperimentEnabled(true)
6. 新規recordを保存
7. ippoDateDryRunFieldInjectionSummary()
8. ippoVerifyLastRecordSave()
9. 既存recordを編集保存
10. ippoDateDryRunFieldInjectionSummary()
```

見たいもの:

- 新規保存の安定ケースで `injectableCount` が増える
- 編集保存では dry-run injection が blocked になる
- `actual-date-mismatch` が出ない
- `branch-mismatch` が出ない
- 保存結果そのものは従来通り

## まだやらないこと

- `saveRecordScreen` の draft 作成を移動しない
- `saveRecordScreen` 内の date 判定を置換しない
- `state.records` の更新処理を置換しない
- `record-upsert.js` を本番経路に差し替えない
- 編集完了後の `editingDate` clear 挙動を変更しない
- dry-run fields を record / draft / storage / Supabase に入れない

## 動作確認チェックリスト

- 新規record保存
- 編集record保存
- 編集保存後に未編集フィールドが保持される
- 編集対象日と保存対象日が一致する
- 新規保存時に古いeditingDateが使われない
- カレンダー該当日に反映される
- `ippoVerifyLastRecordSave()` の既存warningsが悪化しない
- `ippoDateDryRunFieldInjectionSummary()` が確認できる
- `canDryRunInject` が想定条件でだけ true になる
- 保存結果が変わらない

## 次PRの推奨内容

Phase 3-I-4 — first limited real adoption behind explicit flag

まだ全面置換はしない。

次にやること:

1. 新規保存のみ
2. explicit flag ON のみ
3. dry-run injectable のみ
4. proposal date と actualDate が一致する場合のみ
5. それでも最初は `context` / `draft candidate` への限定反映から始める

## 判断

Phase 3-I-3では、実採用の直前段階として dry-run candidate fields を save context にだけ記録する。

このPRでは、保存本体変更・保存値変更・upsert置換・storage変更は行わない。