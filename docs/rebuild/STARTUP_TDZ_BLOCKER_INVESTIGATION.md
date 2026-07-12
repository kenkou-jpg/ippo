# CURRENT IPPO STARTUP BLOCKER INVESTIGATION
## record-modules TDZ Error × 「はじめる」画面遷移停止

> READ-ONLY調査。コード修正は行っていない。`origin/main`（`b15c6ec`、PR-CI-01/02マージ後・
> 現在のGitHub Pages公開状態と同一コミット）を対象に、一時worktree上でsourcemap付きbuildを
> 行い実測した。worktreeは調査後に削除済み（`ops/recovery-program`への影響なし）。

---

## Executive Summary

症状Aと症状Bは**同一原因である可能性が高い**（未確定の因果関係を含むため「Multiple Causes」寄りの判定、詳細はRoot Cause節）。

`src/modules/record-draft-guard.js:24`が、Rollupのmanual chunk分割によって**別チャンク**（`runtime-guards`）に配置された`LocalStorageAdapter`（`src/adapters/storage/local-storage-adapter.js:6`）をモジュールtop-levelで`new`している。`record-modules`と`runtime-guards`は相互import（`record-modules → runtime-guards → record-modules`）の関係にあり、Rollup自身が毎回のbuildで`Circular chunk`警告を出している。この循環構造の中で、`record-modules`チャンク側のtop-level即時実行が、まだ初期化完了していない`runtime-guards`側の`class`バインディングを参照し、TDZ例外が発生している。

このバグは**2026-06-24（PR-013）から存在する既存の潜在バグ**であり、PR-REC-02/03a/03b/03cおよびPR-CI-01/02とは無関係であることを確認した（詳細は「PR-REC関連変更との関係」節）。

「はじめる」遷移停止との因果関係は、TDZ例外が`main.js`の同期import解決を中断させ、その後に続く約190行分の初期化コード（Supabase/Stripe/Push/Insight Engine/Adaptive Signals/Settings Store初期化/Premium同期/最終boot-ready signal）が一切実行されないことを確認した。これは**強い状況証拠**だが、onboarding完了処理自体（`completeOnboarding()`→`finishOnboarding()`→`shouldShowMain()`）の静的読解では直接の依存関係を確認できず、**最終確認には実ブラウザでのconsole確認が必要**（Founder実施項目として後述）。

---

## Reproduction Result

| # | 確認項目 | 結果 | 根拠 |
|---|---|---|---|
| 1 | Development環境でも再現するか | **未確認・推定「再現しにくい」** | Vite dev modeはRollup chunk分割を経ずネイティブESMで個別配信するため、chunk境界に起因するこの種のTDZは通常発生しない。ただし実機未確認 |
| 2 | Production build + previewでのみ再現するか | **build成果物レベルで確認済み** | 一時worktreeでの`npx vite build`（sourcemap有効化のみ、他は無変更）で、症状Aの原因コードが実在することをbyteレベルで確認した。ブラウザでの実行までは未確認 |
| 3 | キャッシュ・SW無効化でも再現するか | **推定Yes（cache非依存）** | 今回の確認はService Workerもブラウザキャッシュも一切介さない、クリーンな`npm ci`→`vite build`のみで行った。TDZコードそのものがビルド成果物に存在するため、キャッシュの有無に関わらず新規訪問者にも影響する |
| 4 | Feature Flag OFFで再現するか | **Yes（Flag非依存）** | `_isPrototypeViewEnabled()`やPrototype関連コードは`record-draft-guard.js`/`local-storage-adapter.js`の評価パスに一切関与しない。Flag ON/OFFの分岐より前、モジュール読み込み時点で発生する |
| 5 | `?recordUI=prototype`なしでも再現するか | **Yes** | 同上。Prototype Feature Flagの判定コード自体がクエリパラメータを読むのは`record-three-card.js`内であり、TDZ発生箇所とは別モジュール |
| 6 | 未ログイン/ログイン済み両方で再現するか | **未確認（推定: 両方）** | TDZはモジュール評価時点（認証状態と無関係な段階）で発生するため、認証状態に依存しないと推定される。実機未確認 |
| 7 | Console上で最初に発生する例外が本件か | **未確認（実機要）** | 静的解析ではこれが「他の何かの後に起きる二次障害」である証拠は見つからなかったが、実機でのconsole全量確認が必要 |
| 8 | 本件より前に別のwarning/errorが出ていないか | **未確認（実機要）** | 同上 |

