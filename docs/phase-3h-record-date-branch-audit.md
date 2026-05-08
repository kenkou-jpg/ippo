# Phase 3-H-0 — record date / edit branch audit

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
```

## 監査対象

### 1. editingDate

役割候補:

- 編集中recordの日付
- hydrate対象recordのキー
- 編集保存時の既存record検索キー

リスク:

- hydrate用の日付と保存用の日付が一致しない
- 編集完了後に残留して次回新規保存へ影響する
- selectedDateより優先される条件が不明瞭になる

### 2. selectedDate

役割候補:

- カレンダーで選択中の日付
- 新規保存時の初期date
- 詳細画面からrecord画面へ遷移したときのdate候補

リスク:

- 編集中なのにselectedDateが優先される
- 新規保存なのに古いselectedDateが残る
- タイムゾーンやYYYY-MM-DD形式のずれで別日保存になる

### 3. record_date / date field

役割候補:

- draftに含まれる保存対象日
- record repository の `getRecordDate()` で正規化される日付
- Supabase同期時のrecord key

リスク:

- `date`, `record_date`, `created_at` など複数フィールドが混在する
- UI由来の空値が既存recordの日付を上書きする
- Supabase側とlocal state側でdate keyがずれる

## 保存分岐で観測したい項目

次PR以降で、保存本体を変更せずに以下を context に追加する。

```js
context.meta.dateBranch = {
  editingDateBefore,
  selectedDateBefore,
  draftDate,
  normalizedDraftDate,
  existingRecordDate,
  resolvedSaveDate,
  branch,
  confidence,
  warnings,
}
```

### branch 候補

| branch | 意味 |
|---|---|
| `edit-by-editingDate` | `editingDate` を基準に既存recordを更新した可能性 |
| `edit-by-draft-date` | draft内dateを基準に既存recordを更新した可能性 |
| `create-by-selectedDate` | `selectedDate` を基準に新規recordを作った可能性 |
| `create-by-draft-date` | draft内dateを基準に新規recordを作った可能性 |
| `unknown` | 外側から判断不可 |

## warning 候補

| warning | 意味 |
|---|---|
| `missing-save-date` | 保存対象dateが外側から確認できない |
| `editing-selected-mismatch` | `editingDate` と `selectedDate` が異なる |
| `editing-draft-mismatch` | `editingDate` と draft date が異なる |
| `selected-draft-mismatch` | `selectedDate` と draft date が異なる |
| `date-format-unknown` | date形式がYYYY-MM-DDへ正規化できない |
| `editing-date-stale` | 編集完了後もeditingDateが残っている可能性 |
| `duplicate-date-candidate` | 同じdateのrecordが複数存在する可能性 |

## まだやらないこと

- `saveRecordScreen` の draft 作成を移動しない
- `saveRecordScreen` 内の date 判定を置換しない
- `state.records` の更新処理を置換しない
- `record-upsert.js` を本番経路に差し替えない
- 編集完了後の `editingDate` clear 挙動を変更しない

## 次PRの推奨内容

Phase 3-H-1 — record date branch observability

対象:

- `src/modules/record-save-pipeline.js`
- `src/modules/record.js`

内容:

1. `record-save-pipeline.js` に date branch 用の pure helper を追加する
2. `record.js` の save wrapper 外側で、保存前後の date候補を context.meta に記録する
3. `verifyRecordSaveContext()` に dateBranch / dateWarnings を追加する
4. 保存順・保存内容・DOMには一切触らない

## DevTools確認案

```js
ippoLastRecordSaveContext()?.meta?.dateBranch
ippoVerifyLastRecordSave()?.dateWarnings
ippoVerifyLastRecordSave()?.healthSummary
```

## 動作確認チェックリスト

- 新規record保存
- 編集record保存
- 編集保存後に未編集フィールドが保持される
- 編集対象日と保存対象日が一致する
- 新規保存時に古いeditingDateが使われない
- カレンダー該当日に反映される
- `ippoVerifyLastRecordSave()` の既存warningsが悪化しない

## 判断

Phase 3-Hでは、保存本体の薄型化へ入る前に date branch を観測可能にする。

ここを飛ばして draft/upsert 移行へ進むと、編集保存・新規保存・カレンダー反映のどこかで日付ずれが起きても原因が追いにくい。

したがって次は、本体変更ではなく date branch observability を追加する。