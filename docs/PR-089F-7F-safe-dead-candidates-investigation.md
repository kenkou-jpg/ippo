# PR-089F-7F — SAFE_DEAD候補（icon / openRecordModal / saveRecord / toggleFast）最終判定

> **PR番号:** PR-089F-7F（Batch-11分割⑦-F、`PR-089F-7A`監査のSAFE_DEAD候補分類の一部）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 呼び出し元ゼロを確認できた関数のみ最小差分で削除する。
> 少しでも呼び出し元・window bridgeが残る場合は削除せずAMBIGUOUSとして記録する。
> Business Logic変更・UI変更・Architecture変更は行わない。

---

## 結論サマリー

| 関数 | 判定 | 対応 |
|---|---|---|
| `icon(name, size, color)` | **SAFE_DEAD確定** | 削除 |
| `toggleFast()` | **SAFE_DEAD確定** | 削除（+ 専用importのFAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDEも削除） |
| `openRecordModal()` | **削除不可（現存の呼び出し元あり）** | 現状維持 |
| `saveRecord()` | **AMBIGUOUS（呼び出し経路に断絶があるが、確定Dead Codeとまでは断定できない）** | 現状維持・Founder判断待ち |

---

## 1. `icon(name, size, color)` — 削除

### 所在
`src/app-legacy.js:227`（削除前）

### 確認内容
- 同ファイル内の bare `icon(` 呼び出し: **ゼロ**（`initNavIcons`/`initSettingsIcons`は
  `ICONS[name](size, color)`を直接呼んでおり、本関数を経由しない）
- `window.icon` export: **なし**
- HTML `onclick="icon(...)"`: **なし**（`app.html`/`src/screens/*.html`全件検索）
- テスト参照: **なし**

呼び出し元・window bridge・DOM要素・テストのいずれにも参照がなく、確認済みDead Code。

### 対応
関数定義を削除し、削除理由を示すコメントを残置（PR-080G buildCalendar削除時と同型の記録方式）。

---

## 2. `toggleFast()` — 削除

### 所在
`src/app-legacy.js:1029`（削除前）

### 確認内容
- 同ファイル内の bare `toggleFast(` 呼び出し: **ゼロ**
- `window.toggleFast` export: **なし**
- HTML `onclick="toggleFast()"`: **なし**（HTML内に存在するのは`toggleFastingFeature()`という
  別関数のみ。混同注意）
- 参照DOM要素: 関数内で`document.getElementById('fast-start-btn')`/`'fast-stop-btn'`/
  `'fast-status'`を参照するが、これら3要素IDは`app.html`・`src/screens/*.html`の
  **どこにも存在しない**（現行の断食UIは`#home-fasting-widget`という空コンテナに
  fasting.js側が動的にレンダリングする方式へ置き換え済み）。
- `document.getElementById('fast-start-btn').style.display = 'none';`（1079行目相当）は
  nullガードなしのため、**もし到達したら即TypeErrorになる**実装だった
  （PR-080G `buildCalendar`削除時と同型の「呼び出し元ゼロ + 参照先DOM要素も消滅」パターン）。
- テスト参照: **なし**

### 対応
関数定義を削除。`toggleFast()`のみが参照していた`FAST_PHASE_CONFIG`/`FAST_DISEASE_OVERRIDE`
importも同時に削除（他に参照箇所がないことを確認済み）。関連コメント（55-58行目・
936-937行目・1089-1090行目）を実態に合わせて更新。

---

## 3. `openRecordModal()` — 削除不可

### 所在
`src/app-legacy.js:1354`

### 確認内容
`app.html`の`#record-modal`は2026-05-27付けで「LEGACY — SOFT-ISOLATED」の注記があり
（`app.html:1178-1183`）、「通常フローでは到達不能（handleHomeCTAのfallbackのみ）」と
既に文書化されている。この注記自体が「openRecordModal + buildSteps + renderStep が
app-legacy.js内で無参照であることを確認できたら削除可」という削除条件を明記しているが、
本PRで確認した限り**条件は満たされていない**:

