# PR-080A — Record Screen DI Scaffold（依存関係監査・DI設計）

> **PR番号:** PR-080A（PR-080とPR-081の間に挿入。既存PR-081〜090は無変更。詳細は
> `docs/LEGACY_REMOVAL_PLAN.md` 10章 Decision Log追補を参照）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 本PRは調査・設計のみ。Business Logic変更・UI変更・Architecture変更・
> Repository変更ゼロ。コード変更なし（`docs/`のみ更新）。

---

## 0. 調査方法

`src/app-legacy.js`（実ファイル、2026-07-03時点10,242行）を直接読み、bare識別子呼び出し・
`window.*` export・共有変数の実際の参照箇所をgrepで機械的に特定した。
`docs/phase4d-legacy-migration-audit.md` の行番号は2026-06-12時点のものでPR-079/080による
行数変化（10,804→10,242）以降ズレているため、本監査では実ファイルの現在行番号を正とする。

---

## 1. Dependency Graph / Call Graph

### 1-A. 対象関数の現在地（実行番号、2026-07-03時点）

| 関数 | 行番号 | window export | 備考 |
|---|---|---|---|
| `saveAndSync` | 1386 | なし（bare専用） | |
| `updateStats` | 2036 | なし（bare専用） | **home-renderer.js に同名の別実装が存在し、そちらは `window.updateStats` を export**（1-C参照） |
| `updateHistory` | 2118 | なし（bare専用） | 空関数（`// 最近の記録セクション削除済み`）— 確定Dead Code |
| `_prevTab`（let） | 3273 | — | `openRecordModal`/`closeModal`専用の共有変数 |
| `closeModal` | 3300 | なし（bare専用） | **record-modal-controller.js に同名の別実装が存在し、そちらが `window.closeModal` を export**（1-C参照）。両者は別物 |
| `saveRecord` | 3379 | なし（bare専用、`window.saveRecord`は一度も設定されない） | PR-080でcurrentRecord bridge撤去済み |
| `editPastRecord` | 3926 | `window.editPastRecord`（3936行目付近でexport） | |
| `buildCalendar` | 5500 | なし（bare専用） | **calendar.js に同名の別実装が存在し、そちらが `window.buildCalendar` を export**（1-C参照） |
| `_bowelCount`（var） | 6493 | — | `openRecordScreen`/`adjustBowelCount`/レコード収集処理が共有 |
| `openRecordScreen` | 5880 | `window.openRecordScreen`（record-three-card.js未ロード時のみ、ガード付き）／`window.openLegacyRecordScreen`（無条件） | 最重要・377行 |

### 1-B. `saveRecord()` / `openRecordScreen()` の bare呼び出し内訳

`saveRecord()`（3379〜3466）が直接呼ぶbare関数:
```
saveAndSync() / closeModal() / updateStats() / updateUnlock() / updateHistory() /
buildCalendar() / updateHomeCTA() / updateHomeCTAState()(typeof guard) /
updateStreakBadge()(typeof guard) / checkAndShowTempAlert()(typeof guard) /
getSuccessMessage()
```

`openRecordScreen()`（5880〜6256）が直接呼ぶbare関数:
```
renderSymptomLayers() / prefillRecordFromModal() / updateRecProgressDots() /
updateDiseaseQuestions() / toggleSympLayer(2|3) / selectTempMethod() /
updateMealParse() / openDayDetail()（buildCalendarのクリックハンドラ経由）
```

これらのうち `updateHomeCTAState` / `updateStreakBadge` / `checkAndShowTempAlert` は
`typeof === 'function'` ガード付きのため、未定義でも例外にならない（安全）。
一方 `saveAndSync/closeModal/updateStats/updateHistory/buildCalendar/updateHomeCTA` は
無条件bare呼び出しであり、**同一ファイルscope内に実体が存在しなければ即例外になる**。

### 1-C. 重複実装の発見（新規・HANDOFF未記載）

