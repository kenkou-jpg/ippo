# PR-REC-03 Runtime Integration Plan

> **再定義**: PR-REC-03は「Adapter接続PR」ではなく、`prototype/`のRecord UIを
> `app.html`/`src`側の実行時（Vite bundle）へ統合する **Record Screen Runtime
> Integration PR** として扱う。本文書はコード変更ゼロの設計文書のみ。
>
> 関連: `docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md`（Payload設計・
> Confirmed Founder Decisions）、`IMPLEMENTATION_PLAN_V1.md` 出力11（Repository
> Strategy A・Phase 1 Record基盤統合）

---

## 1. `prototype/index.html` 内のRecord関連マークアップの抽出範囲

```
対象: <main class="screen" id="screen-record" data-screen="record" hidden> … </main>
範囲: index.html 193〜309行目

内訳:
  - 193-204: スクリーンヘッダー + record-focus-banner（今週の実験対象バナー）
  - 205-232: カード1「今日の体調」— 気分(emoji-picker) / 睡眠(chip-group) / 肌(chip-group)
  - 234-286: カード1追加分（PR-REC-02実装済み）
      - disease-chip-row（疾患選択時のみ表示チップ）
      - detail-toggle + record-detail-panel（くわしく記録する: 痛み/周期/血塊/おりもの/
        体温/排便/服薬 + disease-detail-symptoms）
  - 235-246: カード2「今日の行動タグ」（tag-grid、caffeine/dairy/sugar/alcohol/exercise/earlysleep）
  - 248-251: カード3「気づきメモ」（memo-input）
  - 253: 送信ボタン #btn-submit-record
```

**注意（ID衝突）**: このブロックの外枠 `id="screen-record"` は、`app.html`側で既に
**別物**として使用されている（後述4）。抽出時はこの外枠idをそのまま持ち込まない。

---

## 2. `prototype/styles.css` 内のRecord関連CSSの抽出範囲

```
Record専用（そのまま移植可能）:
  - .record-focus-banner / .record-focus-icon / .record-focus-label / .record-focus-text
  - .disease-chip-row（+ button / button.selected）          … PR-REC-02追加分
  - .detail-toggle / .record-detail-panel / .detail-field（+ 子要素セレクタ）… PR-REC-02追加分
  - .disease-detail-symptoms .tag-grid button.sensitive       … PR-REC-02追加分
  - .submit-record / .submit-record.submit-success

他画面と共有（抽出時に重複定義を避ける必要あり）:
  - .field-row / .field-name
  - .emoji-picker（Home影響なし、Record専用と確認済み）
  - .chip-group（Onboarding/他画面と共有の可能性を要確認）
  - .tag-grid（Experimentライブラリグリッドと共有 — button.experiment-highlightは
    Record専用ハイライトなので混在に注意）
  - .hint-text / .memo-input / .btn-primary（全画面共有の基礎コンポーネント）
  - .card-cta（Home Insightカードと共有。detail-toggleがこれを流用している）
```

**方針**: 共有クラスは`app.html`側に既存の同名クラスがあれば**そちらを正**とし、
Prototype側の定義と値の差分（色・spacing）がないか1行ずつ diff で確認してから
統合する（Design System Freeze遵守。値が違う場合はどちらを正とするかFounder確認）。

---

## 3. `prototype/app.js` 内のRecord関連イベント・状態管理の抽出範囲

```
状態:
  - STATE.concerns（onboarding由来、疾患選択）
  - STATE.todayRecorded（今日記録済みフラグ、ダミー）

設定:
  - CONCERN_CONTENT（240-271行目、疾患ラベル・onboardingコピー）※Record間接依存
  - DISEASE_DISCLOSURE（277-340行目、PR-REC-02: 疾患別quick/detail症状定義）

関数:
  - dedupeByKey（341-349）
  - renderRecordDiseaseDisclosure（350-383、PR-REC-02）
  - renderRecordFocusBanner（481-488）
  - renderRecordTagHighlight（489-496、進行中Experimentのタグハイライト）
  - renderHomeRecordStrip（571-597、Home側だが「今日記録済みか」を表示 — Record保存の
    結果を読むためRuntime統合では実データ接続が必要）
  - initRecordForm（776-815、emoji-picker/chip-group単一選択・record-tag-grid複数選択・
    detail-toggle開閉・送信ボタンのダミーハンドラ）

いずれも「ダミーデータ + STATE操作のみ」であり、Supabase/localStorage/window.rtcSaveDelegate
等の実行時グローバルには一切依存していない（PR-REC-03以前の時点では isolated static demo）。
```