---

## First Error Timeline

```
1. app.html が main.js（entry chunk）を <script type="module"> で読み込む
2. main.js の静的import解決が開始（ESM仕様上、main.js自身のtop-levelコードより先に
   全静的importが評価される）
3. record-modules チャンク（main.js:103 の import './modules/record.js' 等、複数の
   /modules/record* ファイルを含む）の評価が開始
4. record-modules チャンク内、src/modules/record-draft-guard.js 相当のコードが
   モジュールtop-levelで `new LocalStorageAdapter()` を実行しようとする
5. LocalStorageAdapter は別チャンク runtime-guards からの import。
   record-modules ⇄ runtime-guards は相互import関係（後述）のため、
   runtime-guards 側の class 定義がこの時点で未初期化（TDZ内）
6. Uncaught ReferenceError: Cannot access 'lo' before initialization
   → record-modules-*.js:131 で例外
7. main.js の残り約190行（supabase/stripe/push/insight-engine/adaptive-signals/
   settings-store初期化/premium同期/ippo:vite-ready dispatch を含む）が
   一切実行されない
```

「本件より前に別のエラーがないか」は実機でのみ確認可能なため、上記は**モジュール評価グラフ上の理論的順序**であり、実際のConsole出力タイムラインとの突合はFounder確認事項とする。

---

## Minified Symbol Mapping

```
minified symbol:  lo  (record-modules チャンク内でのローカル束縛名)
original symbol:  LocalStorageAdapter
original file:    src/adapters/storage/local-storage-adapter.js
original line:    6   (class LocalStorageAdapter extends IStorageService)
imported from:    runtime-guards チャンク（chunk内ローカル名は L、
                   そのchunk内の定義側ローカル名は P。
                   export { ..., P as L, ... } で L としてexport）
evaluated by:      src/modules/record-draft-guard.js:24
                   （var _draftStorage = new LocalStorageAdapter();  — モジュールtop-level）
```

sourcemap（`record-modules-*.js.map` / `runtime-guards-*.js.map`）による`originalPositionFor()`照会で確認済み（推測ではない）。

ユーザー報告の`record-modules-BaZvPIBk.js:131:6494`と、今回のクリーンbuildで得た`record-modules-CmdzFYQz.js:131:6486`は、行番号が完全一致・列番号が8文字差（Supabase環境変数など、build環境固有の埋め込み文字列長の差に起因すると推定）。ハッシュ自体が異なるのは、GitHub Actions側のbuildが`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`をsecrets経由で設定しているのに対し、今回の調査用buildはこれらを未設定（`.env`なし）で行ったため、chunk内の埋め込み文字列（コンテンツハッシュの元）が異なることによる差と考えられる。コード構造・行位置は同一と判断できる。

---

## Import / Evaluation Graph

```
record-modules-*.js（先頭import文、実測）:
  import { ... } from "./runtime-core-*.js";
  import { ... } from "./services-*.js";
  import { ... } from "./ui-home-*.js";
  import { L as lo } from "./runtime-guards-*.js";   ← LocalStorageAdapter

runtime-guards-*.js（先頭import文、実測）:
  import { ... } from "./runtime-core-*.js";
  import { e as me, i as ye, a as ve, p as we } from "./record-modules-*.js";  ← 逆方向
  import { ... } from "./services-*.js";
  import { ... } from "./runtime-control-*.js";
```

`record-modules`は`runtime-guards`から`LocalStorageAdapter`を、`runtime-guards`は`record-modules`から4つのsymbol（`me`/`ye`/`ve`/`we`）をそれぞれimportしている。**双方向の相互import**。