以下3関数は **app-legacy.js内のローカル実装** と **別モジュールの`window.*`export版** が
併存している。app-legacy.js内のbare呼び出し（`updateStats()`など）はJSのスコープ規則により
**常にapp-legacy.js自身のローカル実装を呼ぶ**（windowの同名プロパティは無視される）。

| 関数 | app-legacy.js ローカル実装 | 別モジュールの実装 | 現状の呼び分け |
|---|---|---|---|
| `updateStats` | app-legacy.js:2036（bare） | `home-renderer.js:135` export、`window.updateStats`設定（home-renderer.js:482） | app-legacy.js内部のbare呼び出しは常にローカル版。外部から`window.updateStats()`を呼ぶ経路は別途home-renderer.js版を実行 — **2つの独立した実装が並行稼働中** |
| `buildCalendar` | app-legacy.js:5500（bare） | `calendar.js:22` export、`window.buildCalendar`設定（calendar.js:371） | 同上。app-legacy.js内部は常にローカル版（`openDayDetail`等app-legacy.js内のみのDOM構造に依存） |
| `closeModal` | app-legacy.js:3300（bare、`#record-modal`用） | `record-modal-controller.js:29` export、`window.closeModal`設定（同36行目）。ただし中身は`_inlineCloseModal`（app.html inline scriptの実装）へ委譲するラッパー | 全く別物の2実装。app-legacy.js内部のbareは常に自前の`#record-modal`クローズ処理 |

**含意:** `openRecordScreen`/`saveRecord`を物理移動する際、これらのbare呼び出しを
「window版に向ければ良い」という単純な置き換えはできない。app-legacy.js内部の
ローカル実装が持つ副作用（`updateStats`のpainFreeDays計算、`buildCalendar`の
`openDayDetail`クリックハンドラ登録など）が、window版と完全に同一かどうかは
未検証。DI設計（3章）ではこの重複を解消する方向（同一実装への一本化）を提案する。

### 1-D. `updateHistory` は確定Dead Code

```js
function updateHistory(){
  // 最近の記録セクション削除済み
}
```
空関数。物理移動時は呼び出し自体を削除してよい（`LEGACY_REMOVAL_PLAN.md` 2章の
「即削除」対象と同種だが、単独関数のため個別削除はBatch-2系PRで対応可）。

---

## 2. Import Graph

```
main.js
  ├─ import './modules/calendar.js'            (line 42)   → window.buildCalendar 等を設定
  ├─ import './app-legacy.js'                  (line 52)   → 本監査の対象。openRecordScreen等
  │                                                            197関数をwindowへ条件付export
  ├─ import './modules/record-three-card.js'   (line 160)  → window.openRecordScreen を
  │                                                            無条件上書き（3-card優先）
  ├─ import './modules/record-three-card-save.js' (line 165)
  ├─ import './modules/record-modal-controller.js'(line 173) → window.closeModal /
  │                                                            window.openRecordModal を
  │                                                            inline版でラップして再設定
  └─ import './modules/home-renderer.js'       (line 190)  → window.updateStats 等を設定

src/modules/record.js
  └─ import { ... } from './record/save.js'
  └─ import { switchTab } from './tab-navigation.js'
  └─ import { upsertRecord } from './record-upsert.js'
  └─ import { applyRecordToStreakState } from '../../domains/record/record.service.js'
     ※ callExistingFunction() で window[name] 経由の delegate パターンを使用
        （SG-3と同型。DI設計のモデルケースとして採用する）

src/modules/record-input.js
  └─ 外部依存なし（module内部変数 _currentRecord のみ）
     window.saveRecord を呼ぶ箇所あり（nextStep内）が、app-legacy.jsはwindow.saveRecordを
     一度もexportしないため常にno-op（既知のpre-existing bug、HANDOFF記載済み、Scope外）

src/modules/record-three-card.js
  └─ import { buildCheckinSnapshot } from '../utils/checkin-snapshot.js'
     app-legacy.jsへの依存なし（独立実装）

app.html（inline script）
  └─ bottom-nav 記録ボタン（346行目）が window.openLegacyRecordScreen を直接呼ぶ
     （3-D節で詳述、新規発見）
```

