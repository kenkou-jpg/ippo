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

### `buildDateResolutionShadowCompare(dateResolution, changedDates)`

現行保存結果と pure helper の提案値を比較する。

出力:

```js
{
  actualDate,
  actualChangedDates,
  resolvedDate,
  resolvedSource,
  matched,
  comparable,
  warnings,
}
```

### `buildDateResolutionProposal(dateResolution, branch, shadowCompare)`

将来置換時の提案値を作る。

出力:

```js
{
  proposedDate,
  proposedSource,
  proposedBranch,
  confidence,
  canPromote,
  promotionBlockedBy,
  candidates,
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

主な出力:

```js
{
  count,
  adoptableCount,
  blockedCount,
  matchedCount,
  comparableCount,
  blockerCounts,
  warningCounts,
  branchCounts,
  sourceCounts,
  recent,
}
```

### `ippoDateAdoptionGateHistory()`

直近最大20件の詳細履歴を返す。

```js
ippoDateAdoptionGateHistory()
```

### `ippoClearDateAdoptionGateHistory()`

履歴をクリアする。

```js
ippoClearDateAdoptionGateHistory()
```

## DevTools確認

新規保存・編集保存のあとに確認する。

```js
ippoLastRecordSaveContext()?.dateBranch
```

```js
ippoLastRecordSaveContext()?.dateShadowCompare
```

```js
ippoLastRecordSaveContext()?.dateResolutionProposal
```

```js
ippoLastRecordSaveContext()?.dateResolutionAdoptionGate
```

```js
ippoVerifyLastRecordSave()
```

複数回保存した後に確認する。

```js
ippoDateAdoptionGateSummary()
```

```js
ippoDateAdoptionGateHistory()
```

## adoption gate の見方

### 置換検討OK

```js
ippoVerifyLastRecordSave()?.dateResolutionAdoptionGate?.status === 'adoptable'
```

かつ:

```js
ippoVerifyLastRecordSave()?.dateResolutionAdoptionGate?.blockers?.length === 0
```

さらに複数回確認で:

```js
ippoDateAdoptionGateSummary()?.blockedCount === 0
```

### 置換禁止

以下の blocker が1つでも出る場合は、まだ本番置換しない。

| blocker | 意味 |
|---|---|
| `missing-proposed-date` | helper が提案dateを出せない |
| `proposal-not-promotable` | proposal 側で昇格不可 |
| `shadow-not-comparable` | 現行保存結果と比較できない |
| `shadow-not-matched` | 現行保存dateと helper 推定dateが一致しない |
| `date-warnings-present` | date関連warningが残っている |
| `unknown-branch` | 新規/編集分岐が外側から判断できない |
| `low-confidence` | 推定信頼度が低い |

## warning 候補

| warning | 意味 |
|---|---|
| `missing-save-date` | 保存対象dateが外側から確認できない |
| `editing-selected-mismatch` | `editingDate` と `selectedDate` が異なる |
| `editing-draft-mismatch` | `editingDate` と draft date が異なる |
| `selected-draft-mismatch` | `selectedDate` と draft date が異なる |
| `date-candidate-mismatch` | 複数date候補が一致しない |
| `editing-date-stale` | 編集完了後もeditingDateが残っている可能性 |
| `duplicate-date-candidate` | 同じdateのrecordが複数存在する可能性 |
| `shadow-date-mismatch` | 現行保存dateと helper 推定dateが一致しない |
| `shadow-multiple-actual-dates` | 保存後に複数dateが変化した |
| `shadow-no-changed-date` | 保存前後で変更dateを検出できない |

## 複数回テスト例

```text
1. ippoClearDateAdoptionGateHistory()
2. 新規recordを保存
3. ippoDateAdoptionGateSummary()
4. 既存recordを編集保存
5. ippoDateAdoptionGateSummary()
6. もう一度別日で新規保存
7. ippoDateAdoptionGateSummary()
```

見たいもの:

- `matchedCount` が保存回数に近い
- `blockedCount` が通常ケースで増えない
- `blockerCounts` に同じ blocker が連続して出ない
- `warningCounts` に `shadow-date-mismatch` が出ない

## まだやらないこと

- `saveRecordScreen` の draft 作成を移動しない
- `saveRecordScreen` 内の date 判定を置換しない
- `state.records` の更新処理を置換しない
- `record-upsert.js` を本番経路に差し替えない
- 編集完了後の `editingDate` clear 挙動を変更しない

## 動作確認チェックリスト

- 新規record保存
- 編集record保存
- 編集保存後に未編集フィールドが保持される
- 編集対象日と保存対象日が一致する
- 新規保存時に古いeditingDateが使われない
- カレンダー該当日に反映される
- `ippoVerifyLastRecordSave()` の既存warningsが悪化しない
- `dateShadowCompare.matched` が通常ケースで true になる
- `dateResolutionAdoptionGate.status` が通常ケースで `adoptable` または blocker理由つき `blocked` になる
- `ippoDateAdoptionGateSummary()` で複数回の傾向を確認できる

## 次PRの推奨内容

Phase 3-I-1 — guarded rollout trace only

まだ本番置換はしない。

次にやること:

1. `dateResolutionAdoptionGate.canAdopt === true` のケースを複数手動確認する
2. 編集保存・新規保存・日付変更なし保存で warning の出方を確認する
3. blocker が安定してゼロになる条件を整理する
4. guarded rollout trace を追加し、proposalを実保存には使わず traceだけ流す

## 判断

Phase 3-H / 3-Iでは、保存本体の薄型化へ入る前に date branch を観測可能にする。

ここを飛ばして draft/upsert 移行へ進むと、編集保存・新規保存・カレンダー反映のどこかで日付ずれが起きても原因が追いにくい。

したがってこのPRでは、本体変更ではなく date branch observability / shadow compare / adoption gate / history summary までに留める。