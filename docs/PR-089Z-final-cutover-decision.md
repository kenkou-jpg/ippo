# PR-089Z — Final Cutover 判定（app-legacy.js 削除可否・Remaining Legacy確定）

> **PR番号:** PR-089Z（Legacy Removal Program 最終PR、`docs/LEGACY_REMOVAL_PLAN.md` 4章ロードマップ末尾）
> **Mode:** FULL（Release Risk判定・Legacy Removal最終判断を含むため）
> **実装方針:** app-legacy.js をいきなり削除しない。削除可否を実地・静的の両面から検証し、
> 削除できるものだけ最小差分で削除する。不明・削除不可なものはRemaining Legacyとして記録する。
> Business Logic変更・UI変更・Architecture変更・仕様変更は行わない。

---

## 結論サマリー（先出し）

**`app-legacy.js` は本PR時点では削除不可と判定した。** 理由は本文の通り、app-legacy.js が
「アプリ全体の `window.state` の唯一の提供元」「物理移動済みモジュール群の唯一のwindow export
ハブ」「home cluster / saveRecord / closeModal 系の実働コードの一部」という、単なるレガシー
残骸ではなく**現在も稼働している複数の構造的役割**を担っていることを、静的解析と実行時検証の
両方で確認したためである。

本PRでの`src/app-legacy.js`へのコード変更は**ゼロ**。PR-089F-7E〜7G（前PR群）と同様、
判定・記録のみを行う調査PRとして完了する。

---

## 1. home cluster 6件 — 残す（Remaining Legacy）

PR-089F-7Dで既に実装比較済み（`docs/PR-089F-7D-home-cluster-investigation.md`）。
`buildHomeWeekRow`/`updateHomeInsightCard`/`updateHomeNumbers`/`updateHomeDiseaseAdvice`/
`updateHomeCTAState`/`updateStats`の6件は**全てhome-renderer.js側の実装と実質的な差分あり**
（UI意匠の違い、機能セットの違い、完了判定基準の違いなど）。本PRで追加の実装比較・検証は
行っていないが、7Dの結論を再確認し、Final Cutoverの判断としてもそのまま踏襲する。

**判定: 削除不可。6件とも Remaining Legacy として確定する。** 重複解消（どちらの設計を正とする
か）は本Programのスコープ外の製品判断であり、Founderが別途意思決定するまで両実装を並存させる。

---

## 2. `saveRecord()` — 削除不可（Remaining Legacy・要Founder判断）

PR-089F-7Fで「AMBIGUOUS」と分類した関数。本PRで到達経路を再度突き詰めて確認した。

### 確定した事実
- `saveRecord()`（app-legacy.js内、旧5ステップwizardの最終保存処理）へ到達する唯一の
  設計上の経路は、`record-input.js`の`nextStep()`が呼ぶ`window.saveRecord()`。
- `window.saveRecord`は`src/modules/record.js`が`if (typeof window.saveRecord !== 'function')`
  ガード付きで設定するトレースラッパーのみであり、app-legacy.js自身は一度も
  `window.saveRecord`を設定しない（コードベース全体で確認済み、唯一の代入元は
  `record.js:625`）。
- このラッパーは`callExistingFunction('saveRecord', ...)`で「`window.saveRecord`が
  自分自身と異なる関数の場合のみ委譲する」という自己再帰防止ガードを持つため、
  委譲先が存在せず常にno-op（何もしない）。
- `nextStep()`自体も、`#record-modal`という2026-05-27付けで
  「LEGACY — SOFT-ISOLATED」と明記された、通常フローでは到達不能なモーダル内の
  `#modal-next-btn`からのみ呼ばれる。

### 判定の理由
上記の通り、`saveRecord()`への現行の到達経路は事実上機能していない。しかし:
- `saveRecord()`はレコード保存・ストリーク計算・クラウド同期呼び出し・成功メッセージ表示等、
  実質的なBusiness Logicを保持する大きな関数である。
- 削除するには、これが依存する`RecordInput.getCurrentRecord()`・`buildSteps`/`renderStep`/
  `nextStep`/`prevStep`（bare re-export継続中）・`#record-modal`のHTML自体も連鎖的に
  対象になり得るが、これはUI構造の削除（禁止事項）に該当する。
- 「意図された経路がブリッジ欠落で機能していないだけ」なのか「意図的に廃止されたが
  未整理のまま残っている」のかをコードから断定できない。