**読み込み順序の帰結:** `calendar.js` → `app-legacy.js` → `record-three-card.js` →
`record-modal-controller.js` → `home-renderer.js` の順でロードされるため、
`window.buildCalendar`（calendar.js版）は app-legacy.js の定義より **先に** 設定され、
その後 app-legacy.js 側の `if (typeof buildCalendar === "function") window.buildCalendar = buildCalendar;`
のような行があれば上書きされる可能性がある。実際に該当行が存在するか要確認（3-A節参照）。

---

## 3. Window Export Graph（対象8関数+ 関連）

| window.* | 設定元 | 設定条件 | 現在の実効値 |
|---|---|---|---|
| `window.openRecordScreen` | app-legacy.js:10131（ガード付き）→ record-three-card.js（無条件上書き、main.js:159） | record-three-card.js未ロード時のみapp-legacy.js版が残る | **record-three-card.js版（3-card UI）が最終的に勝つ** |
| `window.openLegacyRecordScreen` | app-legacy.js:10136（無条件） | 常時 | app-legacy.js の `openRecordScreen`（legacy screen-record） |
| `window.editPastRecord` | app-legacy.js:10079（ガード付き、typeof確認のみ） | 常時（関数が定義されている限り） | app-legacy.js版のみ、競合なし |
| `window.saveRecord` | **一度も設定されない** | — | 常にundefined。`record-input.js`の`nextStep()`内`window.saveRecord()`呼び出しは恒常的no-op（既知バグ、Scope外） |
| `window.closeModal` | record-modal-controller.js:36（無条件、app-legacy.js側は非export） | 常時 | record-modal-controller.js版（`_inlineCloseModal`委譲、現状no-op = 既知バグ） |
| `window.updateStats` | home-renderer.js:482（無条件、app-legacy.js側は要確認） | 常時 | home-renderer.js版。app-legacy.js内部のbare呼び出しには影響しない（1-C参照） |
| `window.buildCalendar` | calendar.js:371（無条件、app-legacy.js側は要確認） | 常時 | calendar.js版。app-legacy.js内部のbare呼び出しには影響しない（1-C参照） |
| `window.updateHistory` | 未確認（grep該当なし、恐らく非export） | — | 空関数のため実質無害 |
| `window.saveAndSync` | 未確認（grep該当なし、恐らく非export） | — | app-legacy.js内部専用 |

### 3-A. 未確認事項（Founder/次PRで検証推奨）

`window.buildCalendar` / `window.updateStats` について、app-legacy.js末尾の
アルファベット順exportブロック（10040行目付近）に `if (typeof buildCalendar ...) window.buildCalendar = buildCalendar;`
のような行が存在するかは本監査で確認しきれていない（該当ブロックは200行超の
アルファベット順リストであり、Scope内の8関数に絞って確認した範囲では該当行を
発見できなかった＝おそらく非export）。次PRでの物理移動前に `grep -n "window.buildCalendar\s*="`
で再確認すること。

### 3-D. 新規発見：bottom-nav からの直接到達経路（HANDOFF未記載）

`app.html:346`:
```html
<button class="nav-item nav-record-btn" type="button"
  onclick="state.editingDate=null;
           if(typeof window.openLegacyRecordScreen==='function'){window.openLegacyRecordScreen();}
           else{openRecordScreen();}">
```

このボタンは **`window.openRecordScreen`（3-card版）を経由せず、`window.openLegacyRecordScreen`
（= legacy `openRecordScreen`）を優先的に呼ぶ**。`app.html:360-366`のコメントは
「Home CTA / bottom-nav all use window.openRecordScreen → screen-record-three-card」と
記載しているが、**実際のonclick属性はコメントと矛盾しており、bottom-navの「記録」ボタンは
legacy screen-record（screen-record-three-cardではない）を直接開く**。