`runtime-guards`側が`record-modules`から受け取る4つのsymbolは、実測の結果**すべて関数呼び出しがfunction本体内**（イベントハンドラ相当のコールバック内）であり、モジュールtop-levelでは呼ばれていないことを確認した。危険な辺（top-level即時参照）は**`record-modules → runtime-guards`の一方向のみ**である。

---

## Circular Dependency Analysis

### A. Circular Dependency（chunkレベル）

```
確認済み: record-modules ⇄ runtime-guards
Rollup自身の警告（毎buildで再現、実測）:
  "Circular chunk: record-modules -> runtime-guards -> record-modules."
```

ソースファイルレベルでは、`record-draft-guard.js → local-storage-adapter.js`は**一方向**（循環していない）。循環は**Rollupのmanual chunk分割によって作られた、chunkレベルでのみ存在する人工的な循環**である。`local-storage-adapter.js`は`vite.config.js`の`manualChunks`ルール（`/runtime/`・`/services/`・`/modules/record`・`/modules/calendar`等の文字列マッチ）のいずれにも該当せず、Rollupの自動チャンク配置に委ねられた結果`runtime-guards`側に配置されている。開発環境で動作する（と推定される）理由: Vite dev modeはRollupのchunk分割を経ないネイティブESM配信のため、この種の「chunk境界での相互import」は本番buildでのみ発生しうる。

### B. Top-Level Execution

確認済みのtop-level即時実行:
```
src/modules/record-draft-guard.js:24
  var _draftStorage = new LocalStorageAdapter();
```
関数でラップされておらず、モジュール評価と同時に実行される。これがTDZ例外の直接トリガー。

### C. Export Order / Re-export

`local-storage-adapter.js`自体はbarrel export（index.js経由の再export）を使っていない。`runtime-guards`チャンクの`export{...,P as L,...}`は単一ファイルまとめのRollup生成コードであり、re-export起因の追加問題は確認されなかった。

### D. Rollup Chunk Split

上記の通り、**D（Rollup Chunk Split）がこの問題の構造的な根本原因**である。`manualChunks`関数が`local-storage-adapter.js`を明示的に分類していないため、Rollupの自動配置アルゴリズムが（他のchunkとの兼ね合いで）`runtime-guards`側に置き、結果として`record-modules`との間に循環を生んでいる。

---

## Onboarding Transition Analysis

```
button click（data-ob-action="complete-onboarding"、app.html:170 / welcome.html:125）
  ↓
src/modules/onboarding-runtime.js（main.js:176 でimport、TDZ発生箇所より前）
  ↓ action === 'complete-onboarding' で completeOnboarding() 呼び出し
completeOnboarding()
  ↓ setState(...{_onboardingDone:true}); saveState();
finishOnboarding()
  ↓ if (!shouldShowMain()) return;   ← shouldShowMain() は onboardingCompleted() を返すのみで、
  │                                     直前にセットしたフラグを読むため、静的読解上はここで
  │                                     ブロックされる根拠は見当たらなかった
  ↓ showScreen('home')   （screen-router.js、main.js:176より前にimport済みと推定）
  ↓ call('updateGreeting') / call('updateStats') / ...
```

**確認できたこと**:
1. `data-ob-action`クリックハンドラの登録コード（`onboarding-runtime.js`）は、main.jsのimport順でTDZ発生箇所（255行目付近）より**前**（176行目）に位置し、静的解析上はハンドラ自体は登録されると推定される
2. `completeOnboarding()`/`finishOnboarding()`/`shouldShowMain()`の実装を読む限り、これら自体がTDZ発生箇所より後の初期化コードに直接依存している証拠は見つからなかった

**確認できなかったこと（推測と事実の分離）**:
3. `showScreen('home')`実行後のHome画面の**実際のレンダリング内容**（`call('updateGreeting')`等が呼ぶ実体関数）が、TDZによって未実行となった初期化（Settings Store初期化・Premium同期等、main.js 390行目付近）に依存しているかどうかは、静的読解のみでは確定できなかった
4. ボタンが「完全に無反応」なのか、「画面遷移はするがHome内容が空/壊れて見える」のかは、実機でのみ判別可能

