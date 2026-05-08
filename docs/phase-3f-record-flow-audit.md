# Phase 3-F-0 — record保存・編集・同期フロー棚卸し

## 目的

ippoをViteベースの安全な構造へ移行する前に、record周辺の保存・編集・同期フローを可視化する。

このフェーズでは保存処理そのものは変更しない。

## 現在の前提

- 本番読み込みは `app.html` から `src/main.js`。
- `src/main.js` は `state.js`, `record.js`, `record-edit-merge.js`, `record-edit-hydrate.js`, Supabase service を読み込む。
- `app.html` にはまだ巨大インラインJSが残っている。
- `saveRecordScreen` が現行保存処理。
- `saveRecord` はwindow互換用の薄いwrapperで、実質的な保存本体ではない。
- `js/app-local.js` / `kk-app.js` は今後廃止対象。

## 現在の主要ファイル

| ファイル | 役割 | 注意 |
|---|---|---|
| `app.html` | 旧来のUI・DOM・インライン関数本体 | まだ保存/画面遷移の実体が残る |
| `src/main.js` | Viteエントリー、各module/serviceの接続 | window互換を維持する入口 |
| `src/store/state.js` | `STATE_KEY = ippo_state`, `saveState`, `loadState` | `window.state` を正本として扱う |
| `src/modules/record.js` | record系window bridge、trace、openRecordScreen | 保存本体は変更しない |
| `src/modules/record-edit-merge.js` | 編集保存後の既存record保護 | `saveRecordScreen` wrapper |
| `src/modules/record-edit-hydrate.js` | 編集画面の復元補正 | `openRecordScreen` / `switchTab` / 編集導線 wrapper |
| `src/services/supabase.js` | Supabase client接続 | Vite/ブラウザESM用 |

## 現在の保存フロー 仮説

```text
ユーザーが記録保存ボタンを押す
  ↓
window.saveRecordScreen()
  ↓
app.html 内の現行保存処理
  ↓
UIからdraft/recordを作成
  ↓
state.records に追加または更新
  ↓
saveState()
  ↓
localStorage['ippo_state'] に保存
  ↓
cloudBackupAll() または関連同期関数
  ↓
Supabaseへ同期
  ↓
カレンダー/ホーム/インサイト再描画
```

## 現在の編集保存保護フロー

`record-edit-merge.js` は `saveRecordScreen` をwrapperする。

```text
saveRecordScreen開始前
  ↓
現在の state.records をclone
  ↓
元の saveRecordScreen を実行
  ↓
保存後の state.records と保存前recordを日付で比較
  ↓
空値で既存値を上書きしている場合は既存値を復元
  ↓
saveState()
  ↓
cloudBackupAll()
```

目的は、一部項目だけ編集したときに未表示/未編集フィールドが空値で消える問題を防ぐこと。

## 現在の編集画面hydrateフロー

`record-edit-hydrate.js` は以下をwrapperまたは監視する。

- `openRecordScreen`
- `switchTab('record')`
- `showScreen('record')`
- `openDayDetail`
- `editRecord`
- `openRecordEditor`
- `handleEditRecord`
- `startEditRecord`
- `resetRecordForm`
- document click captureで「編集」導線

```text
編集クリック/編集関数
  ↓
編集意図を記録
  ↓
state.editingDate を補完
  ↓
record画面表示
  ↓
複数タイミングで hydrateRecordForm()
  ↓
保存済みrecordから input/textarea/select/chip を復元
  ↓
resetRecordForm が後から走った場合も再hydrate
```

## 現在のstate / localStorage / Supabaseの関係

### 現在見えている保存先

| 保存先 | 用途 | 現状 |
|---|---|---|
| `window.state.records` | アプリ実行中のrecord配列 | 実質的な正本候補 |
| `localStorage['ippo_state']` | state全体の永続化 | `STATE_KEY` として定義済み |
| `localStorage['kk_records']` | 旧互換record保存先 | trace/hydrateで互換読み取りあり |
| `localStorage['records']` | 旧互換候補 | hydrateで互換読み取りあり |
| Supabase | クラウド同期 | `cloudBackupAll` / `cloudRestore` 系で接続 |

### 推奨する将来方針

```text
正本: window.state.records
永続化: localStorage['ippo_state'].records
互換読み取り: kk_records / records
クラウド同期: Supabase
```

ただし、即時移行は禁止。
まずは読み取り互換を維持しながら、書き込み先を段階的に `ippo_state.records` へ寄せる。

## ズレが起きやすい箇所

1. `state.records` は更新されたが `saveState()` が呼ばれない。
2. `saveState()` は成功したが `cloudBackupAll()` が失敗する。
3. Supabase復元後に `state.records` とlocalStorageが一致しない。
4. 編集画面で `editingDate` が未設定のままhydrateされる。
5. hydrate後に `resetRecordForm()` が走り、フォームが空になる。
6. 保存後にカレンダー再描画が呼ばれず、画面に反映されない。
7. 旧キー `kk_records` / `records` と `ippo_state.records` のどれが最新かわからない。

## Phase 3-Fでの優先順位

### F-0: 棚卸し

- 保存・編集・同期の現状フローを文書化する。
- ロジック変更なし。

### F-1: record repositoryの読み取り専用導入

候補ファイル:

```text
src/modules/record-repository.js
```

最初に提供する関数:

```text
getRecords()
findRecordByDate(date)
getRecordDate(record)
getRecordsSnapshot()
```

この段階では書き込みを置き換えない。

### F-2: 保存先診断trace

`state.records`, `ippo_state.records`, `kk_records`, Supabase同期タイミングを比較する診断関数を追加する。

候補:

```text
window.ippoRecordStorageSnapshot()
```

### F-3: record repository経由の安全なupsert準備

`saveRecordScreen` 本体を書き換える前に、同等結果になるupsert関数を横に作る。

### F-4: saveRecordScreenの薄い委譲化

保存ロジックを一気に移すのではなく、以下の順に移す。

1. date判定
2. 既存record検索
3. merge/upsert
4. persist
5. sync
6. render通知

## 短期ゴールに対するチェックリスト

| ゴール | 確認方法 |
|---|---|
| 記録が保存できる | 新規record作成後、`state.records` と `ippo_state.records` を確認 |
| 編集時に既存内容が消えない | 一部だけ編集して保存し、未編集フィールドが残るか確認 |
| クラウド同期できる | `cloudBackupAll` 成功ログ、別端末/復元で確認 |
| カレンダーに反映される | 保存後に該当日に記録マーク/詳細が出るか確認 |

## 次に着手する作業

Phase 3-F-1として、読み取り専用の `record-repository.js` を追加する。

このrepositoryは既存保存処理を置き換えない。
まずは `record-edit-merge.js` / `record-edit-hydrate.js` が重複して持っている `dateOf`, `records`, localStorage互換読み取りを共通化する土台にする。

## 禁止事項

- `saveRecordScreen` の保存ロジック変更
- Supabase書き込み順序変更
- localStorageキーの即時削除
- DOM ID変更
- app.htmlの大規模差分
- window互換削除