これは HANDOFF PR-080 の「到達経路」記載（calendar.js/timeline.js の editPastRecord 経由のみ）
に **加えて存在する第3の到達経路** であり、`openRecordScreen()` が
「Dead Codeではない」という既存判定をさらに強化する（bottom-navボタンは常時表示される
主要導線であり、editPastRecordよりも高頻度で到達される可能性が高い）。

物理移動時はこのonclick属性（app.html側、5-B節のonclick一括置換=Batch-11対象）も
射程に入れる必要がある。ただし本PRはapp.html変更なし（UI変更禁止のため）。

---

## 4. Shared State 監査

### 4-A. `_bowelCount`（var, app-legacy.js:6493）

| 操作 | 箇所 | 内容 |
|---|---|---|
| 初期化 | 6493 | `var _bowelCount = 0;` |
| リセット | `openRecordScreen()` 5929 | 新規記録描画時に `_bowelCount = 0` |
| 復元 | `openRecordScreen()` 6049 | 編集モード時 `_bowelCount = editRec.bowelCount` |
| 更新 | `adjustBowelCount(delta)` 6534 | UI +/- ボタンから呼ばれる |
| 表示 | `openRecordScreen()` 6051, `adjustBowelCount()` 6536 | DOM `#bowel-count-display` |
| 読み取り（保存時） | 7845付近 | `bowelCount: _bowelCount \|\| 0`（レコード収集処理内） |

**結論:** `_bowelCount` は app-legacy.js内で完全に自己完結している（`record-input.js`の
`_currentRecord.symptomDetails[...].bowelCount` は three-card 版の別フィールドで無関係）。
`openRecordScreen` / `adjustBowelCount` / 保存時収集処理（7845付近の関数、要Step5で特定）を
**セットで移動すれば** 外部依存なしで完結する。DI不要、モジュール内部変数化のみで済む
（`record-input.js`の`_currentRecord`パターンをそのまま踏襲可能）。

### 4-B. `_prevTab`（let, app-legacy.js:3273）

| 操作 | 箇所 | 内容 |
|---|---|---|
| 初期化 | 3273 | `let _prevTab = 'home';` |
| 更新 | `openRecordModal()` 3277 | モーダルを開いた時点のactive screenを記憶 |
| 読み取り | `closeModal()` 3302-3303 | モーダルを閉じる際に戻り先タブを復元 |

**結論:** `_prevTab` は `openRecordModal`/`closeModal`（#record-modal用、3-card入力モーダルの
開閉）専用であり、**`openRecordScreen`/`editPastRecord`（screen-record、全画面編集）とは
無関係**。本PRのDI対象（openRecordScreen/editPastRecord）には影響しない。
Scope外として記録するのみ（openRecordModal/closeModalの移動は別Batch）。

---

## 5. DI設計（責務別）

Step2指示に従い **設計のみ** を行う（実装コードは追加しない — 理由は7章参照）。

| # | 責務 | 現状の実体 | 注入先の設計方針 |
|---|---|---|---|
| ① Record Screen責務 | `openRecordScreen`（DOM描画・フォームリセット・編集モード復元） | 新モジュール `record-screen.js`（PR-080B以降で新設）に移動。DOM操作は現状維持（挙動変更禁止） |
| ② Record Save責務 | `saveRecord`（既にPR-080で`RecordInput.getCurrentRecord()`委譲済み） | 同じく新モジュールへ移動可能だが、bare呼び出し先（③〜⑥）を関数引数またはコールバックオブジェクトとして受け取る設計にする |
| ③ Calendar責務 | `buildCalendar`（app-legacy.jsローカル版、1-C参照） | **calendar.js版に一本化**を推奨（重複解消）。DIとしては `deps.buildCalendar` に `calendar.js`の`buildCalendar`をimportして注入。ただし挙動差異の検証が前提条件（8章 Physical Move判定でC区分） |
| ④ History責務 | `updateHistory`（空関数、Dead Code） | DI不要。呼び出し自体を削除してよい |
| ⑤ Statistics責務 | `updateStats`（app-legacy.jsローカル版、1-C参照） | **home-renderer.js版に一本化**を推奨（重複解消、③と同型） |
| ⑥ Modal責務 | `closeModal`（`#record-modal`専用） | `saveRecord`が実際に閉じたいのは`#record-modal`であり、record-modal-controller.js版とは別物。移動先モジュールに`closeModal`実装ごと同梱するのが安全（分離するとID結合が壊れるリスク） |
| ⑦ Shared State | `_bowelCount` | 4-A節の通り、moduleスコープ変数として同梱移動（`record-input.js`の`_currentRecord`パターン踏襲） |