したがって、TDZ例外と「はじめる」停止の因果関係は**強い状況証拠（同一の初期化シーケンス破壊が起きている）はあるが、直接の1対1因果は未確定**と判定する。

---

## PR-REC関連変更との関係

| 対象 | 関連性 |
|---|---|
| PR-REC-02/03a/03b/03c | **無関係**。変更対象は`prototype/`・`src/modules/record-three-card.js`・`src/screens/record-three-card.html`のみで、`record-draft-guard.js`・`local-storage-adapter.js`・`vite.config.js`のmanualChunksには一切触れていない |
| PR-CI-02の`src/modules/record.js`import修正（`.js`拡張子→拡張子なし） | **無関係と判断**。この修正はPR-CI-02自身の検証時に、修正前後で`dist/`成果物のハッシュ・サイズが完全一致することをgit stash比較で確認済み（vitestの解決設定のみに影響し、vite build自体は修正前から問題なく解決していた）。今回のTDZとは無関係の別ファイル（`record.js`≠`record-draft-guard.js`） |
| `record-draft-guard.js`の`new LocalStorageAdapter()` | commit `95d091a`「feat(pr013): Record Migration Hook」（**2026-06-24**）で導入。PR-REC系・PR-CI系のいずれよりも前 |
| `local-storage-adapter.js`自体 | commit `9fdc61a`「feat(pr011-012): Bootstrap Bridge」で新規作成。同じく既存 |
| `vite.config.js`のmanualChunks | 直近の変更履歴に本調査に関連する改変は確認されなかった |

**結論**: このバグはPR-013（2026-06-24）由来の既存潜在バグであり、直近のPR-REC/PR-CI作業とは無関係。ただし「なぜ今顕在化したか」（常に発生していたのか、他の変更でRollupの自動chunk配置が変化して新たに発生したのか）は、**個別のbuild-by-buildな bisectionが必要**であり、「Repository全体探索は禁止」の制約下では未調査（Not Yet Determined）。

---

## Service Worker / Cache Analysis

今回の再現確認は、Service Worker・ブラウザキャッシュを一切介さない、クリーンな`npm ci` + `npx vite build`のみで行った。TDZの原因コードは**ビルド成果物そのもの**に存在することを確認しているため、これはキャッシュ・chunk mismatch由来の問題ではなく、**真のコードレベルの欠陥**であると判断できる（キャッシュ削除だけでは解決しない）。

ただし、実際にユーザーが遭遇する挙動には、旧chunkを返す stale Service Worker が別途重なっている可能性はゼロではない。`public/sw.js`は`CACHE_VERSION`ベースのキャッシュ命名・`activate`時の旧cache削除を実装しており、構造的には標準的なパターンで、今回の問題の直接原因ではないと判断する。

---

## Root Cause

**Multiple Causes**（Rollup Chunk Evaluation が構造的根本原因、Top-Level Initialization Order が直接トリガー）

```
構造的根本原因: Rollup Chunk Evaluation
  vite.config.js の manualChunks が src/adapters/storage/local-storage-adapter.js を
  明示的に分類していないため、Rollupの自動配置により runtime-guards チャンクに
  混入し、record-modules との間にchunkレベルの循環importを生んでいる

直接トリガー: Top-Level Initialization Order
  src/modules/record-draft-guard.js:24 が、モジュールtop-levelで
  new LocalStorageAdapter() を即時実行しており、循環chunk構造の中で
  評価順序が保証されない場合にTDZ例外を引き起こす
```

`lo`という変数名自体は原因ではなく（指示の通り、minified名を原因と決めつけていない）、上記2点の組み合わせが真因である。

---

## Fix Options

### 案1: `LocalStorageAdapter`のtop-level即時instantiationを遅延化（推奨度: 高）