---

## 4. `app.html` 側で置換するRecord画面の範囲

```
現状（確認済み・コード未変更）:
  - #screen-record（app.html 367行目）: data-legacy-isolated="2026-05-27"、
    data-replacement="screen-record-three-card"。「通常フローはもうここを通らない」
    と明記されたレガシースタブ。中身は record-edit.js の gatherRecordData() ベースの
    フルウィザード（過去日編集 editPastRecord() 専用の副経路として現役、削除禁止）。
  - #screen-record-three-card: app.html には直接存在せず、
    src/screens/record-three-card.html（?raw import）を screen-router.js の
    SCREEN_HTML マップ経由で #screens-container へ遅延注入する（Phase 8方式）。
    これが「今日の記録」の実際のライブ画面。

置換方針:
  - 置換対象は #screen-record（レガシースタブ、削除・改変ともに影響なし）ではなく、
    src/screens/record-three-card.html の**内部マークアップ**とする。
  - 外枠 id="screen-record-three-card" は温存する（screen-router.js の
    ensureScreenLoaded('record-three-card') / window.openRecordScreen /
    ボトムナビ遷移など、既存の参照経路をすべて維持するため）。
  - 内部の rtc-header / rtc-card-1〜3 / rtc-nav / rtc-success 等の構造を、
    Prototypeのカード1〜3マークアップ（本文書1節）に置き換える。
  - #screen-record（レガシースタブ）自体は本PRの対象外（過去日編集の扱いは
    Council文書「Founder Recommendation 5」の未決定事項のまま）。
```

---

## 5. 既存 record-three-card / record-edit / save pipelineとの接続方針

```
現在の実データ保存経路（確認済み）:
  record-three-card.js:_buildPayload()
    → record: { record_date, snapshot, symptomDetails, emotions:{tags,memo},
                adaptiveResponses, meta:{uiFlow,completedAt,checkinSnapshot},
                mood(1-5), sleepQuality(1-5), condition_scale(1-5),
                symptoms(日本語ラベル配列), note, painLevel }
    → _integrateWithExistingSave(payload)
    → window.rtcSaveDelegate(payload)  ※main.js経由でinstallRtcSaveDelegate()済み
    → record-three-card-save.js:_rtcPipelineSave(payload)
         1. upsertRecord(state.records, payload) — state.records[]へ upsert
         2. persistRecordState() — window.saveState() 経由で永続化
         3. notifyRecordUpdated() — Home再描画フック
         4. payload.record_date があれば syncRecordImmediately(savedRecord)
            → supabase.js が user_records テーブルへ即時upsert
         5. 500ms後 syncRecordCloud()（全stateフォールバック同期）

record-edit.js:gatherRecordData() は**別系統**（cycle/temp等、フィールド名が
record.entity.tsとも_buildPayload()とも微妙に異なる）。#screen-record（レガシー
スタブ）＋ editPastRecord()（過去日編集）専用であり、本統合の対象外。

接続方針（本PRで実装予定の内容、今回はコード変更なし）:
  a. Prototypeのカード1/2/3から収集した値を、_buildPayload()と同じキー名
     （record_date, mood, sleepQuality, symptoms[日本語ラベル], note, painLevel,
     emotions.tags, meta.uiFlow 等）にマッピングするAdapterを
     record-three-card.js内（または隣接する新規モジュール）に実装する。
  b. 保存トリガーは既存の _integrateWithExistingSave(payload) →
     window.rtcSaveDelegate(payload) をそのまま呼ぶ。_rtcPipelineSave自体・
     upsertRecord・syncRecordImmediately等は一切書き換えない。
  c. 「行動タグ」（caffeine/dairy/sugar/alcohol/exercise/earlysleep）は
     _buildPayload()の現行スキーマに対応フィールドが存在しない
     （新規ギャップ、下記7参照）。upsertRecord/mergeRecordPreservingExistingは
     キー非依存でマージするため、新規に factors キーを追加しても保存自体は壊れない。
     ただしHome/Insights側がこのキーを読むかは個別確認が必要（Browser Verification
     項目9-4）。
```