**推奨DIパターン:** `record.js`の`callExistingFunction(name, args)`（window[name]経由delegate、
19-25行目）と同型の「window bridge」を踏襲する。新モジュール側で
```
function _bridge(name) {
  return typeof window[name] === 'function' ? window[name] : function(){};
}
```
のようなヘルパーを用意し、移動後もSG-3（旧実装並行動作期間）を満たしながら
段階的に切り替える。**新規のDIコンテナ/フレームワークは導入しない**（Architecture変更禁止、
既存のwindow bridgeパターンを踏襲するのがConstitution/ARCHITECTURE_V3.md準拠）。

---

## 6. Physical Move 判定

| 関数 | 判定 | 理由 |
|---|---|---|
| `updateHistory` | **A（今すぐ移動可能）** | 空関数。呼び出し削除のみで済む。実質「移動」ではなく「削除」 |
| `_bowelCount` + `adjustBowelCount` | **B（DI後なら移動可能）** | 自己完結だが`openRecordScreen`と同時移動が前提 |
| `saveAndSync` | **B（DI後なら移動可能）** | `window.ensureRecordIds`/`window.saveState`/`window.syncRecordImmediately`は既にwindow経由なのでDI不要。ただし15箇所以上から bare呼び出しされており（1-B節）、app-legacy.js側にも残す必要がある関数のため「移動」ではなく「複製 or 共有module化」が必要 |
| `updateStats` | **C（別PR）** | home-renderer.js版との重複解消（1-C節）が前提条件。単純DIでは済まない |
| `buildCalendar` | **C（別PR）** | calendar.js版との重複解消（1-C節）が前提条件。同上 |
| `closeModal` | **C（別PR）** | `#record-modal`専用の独自実装。record-modal-controller.js版と統合するか、`saveRecord`専用の内部実装として同梱するかの設計判断がFounder承認事項 |
| `saveRecord` | **B（DI後なら移動可能）** | ③⑤⑥の重複解消が完了すれば、DI経由で安全に移動できる |
| `editPastRecord` | **B（DI後なら移動可能）** | 単体では`state.draft`操作とDOM遷移のみで自己完結。`window.openLegacyRecordScreen`呼び出しは移動後も`openRecordScreen`と同一モジュールになれば bare呼び出しに戻せる |
| `openRecordScreen` | **B（DI後なら移動可能）** | 本体は自己完結だが、bare呼び出し先（renderSymptomLayers/prefillRecordFromModal/updateDiseaseQuestions/toggleSympLayer/selectTempMethod/updateMealParse）は未調査（Scope外、Step1では対象外関数として除外）。これらも合わせて移動するかは次PRのStep1で追加調査が必要 |
| `selectTempMethod`/`toggleRsChip`/`selectRsCycle`/`updateRecProgressDots`/`toggleRecordDetails`/`gatherDiseaseData` | **B（DI後なら移動可能）** | HANDOFF記載のPR-081（当時）繰越対象。`openRecordScreen`と同一UI（screen-record）に属するため同時移動が自然 |
| `window.saveRecord`no-op バグ / `window.closeModal`no-op バグ | **D（Legacy最後まで残す＝現状維持）** | HANDOFF記載の既存不具合。修正するか放置するかはFounder判断（本PRでは踏み込まない） |