**判定: 削除不可。Remaining Legacyとして記録し、ブリッジ修復（`window.saveRecord`を
app-legacy.js側の実装に正しく紐付ける）と、モーダルごと正式廃止（UI変更として別途承認）の
どちらを取るかはFounder判断に委ねる。**

---

## 3. `openRecordModal` / `closeModal` / `saveAndSync` no-op疑惑 — 実機相当検証で確定

PR-089F-7F/7Gで静的解析ベースで疑われていた`record-modal-controller.js`の`_inline*`委譲
パターンのno-op疑惑を、本PRで実行時検証により**確定**させた。

### 検証方法
Chrome拡張機能（`claude-in-chrome`）が本セッション中終始接続不可だったため、実ブラウザでの
クリック検証は実施できなかった。代替として、Node.js + jsdomを用いて
`record-modal-controller.js`を実際にロード・実行し、`window.closeModal()`/
`window.openRecordModal()`/`window.saveAndSync()`の呼び出し結果を直接観測した
（このモジュールが期待する「事前にwindow.closeModal等が設定されている」という前提条件が
現行コードで満たされないことを実行時に再現）。

なお、`app.html`のフルページ実行によるE2E的な検証も試みたが、jsdomは`<script type="module">`
の実行を正式にはサポートしておらず（既知の制約）、`window.switchTab`のような
app-legacy.jsと無関係な関数まで一律`undefined`になったため、この手法は不採用とし、
モジュール単体の直接実行による検証に切り替えた。

### 検証結果
```
BEFORE import — typeof window.closeModal: undefined
AFTER import  — typeof window.closeModal: function
modal classList (before close call): modal-overlay active
modal classList (after  close call): modal-overlay active   ← 変化なし
closeModal() 戻り値: undefined
openRecordModal() 戻り値: undefined
saveAndSync() 戻り値: undefined
```

`record-modal-controller.js`は「Vite module はすべての inline `<script>` 実行後に
ロードされる」という設計コメントの前提を持つが、本PRで`app.html`の実際の`<script>`タグを
確認したところ存在するのは`<script type="module" src="/src/main.js"></script>`の1本のみで、
コメントが想定する「inline `<script>`」は現行コードに存在しない。加えてapp-legacy.js自身も
`window.closeModal`/`window.openRecordModal`/`window.saveAndSync`のいずれも設定しないため、
`_inlineCloseModal`等は常に`null`となり、3関数とも外部から呼ぶと**no-opであることを確定した**。

### 判定
- ユーザー影響のある潜在バグとして確定。ただし到達経路自体が2026-05-27付けでsoft-isolate
  済みの`#record-modal`サブシステムに限定されるため、実際の露出頻度は低いと推定される。
- 修正（`_inline*`キャプチャタイミングの是正、またはapp-legacy.js側での明示的な
  `window.closeModal = closeModal`追加）はBusiness Logic/挙動変更に該当するため、
  本PR（判定PR）のScopeを超える。
- **Release Risk: 中程度の潜在バグとして記録するが、既に到達不能なsoft-isolated領域に
  限定されるため、リリースブロッカーとはしない。** 修正はPR-089Z後続の別チケットで
  Founderが優先度を判断すること。

---

## 4. app.html が app-legacy.js なしで起動できるか — 検証結果: 起動不可

### 検証方法（静的解析）
1. `src/app-legacy.js`に`export`文が一切存在しないことを確認（ゼロ件）。これは
   他のどのファイルもapp-legacy.jsからESモジュールとしてシンボルをimportしていないことを
   意味する。
2. `window.state = state;`（app-legacy.js内、bare `state`変数の初期化＋公開）が、
   コードベース全体で**唯一の`window.state`代入箇所**であることを確認した
   （`src/store/state.js`の設計コメントでも「`window.state`はapp-legacy.jsの仕組み経由で
   `_state`を参照する」と明記されている）。
3. `window._ippoStateHooks`（`state.js`の`setState()`が呼ばれるたびに`window.state`を
   最新化するためのフック配列）への登録も、app-legacy.js内の1箇所のみで行われている。
4. app-legacy.jsが末尾で行う`if (typeof X === "function") window.X = X;`形式の
   window export（約150件超）のうち、少なくとも一部（例:
   `buildComparisonComment`——`cycle-utils.js`からimportされた関数）は、**移動先モジュール
   自身がwindow exportを行っていない**ことを確認した。すなわちapp-legacy.jsの末尾export
   ブロックが、複数の物理移動済みモジュールにとって唯一のwindow公開経路になっている。

