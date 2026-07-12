# Prototype Runtime Connection Review（PR-REC-03b着手前レビュー）

> PR-REC-03a採用後の実コード（`637a6d2`）を対象にしたREAD-ONLY調査。
> コード変更は行っていない。目的はPR-REC-03bの接続経路
> `Prototype UI → Application → Adapter → Runtime → Legacy → Supabase`
> を具体的なファイル・関数レベルで確定し、着手前に判断が必要な事項を洗い出すこと。

---

## 1. 各層の現状と、03bでの実体

| 層 | 現状 | PR-REC-03bで行うこと |
|---|---|---|
| **Prototype UI** | `src/screens/record-three-card.html`の`#rtc-proto-view`（既存、無変更で使う） | 何もしない（変更禁止） |
| **Application** | 存在しない（新規） | `_protoSubmit()`内から、DOM状態を1つのPayloadオブジェクトへ集約する新関数を呼ぶ |
| **Adapter** | `domains/record/prototype-payload-mapper.ts`（PR-REC-01）は**対象外**（後述2） | 新規: Prototype Payload → legacy `_buildPayload()`互換オブジェクトへの変換関数 |
| **Runtime** | `record-three-card.js`の`_integrateWithExistingSave(payload)` → `window.rtcSaveDelegate` | 既存関数をそのまま呼ぶだけ（無変更） |
| **Legacy** | `record-three-card-save.js`の`_rtcPipelineSave()`（upsertRecord/persistRecordState/notifyRecordUpdated） | 無変更 |
| **Supabase** | `services/supabase.js`の`syncRecordImmediately()`（`_rtcPipelineSave`内から`payload.record_date`があれば自動発火） | 無変更 |

---

## 2. なぜAdapterはPR-REC-01のmapperを使わないか

`domains/record/prototype-payload-mapper.ts`（`mapPrototypePayloadToRecordDraft()`）は、Prototype PayloadをTypeScriptの`RecordEntity`/`RecordDraft`（正規化スキーマ想定）へ変換する。しかし実際にライブで動いている保存経路（`_rtcPipelineSave` → `upsertRecord` → `state.records[]` → `syncRecordImmediately` → `user_records`テーブル）が使うのは**別の、レガシーなフラット形式**であり、フィールド名も異なる（例: `menstrualCycle`ではなく`cycle`、`temperature`ではなく`temp`、`symptoms`/`factors`は英語canonical keyではなく日本語表示ラベル文字列）。

`PR_REC_03_RUNTIME_INTEGRATION_PLAN.md`（前回のReview）で既に特定済みの通り、PR-REC-06（スキーマ一本化）が完了するまでは、`prototype-payload-mapper.ts`を接続対象にしない。03bでは**別のAdapterを新設**する。

---

## 3. 重大な発見: `data-value`属性がPR-REC-03a移植時に欠落している

`prototype/index.html`のオリジナルは気分・睡眠・肌・周期・血塊・おりもの・排便の全チップに`data-value="..."`（例: `data-value="3"`, `data-value="rough"`）を持つが、**`src/screens/record-three-card.html`の`#rtc-proto-view`には`data-value`属性が1つも存在しない**（grep実測でゼロ件、対してprototype側は同一箇所に存在）。

これは移植時（PR-REC-03a）に欠落したものであり、現状は絵文字・日本語テキストの内容自体でしか選択値を判別できない状態になっている。

**影響**: Application層（DOM状態→Payload集約）を実装する際、機械可読な値が取得できない。選択肢は以下のいずれか。

```
a) data-value属性を復元する（非表示・非視覚的な属性追加のみ。CSS/レイアウト/文言/構造は無変更）
b) ボタンのテキスト内容（絵文字・日本語ラベル）を読み取り、Adapter内でlookup変換する
c) 子要素のインデックス位置で判定する（DOM構造変更に対して脆い）
```

**このレビューの結論としての推奨**: (a)。`data-value`はレンダリング結果・見た目に一切影響しない属性であり、「UI変更禁止」が指す視覚的・構造的な変更（マークアップの意味・レイアウト・文言・CSS）には該当しないと判断する。ただし最終的な解釈はFounder判断に委ねる。(b)を選ぶ場合、絵文字4種・日本語ラベル約20種のlookup表をAdapter内に保持することになり、将来Prototype側の文言が変わるたびに同期が必要になる保守負債を生む。

---

## 4. データ集約対象（Application層が読むべきフィールド一覧）

`#rtc-proto-view`内の`data-field`属性を実測した結果:

```
常時表示:
  mood            — .emoji-picker[data-field="mood"] .selected（絵文字、data-value欠落）
  sleep           — .chip-group[data-field="sleep"] .selected（テキスト、data-value欠落）
  skin            — .chip-group[data-field="skin"] .selected（テキスト、data-value欠落）
  tags            — #rtc-proto-tag-grid .selected（data-tag属性は健在、そのまま使える）
  memo            — #rtc-proto-memo（textarea、直接value取得）

詳細開示（record-detail-panel、hidden=trueの場合あり）:
  painLevel       — #rtc-proto-pain-level（range input、直接value取得）
  menstrualCycle  — .chip-group[data-field="menstrualCycle"] .selected（data-value欠落、
                    かつ4択とも未選択がデフォルト＝選択なしの状態が正）
  bloodClot       — .chip-group[data-field="bloodClot"] .selected（data-value欠落）
  bloodColor      — .chip-group[data-field="bloodColor"] .selected（data-value欠落）
  temperature     — #rtc-proto-temperature（number input、直接value取得）
  bowel           — .chip-group[data-field="bowel"] .selected（data-value欠落）
  medication      — #rtc-proto-medication（text input、直接value取得）

未接続（既知のギャップ、03bのスコープ外）:
  diseaseQuickSymptoms / disease-detail-chips
    — #rtc-proto-disease-chips・#rtc-proto-disease-detail-chipsは常にhidden=trueのまま
      （PR-REC-02のDISEASE_DISCLOSURE設定・renderRecordDiseaseDisclosure()は
      prototype/app.js側にのみ存在し、record-three-card.js側には移植されていない）。
      03bで無理に接続しようとするとJS描画ロジックの新規実装＝UI相当の変更になるため、
      現状「常に空配列」として扱い、Application層はこの2フィールドを空のまま送る。
```

---

## 5. Adapter変換方針（legacy `_buildPayload()`互換形状）

`record-three-card.js`の既存`_buildPayload()`（非prototype経路）が生成するフィールドのうち、`upsertRecord`のマージがキー非依存で動くことを踏まえ、最小限で意味のあるキーだけを送る。

```
record_date        ← 今日の日付（YYYY-MM-DD）。_rtcPipelineSave内のsyncRecordImmediately
                      発火判定（payload.record_date必須）に対応するため必ずsnake_case
mood                ← 絵文字インデックス(1-5)。data-value復元後はそのまま、
                      復元しない場合は絵文�→数値のlookup
sleepQuality        ← sleep(short/normal/long)を1/3/5等の数値へ変換
                      （既存_buildPayload()のsleepQuality相当語彙に合わせる）
symptoms            ← skin=roughの場合のみ["肌荒れ"]を追加。normal/goodは追加しない
                      （PR-REC-02 Decision 3の非永続化方針を踏襲）
factors             ← tags（data-tag値）をfactor_definitions表示名へ変換（例: caffeine→
                      "カフェイン"、dairy→"乳製品"）。domains側は英語canonical key、
                      legacy側は日本語表示名という既知の乖離（出力13で確認済み）に従う
note                ← memoそのまま
painLevel           ← rangeの値をそのまま数値で
cycle / bloodClot / bloodColor / bowel / temp / medication
                    ← legacy _buildPayload()相当の呼称に合わせて格納（menstrualCycle
                      ではなくcycle、temperatureではなくtemp、といった既存の
                      フィールド名ズレをAdapterで吸収する。PR_REC_03_RUNTIME_
                      INTEGRATION_PLAN.md 5節で特定済みの差異）
experiment_id       ← 現時点では常にnull/未送信。normalized recordsテーブル専用
                      カラム（PR-REC-05）であり、legacy user_recordsには対応先が
                      ないため送っても読まれない。将来PR-REC-06後に有効化する
                      前提でキーだけ予約しておくことは可（値は常にnull）
```

---

## 6. スコープ境界の確認

```
03bで触ってよいもの:
  □ record-three-card.js: _protoSubmit()の中身の実装、新規Adapter関数の追加
  □ 新規Adapterファイル（例: record-three-card-prototype-adapter.js）の追加

03bで触ってはいけないもの（UI変更）:
  □ record-three-card.html内のマークアップ・CSS・文言
      例外候補: data-value属性の復元（3節、Founder判断待ち）
  □ prototype/配下のファイル
  □ 疾患別開示チップの新規描画ロジック（4節、スコープ外として明記）

03bで触らない既存パイプライン:
  □ _rtcPipelineSave / upsertRecord / persistRecordState / notifyRecordUpdated
  □ syncRecordImmediately / syncRecordCloud
  □ record-edit.js / #screen-record（レガシー過去日編集経路、無関係）
```

---

## 7. 03bのBrowser Verification観点（実装後、Founderが確認する項目）

```
□ フラグOFF時: 通常のrtc-card-1/2/3経路の保存が今まで通り動作する（無影響であることの確認）
□ フラグON時: #rtc-proto-viewから「記録する」タップ→実際にstate.records[]へ保存される
□ 保存後、Supabase user_recordsテーブルへの即時upsert（syncRecordImmediately）が発火する
□ 同日再記録で1件に上書き統合される（upsertRecordの既存挙動）
□ 詳細未入力（painLevel=0のデフォルト等）でも保存が失敗しない
□ Console Error 0件
```

---

## 判定: CONDITIONAL GO

```
GOの理由:
  - 5層の接続経路は全て既存コードの組み合わせで実現可能。新規実装は
    「DOM→Payload集約」と「Payload→legacy形状変換」の2関数のみ
  - 保存パイプライン本体（Runtime/Legacy/Supabase）は無変更のまま接続できる

着手前に必要な決定（1件）:
  - 3節: data-value属性の復元を「UI変更」とみなすか否か。みなさない場合は
    03b着手前の最小修正として先に対応し、みなす場合はAdapter内でテキスト
    lookupを持つ設計に切り替える

既知の制約（03b着手には影響しないが、完了報告時に明記する）:
  - 疾患別チップ（quick/detail）は常に空のまま送信される（4節）
  - experiment_idは値を送らない、または常にnullとして予約するのみ（5節）
```