---

## 7. 本PRでコードを追加しない理由（Decision Log候補）

Step2の指示原文は「DI設計のみ作成する」であり、実装は次段階に委ねている。加えて
AI_EXECUTION.md 5章「推測によるScope外実装は禁止」に照らすと、6章で③⑤⑥を
「別PR」区分と判定した時点で、その区分の関数を跨ぐDIコード（`record-screen.js`等の
新規モジュール）を今追加すると **消費者（呼び出し元）が存在しないコードを先回りで書く**
ことになり、Founderの承認を経ていない物理移動を暗黙に先取りするリスクがある。

よって本PRの成果物は **設計文書のみ**（本ファイル）とし、コード変更はゼロ件とする。
次PR（PR-080B、Founder承認後に番号確定）で、8章の分割案に従い実装に着手する。

---

## 8. PR分割案（PR-080B以降）

`docs/LEGACY_REMOVAL_PLAN.md`の命名規則（PR-080A追補、既存PR-081〜090と非衝突）に従い、
以下の順序を提案する。Founderの承認と番号確定を待つ。

```
PR-080B: updateHistory 呼び出し削除（Physical Move区分A、最小PR）
  ↓
PR-080C: updateStats / buildCalendar の重複解消
  （app-legacy.jsローカル版を削除し、home-renderer.js / calendar.js 版への
  　bare→window bridge化。SG-3の並行動作検証を実施）
  ↓
PR-080D: closeModal（#record-modal専用）の設計確定・実装
  （record-modal-controller.js版との統合可否をFounderが判断してから着手）
  ↓
PR-080E: saveRecord / editPastRecord / openRecordScreen 本体の物理移動
  （selectTempMethod等の周辺関数を含む。PR-080C/Dの重複解消が前提条件）
  ↓
PR-080F: _bowelCount のモジュール内部変数化
  （PR-080Eと同一PRに統合しても良い — Founder判断）
```

各PRのSafety Gate（SG-1〜SG-7）は`LEGACY_REMOVAL_PLAN.md` 6章をそのまま適用する。

---

## 9. 追補（PR-080Bで判明）

`saveRecordScreen()`（app-legacy.js:7875〜、app.html:677 `#save-record-btn`の実際の
保存ハンドラ）は、本監査1章で対象とした`saveRecord()`（record-modal/3-card用、
record-input.jsの`nextStep()`から呼ばれる別関数）とは**別の関数**であり、
`openRecordScreen()`と対になる本来の保存ハンドラだったと判明した。
`saveRecordScreen()`は`updateHomeSummary`/`updateHomeCTA`/`buildHomeWeekRow`/
`updateHomeInsightCard`等、`saveRecord()`より遥かに多くのbare依存を持つ。
PR-080E（物理移動）着手前に`saveRecordScreen()`の依存関係を追加監査すること。
6章のPhysical Move判定・8章のPR分割案は`saveRecordScreen()`を考慮していないため、
その分の対象範囲拡大がある前提でPR-080Eのスコープを見積もる必要がある。

---

## Decision Log 記録用サマリ

```
発見: openRecordScreen/saveRecordの物理移動には、updateStats/buildCalendar/closeModalの
      「app-legacy.jsローカル実装 と 別モジュールwindow.*export版」の重複という、
      HANDOFF未記載の追加課題が存在する。単純なDIでは済まず、重複解消PRが先に必要。
発見: bottom-nav「記録」ボタン（app.html:346）がwindow.openLegacyRecordScreenを
      直接呼んでおり、openRecordScreenはeditPastRecord経由に加えてこの経路でも
      到達可能。app.htmlのコメント（3-card誘導と記載）と実装が矛盾している。
判定: 本PRはコード変更ゼロ（設計文書のみ）。DI Scaffoldの「実装」は次PR
      （PR-080B以降、Founder承認後に番号確定）に委ねる。
```