---

## 6. window依存・Vite bundle依存の整理

```
現状（確認済み）:
  - prototype/index.html は <script src="app.js"> のみを読み込む完全に独立した
    静的ページ。src/ のどのモジュールもロードしない。
  - window.rtcSaveDelegate / window.getState / window.saveState /
    syncRecordImmediately は app.html が Vite でバンドルする src/main.js
    経由でのみ存在する。prototype/index.html 単体で開いた場合、これらは
    すべて undefined。

含意:
  - PrototypeのRecordマークアップ・CSS・JSロジックは「移植（コピー）」であり
    「参照（import）」ではない。prototype/ 配下のファイルを直接 <script src>
    で app.html に追加する方式は採用しない（グローバル汚染・二重定義リスク）。
  - 移植先は src/screens/record-three-card.html（マークアップ+scoped style）と
    src/modules/record-three-card.js（イベント・状態ロジック）に限定する。
  - DISEASE_DISCLOSURE 等の設定オブジェクトは record-three-card.js 内に
    移植後、STATE.concerns相当の実データ（オンボーディングの選択結果、
    現行の永続化先を要確認）に接続し直す。
```

---

## 7. prototype-payload-mapperとの接続位置

```
現状（確認済み）:
  - domains/record/prototype-payload-mapper.ts（PR-REC-01実装）は
    Prototype Payload → RecordDraft（domains/record/record.entity.ts、
    正規化スキーマ想定の「クリーンな」ドメイン形）へのマッピング。
  - vite build は root直下 domains/*.ts を解決可能（record.js経由の前例あり）
    だが、実際に import する生きたコード経路が現状ゼロのため、
    tree-shakingで本番バンドルには含まれていない（コード形状のみ先行、
    FREEZE-FD-1のgetTierLevel()と同型）。
  - 一方、本PRが実際に繋ぐ先（5節）は record.entity.ts ではなく
    state.records[]（legacy flat schema）であり、フィールド名が異なる
    （menstrualCycle対cycle、temperature対temp 等）。

接続位置（方針）:
  - PR-REC-06（Recordスキーマ一本化）が完了するまでは、
    prototype-payload-mapper.ts は**接続しない**（対象スキーマがまだ
    本番で使われていないため）。
  - 本PR（Runtime Integration）では、5節の「_buildPayload()互換Adapter」を
    別途 record-three-card.js 内に新設する（prototype-payload-mapper.tsとは
    別物。将来PR-REC-06完了後、_rtcPipelineSaveの書込み先が正規化テーブルに
    切り替わった時点で、この新Adapterをprototype-payload-mapper.tsへ
    置き換える一本化PRを別途起票する）。
```

---

## 8. Rollback plan

```
段階的ロールバックが可能な設計とする（record-three-card-save.jsの既存
コメント「main.jsのimportを削除するだけでbypass fallbackに戻る」と同方針）。

  Step 1（マークアップ/CSS）: src/screens/record-three-card.html を
    書き換える場合、旧内容をgit historyに残したまま置換する
    （Append-Only。同一PRでの後戻りはgit revertのみで完結）。

  Step 2（JSロジック）: 新Adapter関数は既存 _buildPayload()/
    _integrateWithExistingSave() を置き換えるのではなく、フィーチャーフラグ
    的な分岐（例: 新カードUIが有効な場合のみ新Adapterを使用）を検討する。
    ただし新規フラグ追加はAI_EXECUTION.md「推測によるScope外実装」を
    誘発しやすいため、フラグを使うか直接置換するかはFounder確認が必要
    （実装前チェック項目とする）。

  Step 3（保存パイプライン）: _rtcPipelineSave / upsertRecord /
    syncRecordImmediately 等は無変更のため、ロールバックの対象にすらならない
    （最大の安全マージン）。

  最終手段: git revert で本PRのコミットを打ち消せば、
    src/screens/record-three-card.html と record-three-card.js は
    旧UIへ即座に復元される（Prototype側ファイルは無変更のまま残るため
    影響なし）。
```