### 検証方法(実地・ビルドレベル)
`src/main.js`の`import './app-legacy.js';`を一時的にコメントアウトし（コミットはしていない、
検証後に`git checkout`で復元済み）、`npx vite build`を実行したところ**ビルド自体は成功した**
（app-legacy.js起因の静的import解決エラーはゼロ）。これは(1)の裏付けにはなるが、
「ビルドが通る」ことと「アプリが実際に動く」ことは別問題である。

`vite preview`で配信した「app-legacy.js抜きのビルド」をブラウザ相当環境で起動する検証も
試みたが、Chrome拡張機能が使用不可であったこと、jsdomが`<script type="module">`を
サポートしないことから、フルページでの実行時確認はできなかった。ただし、上記(2)(3)(4)の
静的証拠から、`window.state`が未定義になった時点で、`window.state.records`等を参照する
コードベース中の大多数の機能が即座に破綻することはほぼ確実である。

### 判定
**app.html は現時点で app-legacy.js なしでは起動できない。** 主要因は次の3点:
1. `window.state`の唯一の提供元であること（state.js側の設計もこれに依存している）。
2. 物理移動済みモジュール群の一部にとって唯一のwindow exportハブであること。
3. `initNavIcons`/`initSettingsIcons`（PR-089F-7Eで確認済み・実際にDOMへ反映されているのは
   app-legacy.js側）等、他に委譲先のない実働コードを内包していること。

これを解消するには、(a) `window.state`の所有権をapp-legacy.jsからstate.js側へ正式移管する、
(b) 物理移動済み各モジュールが自身でwindow exportを行うよう改修する、という
**Architecture変更**が必要であり、本PR（および本Programの禁止事項）のScope外である。

---

## 5. app-legacy.js 削除前後の差分 — 実施せず（削除不可のため差分なし）

削除不可の判定に伴い、本PRでは`src/app-legacy.js`への削除・変更は一切行っていない。
参考として、Batch-1(PR-079)開始時点(10,804行)からPR-089F-7G完了時点(2,765行)までに
既に**8,039行(約74%)を物理移動・削除済み**であることをHANDOFFに基づき確認した。
残存2,765行のうち、本PRで確認した「削除不可の実働コード」（home cluster/saveRecord/
closeModal系/window.state管理/window exportハブ/DOMContentLoaded初期化ロジック）が
どの程度の割合を占めるかの行数レベルでの精密な切り分けは、本PRのScope
（Business Logic調査であり、リファクタではない）を超えるため実施していない。

---

## 6. 残す必要のあるLegacy依存 — Remaining Legacy一覧

| # | 対象 | 理由 | 次のアクション |
|---|---|---|---|
| 1 | home cluster 6関数（`buildHomeWeekRow`等） | home-renderer.js版と実装差分あり(7D確定) | 製品判断待ち(重複解消) |
| 2 | `saveRecord()` + 依存する`nextStep`/`prevStep`/`renderStep`/`buildSteps`/`#record-modal` | 到達経路が事実上機能していないが削除は UI/Business Logic変更を伴う | Founder判断待ち(ブリッジ修復 or 正式廃止) |
| 3 | `closeModal`/`openRecordModal`/`saveAndSync`のno-op | `record-modal-controller.js`の`_inline*`パターンの設計前提(inline script)が現行コードに不在 | 別チケットでバグ修正判断 |
| 4 | `window.state`所有権 | app-legacy.jsが唯一の提供元、state.js側への移管はArchitecture変更 | Wave3以降のArchitecture整理候補 |
| 5 | 物理移動済みモジュール群のwindow exportハブ機能 | 各モジュールが自己exportしていないため、app-legacy.js末尾ブロックが実質的な代替経路 | 同上、Architecture整理候補 |
| 6 | `updateSettingsHero`/`closeSuccess` | PR-081時点で既に「統合は製品判断」と確定済み(7G) | 同上 |
| 7 | `window.buildComparisonComment`等、home cluster以外の一部window export | 本PRで存在に気づいたが精査未了(例示のみ、網羅調査は未実施) | 別PRでの棚卸し候補 |

---

## 7. Browser Verification

- Chrome拡張機能（claude-in-chrome）は本PR実施中、繰り返しリトライしたが終始接続不可
  だった。実際のクリック操作によるE2E検証は実施できなかった。
- 代替として、Node.js + jsdomによる**モジュール単体の直接実行検証**を実施し、
  `closeModal`/`openRecordModal`/`saveAndSync`のno-op疑惑を実行時レベルで確定させた
  （3節参照）。