- `src/app-legacy.js:1390`: `window.__ippoLegacyOpenRecordModal = openRecordModal;`
  というPR-089D由来の専用ブリッジが存在し、コメントに「handleHomeCTA（home-renderer.js、
  物理移動済み）のfallback分岐が本ファイル残置のopenRecordModal（SAFE_DEAD版、
  record-modal-controller.jsが優先実装）を明示的に呼び出すための専用ブリッジ」と明記。
- つまり`openRecordModal`は「呼び出し元ゼロ」ではなく、**handleHomeCTAのfallback経路で
  現に参照される専用ブリッジの対象**である。

### 対応
削除しない。現状維持。

---

## 4. `saveRecord()` — AMBIGUOUS（現状維持・Founder確認推奨）

### 所在
`src/app-legacy.js:1447`（削除前の行番号。本PRでの`icon`/`toggleFast`削除に伴い
行番号は前後する）

### 引継ぎメモとの差異について
前回引継ぎでは「`saveRecord`は既にコード内コメントで『確定Dead Code』と明記済み」と
記録されていたが、本PRで該当コメント（現app-legacy.js内、`updateHistory()`直前）を
再確認したところ、**「確定Dead Code」と明記されているのは`saveRecord`自身ではなく
`updateHistory()`である**ことが判明した。正確な原文は次の通り:

> 「PR-080B: 確定Dead Code。saveRecord()内の無条件bare呼び出し2箇所が残るため
> 定義は維持（PR-080Eで対応）。」

これは「`updateHistory`は確定Dead Codeだが、`saveRecord()`内部からの無条件bare呼び出しが
2箇所（1475/1518行目相当）残っているため、`updateHistory`の関数定義自体は削除せず
維持する」という意味であり、`saveRecord`自体をDead Codeと断定する記述ではない。
引継ぎメモの記載は誤読だったため、本PRで訂正する。

### 呼び出し経路の実地確認

1. `src/app-legacy.js`内での bare `saveRecord(` 呼び出し: **ゼロ**（定義箇所のみ）。
2. `window.saveRecord`への代入: app-legacy.js内に**存在しない**
   （`window.saveRecordScreen`という別関数の代入はあるが、これは現行UIの実際の保存ボタン
   `app.html:677`/`src/screens/record.html:319`の`onclick="...saveRecordScreen()..."`が
   使う別実装であり、`saveRecord`とは無関係）。
3. `window.saveRecord`への唯一の代入元は`src/modules/record.js:625`
   （`if (typeof window.saveRecord !== 'function') { window.saveRecord = saveRecord; }`
   — record.js自身のトレースラッパー）。このラッパーは`callExistingFunction('saveRecord', ...)`
   で「`window.saveRecord`が自分自身（`exportedFunctions.saveRecord`）と異なる場合のみ
   委譲する」という自己再帰防止ガードを持つ。app-legacy.jsが一度も`window.saveRecord`を
   設定しないため、このガードは常に「委譲先なし」側に倒れ、実行しても何もしない。
4. `nextStep()`（`src/modules/record-input.js`、旧5ステップwizard最終ステップ）が
   `window.saveRecord()`を呼ぶ設計になっている（`record-input.js:708`）が、上記(3)により
   実質no-op。
5. `nextStep()`自体は`#record-modal`（soft-isolated、上記2節参照）内の
   `#modal-next-btn`からのみ到達するため、そもそも通常フローでは到達しにくい。

### 判定
- コードコメントが直接「Dead Code」と明記しているわけではなく、`saveRecord`は
  レコード保存・ストリーク計算・クラウド同期呼び出し等の実質的なBusiness Logicを
  保持する大きな関数である。
- 一方で、実地確認の結果、現行コードベースには`saveRecord`本体へ到達する有効な経路が
  見当たらない（`window.saveRecord`ブリッジ欠落によりnextStep経由の呼び出しも無効化）。