```
変更ファイル: src/modules/record-draft-guard.js
内容: var _draftStorage = new LocalStorageAdapter(); をモジュールtop-levelから、
      実際に _draftStorage が最初に使われる関数内での遅延初期化
      （lazy getter / 初回アクセス時にインスタンス化するパターン）へ変更
リスク: 低。同一モジュール内で完結し、外部APIの変更なし
Architecture影響: なし
Rollback: 1ファイルのgit revertのみ
```
setTimeoutによる遅延やtry/catchでの握り潰しではなく、「必要になった瞬間に生成する」という構造的な遅延化。禁止事項（dynamic importでの偶然回避・chunk分割設定だけで隠す等）に抵触しない。

### 案2: `manualChunks`で`local-storage-adapter.js`を明示的に分類（推奨度: 中）

```
変更ファイル: vite.config.js
内容: manualChunks関数に src/adapters/ 配下（またはlocal-storage-adapter.js個別）の
      明示的な分類ルールを追加し、record-modules / runtime-guards のどちらか
      片方に確実に属させ、循環そのものを解消する
リスク: 中。他のadapterやchunk構成全体への影響範囲の再確認が必要
        （services⇄runtime-controlの既存循環warningも同種の問題である可能性が高く、
        合わせての見直しが望ましい）
Architecture影響: chunk構成の見直しを伴う
Rollback: vite.config.js 1ファイルのgit revertのみ（ただし全chunkの再ハッシュが
          発生するため、デプロイ後の影響範囲確認は必要）
```

### 案3: DI登録とresolveタイミングの分離（推奨度: 低・本件単体では過剰）

```
変更ファイル: src/modules/record-draft-guard.js、必要ならcomposition-root.js
内容: LocalStorageAdapterの生成をDIコンテナ経由のresolve()に統一し、
      composition-root.assemble()完了後にのみinstance取得可能にする
リスク: 高。record-draft-guard.js は現状DIコンテナを経由しない直接import設計であり、
        これをDI経由に変更するのはこのファイルの設計方針そのものの変更に近い
Architecture影響: 大（Repository Rule全体との整合を再検討する必要）
Rollback: 複数ファイルにまたがるため案1・2より複雑
```

**優先順位の推奨**: 案1（即座に安全に直せる直接トリガーの除去）を先に適用し、案2（構造的根本原因の解消）は`services⇄runtime-control`の既存循環も含めた**別途のchunk構成見直しPR**として、影響範囲を広げすぎない形で切り出すことを推奨する。案3は本件単体では過剰。

---

## Final Verdict

**FIX WITH CONSTRAINTS**

```
理由:
  - Minified symbol → 原コードの対応関係はsourcemapで確定済み（推測ではない）
  - 循環chunk構造・top-level即時実行という2つの直接原因は実測で確認済み
  - PR-REC系・PR-CI系とは無関係な既存バグであることも確認済み
  - 一方、「はじめる」停止との1対1の因果関係は状況証拠に留まり、実ブラウザでの
    console確認が必要（未確定要素が残るため無条件のFIX NOWとはしない）
  - General Release Blocker として扱うべきとの認識に同意する。修正着手前に、
    まず本報告の再現手順で実機確認を行うことを推奨する
```

---

## Founder実施項目（再現手順・確認手順）

```
再現手順:
  1. npm run build && npm run preview でproduction相当を起動
  2. 開発者ツールConsoleを開いた状態でページを新規読み込み（キャッシュ無効化・
     シークレットウィンドウ推奨）
  3. 読み込み直後のConsole出力を全量記録（本件の"Cannot access 'lo'..."が
     最初のエラーか、それより前に別のwarning/errorがないかを確認）
  4. オンボーディングを進め、「はじめる」ボタンをタップ
  5. ボタン自体がクリックとして反応するか（ホバー/アクティブ状態の変化等）を確認
  6. クリック後、Home画面のDOMが実際に切り替わっているか（devtools Elementsタブで
     #screen-home 等の表示状態を確認）と、見た目上のコンテンツが表示されているかを
     切り分けて確認
  7. 上記を Feature Flag OFF（既定）・?recordUI=prototype付き の両方で実施し、
     挙動に差がないことを確認（Prototype Flagとは無関係であることの実地確認）
  8. Service Worker unregister + Cache Storage全削除後にも同一挙動か確認
```