- `app.html`のフルページ実行検証も試みたが、jsdomの`<script type="module">`
  未サポートという既知の制約により断念した（4節参照）。
- **本PRのBrowser Verificationは「モジュール単体の実行時検証」に限定される。
  実ブラウザでのクリック確認は未実施であることを明記する。**

---

## 8. Regression / Build / Architecture Guard / Legacy Guard

- `npx vite build`: PASS（app-legacy.jsを含む通常ビルド。検証用の一時除外ビルドも別途PASS
  したが、これはコミットしていない）。
- `npx vitest run tests/arch/`: 104件 PASS（Legacy Guard = `legacy-removal-pr079-line-count-guard.test.js`
  を含む。本PRでコード変更がないため`BASELINE_LINE_COUNT`(2,765)は不変）。
- `npx vitest run`: 5,193件中失敗39件（既知5ファイルのみ、増加なし）。

---

## 9. Release Risk 判定

**Release Risk: 低〜中。**

- 本PRはコード変更ゼロの判定PRのため、本PR自体によるリリースリスクの新規発生はない。
- ただし、3節で確定した`closeModal`/`openRecordModal`/`saveAndSync`のno-op問題は
  実在するユーザー影響バグであり、将来`#record-modal`サブシステムへの到達経路が
  何らかの理由で復活・再露出した場合（例: handleHomeCTAのfallback条件を誤って
  広げる変更など）、モーダルが閉じられない実害が顕在化する可能性がある。
- `saveRecord()`のno-op状態も同様に、もし旧5ステップwizardへの到達経路が復活した場合、
  ユーザーが記録を保存したつもりで実際には保存されない、という重大な実害につながり得る。
- これら2点は本Programの範囲では「現状維持」が正しい判断だが、**Founderには個別の
  バグ修正チケットとして認識・優先度判断してもらう必要がある**。

---

## 10. Decision Log（候補記録）

本リポジトリには独立したDecision Logファイルは存在しない
（AI_EXECUTION.md 9章に基づき、Legacy Removal判断はDecision Log候補として記録する）。
本書の「6. Remaining Legacy一覧」がDecision Log候補の実体であり、Founderが確認後、
Founder Operating System側のDecision Logへ転記するかどうかを判断すること。

**Decision Log候補の要旨:**
> app-legacy.js（Batch-1開始時10,804行 → 本PR時点2,765行）は、PR-079〜089Fの9次にわたる
> 物理移動で全体の約74%を削減したが、残存部分は「単なるレガシー残骸」ではなく
> 「window.state唯一の提供元」「物理移動済みモジュール群のwindow exportハブ」
> 「home cluster等の実働コード」という構造的役割を担っており、現行アーキテクチャでは
> 完全削除不可と判定した（2026-07-05、PR-089Z）。完全削除には`window.state`所有権の
> state.jsへの正式移管、および各モジュールの自己window-export化という
> Architecture変更が必要であり、Founderの個別承認とWave3以降のスコープ設定を要する。

---

## 11. 結論・Next

- `app-legacy.js`は**削除不可**と判定した。本PRでのコード変更はゼロ。
- home cluster / `saveRecord` / `closeModal`系 / `window.state`所有権 /
  window exportハブ機能を**Remaining Legacy**として確定・記録した。
- `closeModal`/`openRecordModal`/`saveAndSync`のno-op問題は実行時検証で確定させたが、
  修正はBusiness Logic変更に該当するためScope外。別チケット化を推奨する。
- PR-089A〜PR-089F-7Gまでの物理移動プログラムは、本PRの判定をもって
  **一旦の区切り（Final Cutoverの実施は見送り、Remaining Legacyの正式記録に着地）**とする。
- **Next: PR-090 Legacy Exit Audit** — 本PRで確定したRemaining Legacy一覧をベースに、
  Founderが(a) home cluster等の重複解消の製品判断、(b) `window.state`所有権移管の
  Architecture変更承認、(c) no-opバグの修正優先度、を個別に判断した後、それぞれの判断に
  基づく次PRのスコープを設定する。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-089Z |
| **作成日** | 2026-07-05 |
| **権威レベル** | LEVEL-1相当（Legacy Removal Program最終判定、Founder確認待ち） |
| **検証方法** | 静的コード解析(grep全件確認) + ビルドレベル実地検証(import除外build) +
モジュール単体jsdom実行時検証。フルブラウザE2E検証はChrome拡張機能未接続・jsdom制約により未実施 |
| **判定** | app-legacy.js削除不可。Remaining Legacy 7項目を確定。コード変更ゼロ |