---

## 9. Browser Verification 項目（実装後、Founderが通常ブラウザで確認）

```
9-1. カード1〜3の見た目がPrototypeと同一に見えるか（320/375/390/430px）
9-2. 疾患選択時のみ表示チップ・詳細開示パネル（PR-REC-02実装分）が
     実際のapp.html上でも正しく動作するか
9-3. 「記録する」タップ後、実際に state.records[] へ保存され、
     Supabase user_records テーブルへ即時upsertされるか
     （syncRecordImmediately の発火をNetwork/DevTools等で確認）
9-4. 行動タグ（caffeine等）が保存後、Home/Insightsの表示に反映されるか、
     それとも現状「保存されるが読まれない」フィールドになるか
9-5. 同日再記録で1件に上書き統合されるか（upsertRecordの既存挙動）
9-6. オフライン→オンライン復帰時のsyncPending再送が既存パターンと
     同等に動作するか
9-7. #screen-record（レガシースタブ、過去日編集専用）が本PRの影響で
     壊れていないか（editPastRecord()経路の回帰確認）
9-8. Console Error 0件
9-9. ボトムナビ「Record」タップ→画面遷移・戻る動作に既存との差異がないか
```

---

## 10. 実装PR分割案

```
PR-REC-03a: src/screens/record-three-card.html マークアップ+CSS置換
  （Prototypeカード1〜3の構造をrtc-*要素IDへ移植。JS未接続のためこの時点では
  見た目のみ変化・保存動作は無変更）

PR-REC-03b: record-three-card.js ロジック統合
  （DISEASE_DISCLOSURE等の状態管理をrtc-*要素へ接続。_buildPayload()互換
  Adapterを新設し、_integrateWithExistingSave()経由の実保存に接続）

PR-REC-03c: 行動タグ（factors）フィールドのHome/Insights読み取り確認・
  必要なら最小限の読み取り側対応
  （9-4の検証結果次第でスコープ確定。読まれないだけなら対応不要の可能性もある）

PR-REC-08（既存計画通り）: 全項目Browser Verification一括実施
```

---

## 判定: CONDITIONAL GO

```
GOの理由:
  - 既存のstrangler figパターン（screen-router.jsのSCREEN_HTML ?raw注入）が
    既に確立しており、新規の統合機構を発明する必要がない
  - _rtcPipelineSave / upsertRecord / syncRecordImmediately 等、保存パイプライン
    本体には一切手を入れない設計にできる（ロールバック容易・Blast Radius小）
  - #screen-record（過去日編集専用レガシースタブ）には触れないため、
    その経路への影響はゼロ

条件（着手前に解消すべき事項）:
  1. 「行動タグ」フィールドが現行_buildPayload()に存在しないギャップ
     （6節）をFounderが認識した上で、PR-REC-03cのスコープ（対応する/しない）
     を事前確定すること
  2. 共有CSSクラス（.chip-group/.tag-grid/.card-cta等）のPrototype側定義と
     app.html側既存定義の値diffを、実装前にPR-REC-03a着手時点で必ず取ること
     （Design System Freeze違反の予防）
  3. フィーチャーフラグ方式にするか直接置換にするか（8節Step2）を
     Founderが事前に決定すること
  4. #screen-record-three-cardのSupabase接続確認（9-3）は開発環境の
     Supabaseプロジェクトが必要。実施環境をFounderが指定すること

NO GOにしなかった理由:
  技術的な接続経路・ロールバック手段・影響範囲がすべて特定済みであり、
  「分からないまま進める」要素が残っていないため。残る4条件はいずれも
  「Founderの決定待ち」であって「調査不能」ではない。
```