- この「意図された呼び出し経路はあるが、ブリッジ欠落で機能していない」状態は、
  「単純に無関係になったコード」（`icon`/`toggleFast`）とは性質が異なり、
  「ブリッジ再結線が必要な不具合」なのか「意図的に廃止されたが未削除のまま」なのかを
  コードから断定できない。
- したがって本PRでは削除せず、**AMBIGUOUS**として記録し、Founderの判断
  （ブリッジ修復 or 削除）を待つ。

---

## 5. `openRecordModal`/`saveRecord`と`closeModal`の関係（参考情報・7Gへの申し送り）

`record-modal-controller.js`は`_inlineOpenRecordModal`/`_inlineCloseModal`/
`_inlineSaveAndSync`を「このモジュールがロードされる時点のwindow.openRecordModal/
window.closeModal/window.saveAndSync」としてキャプチャし、それが関数であれば委譲する
薄いラッパーとして設計されている（コメント上は「Vite module はすべての inline
`<script>` 実行後にロードされる」という前提）。

しかし本PRで`app.html`の実際の`<script>`タグを確認したところ、存在するのは
`<script type="module" src="/src/main.js"></script>`の1本のみで、コメントが想定する
「inline `<script>`」は**現行コードには存在しない**。加えてapp-legacy.js自身も
`window.openRecordModal`/`window.closeModal`/`window.saveAndSync`のいずれも設定しない
ため、`record-modal-controller.js`の`_inline*`キャプチャは常に`null`となり、
`window.closeModal()`/`window.openRecordModal()`/`window.saveAndSync()`は
外部から呼ぶと**すべてno-opになっている可能性が高い**。

`closeModal`のno-op疑惑は既にPR-089F-7D調査時点で7Gスコープとして申し送り済みだが、
本PRの調査により`openRecordModal`/`saveAndSync`についても同型の疑惑があることが
判明した。ただし`openRecordModal`/`saveAndSync`自体は本PR（7F）のスコープ外の関数
（`saveAndSync`は7F/7Gいずれの対象リストにもない）であり、`openRecordModal`自体は
上記3節の通り「削除不可」の判定のみ行い、no-op疑惑の深掘りは行わない。
**7G（closeModal担当）実施時に、この`_inline*`パターン全体（closeModal/
openRecordModal/saveAndSync）を一括して確認することを推奨する。**

---

## 6. 結論・Next

- `icon`/`toggleFast`は**確認済みSAFE_DEADのため削除**。関連する未使用import
  （FAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDE）も同時に削除。
- `openRecordModal`は**現存の呼び出し元（window.__ippoLegacyOpenRecordModal
  ブリッジ）があるため削除不可**。現状維持。
- `saveRecord`は**AMBIGUOUS**。引継ぎメモの「確定Dead Code」表記は誤りだったため
  訂正し、実際の呼び出し経路（ブリッジ欠落によるnextStep経由no-op）を記録した上で
  現状維持とする。削除するかブリッジを修復するかはFounder判断が必要。
- `BASELINE_LINE_COUNT`を2,832 → 2,778へ更新（`icon`/`toggleFast`削除 + import整理分。
  実ファイル行数は2,777行だが、テストの`countLines()`は`split('\n').length`のため
  末尾改行分+1され2,778と評価される）。
- `record-modal-controller.js`の`_inline*`委譲パターン（closeModal/openRecordModal/
  saveAndSync）全体にno-op疑惑があることを7Gへ申し送る。
- 7G（updateSettingsHero/closeSuccess/setGraphTab/closeModal/renderPainScale）には
  着手していない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-089F-7F |
| **作成日** | 2026-07-05 |
| **権威レベル** | 実装記録（`docs/PR-089A-legacy-final-cutover-audit.md`・PR-089F-7A監査の補足、引継ぎメモの訂正を含む） |
| **検証方法** | 既存コードの読解・grepによる呼び出し元確認・HTML全件検索。実行時検証（ブラウザ実機確認）は未実施 |
| **判定** | icon/toggleFastは削除。openRecordModalは現状維持。saveRecordはAMBIGUOUSとして現状維持、Founder判断待ち |
