# PR-RUNTIME-INTEGRATION-01: Runtime Navigation Integration

前提: `PR-RUNTIME-INTEGRATION-AUDIT`（Runtime到達性監査）により、5画面の
Runtime Screen自体は完成しているが、Home以外の4画面（Experiment/Insights/
Billing/Me）は現行IPPOの通常UI操作からは一切到達できず、
`window.ippoXxxNext.preview()`のconsole操作のみが到達手段だったことが
判明した。本PRはRuntime構造（Router/Shell/Adapter/Application Facade/
Domain/ApiGateway/Repository）を一切変更せず、既存Legacy UIのイベント
ハンドラにFeature Flag分岐を追加することで、**Feature Flag ONの場合のみ
通常操作でRuntimeへ到達できるようにする**。OFF（既定）の場合は既存
Legacy挙動を完全に維持する。

---

## 1. 変更内容

### 1-1. Insights（`src/modules/tab-navigation.js`）

`switchTab('insights', btn)`の先頭に分岐を追加。

```js
if (tab === 'insights' && isInsightsNextEnabled()) {
  await showInsightsNext();
  // nav-item active状態の同期・スクロールリセットは既存switchTabと同様
  return;
}
```

Flag OFF時はこの分岐を通らず、既存の`ensureScreenLoaded`→`showScreen`→
`_wireInsightsScreen()`等のLegacy描画パスがそのまま実行される。

### 1-2. Me（`src/modules/tab-navigation.js`）

`switchTab('settings', btn)`の先頭に同一パターンの分岐を追加。

```js
if (tab === 'settings' && isMeNextEnabled()) {
  await showMeNext();
  return;
}
```

### 1-3. Experiment（`src/modules/tab-navigation.js` `_wireInsightsScreen()`内）

Insights画面「実験提案カード」の2箇所のクリックハンドラ
（`.ipr-exp-card .ipr-card-title`のクリック、`.ipr-exp-btn`のクリック）
それぞれに分岐を追加。

```js
if (isExperimentNextEnabled()) { showExperimentNext(); return; }
if (typeof window.openExperiments === 'function') window.openExperiments();
```

ボトムナビに専用Experimentタブが存在しないため、これがExperiment
Runtimeへの唯一の現実的な通常操作導線。

### 1-4. Billing（2箇所）

**a. `src/modules/premium/premium-lock.js` `premiumGate()`**

非premiumユーザーがロック機能をクリックした際、既存のロックオーバーレイの
代わりにRuntimeへ分岐する分岐を追加（Founder指示「Premium Gateも同じ
ポリシーへ統一」に対応）。

```js
export function premiumGate(callback) {
  if (window.isAdminOrPremium()) {
    callback();
  } else if (isBillingNextEnabled()) {
    showBillingNext();
  } else {
    // 既存のロックオーバーレイ表示（無変更）
  }
}
```

**b. `app.html` 設定画面「アップグレード」ボタン（`settings-upgrade-btn`）**

```html
<!-- before -->
<button ... onclick="showScreen('premium')" id="settings-upgrade-btn">
<!-- after -->
<button ... onclick="(window.ippoBillingNext && window.ippoBillingNext.isEnabled()) ? window.ippoBillingNext.preview() : showScreen('premium')" id="settings-upgrade-btn">
```

`app.html`はESモジュールではないためimportを使えず、既存の
`window.ippoBillingNext`公開APIを利用。`.preview()`は
`initBillingNext(); showBillingNext();`と等価（`isEnabled()`で事前に
ゲートしているため実質`showBillingNext()`と同じ効果）。

### 1-5. Home

変更なし。`home-next-shell.js`の`patchTabNavigation()`が既に
`window.switchTab`をラップして`home`タブを本物のイベント経由で
Runtimeへ接続済み（Flag ON時のみ）。今回の対象外。

---

## 2. Runtime構造・UI・Legacyロジックへの影響

```
Router（screen-router.js）    : 無変更
Shell（各*-next-shell.js）    : 無変更（呼び出し元が増えただけ）
Adapter                        : 無変更
Application Facade             : 無変更
Domain / ApiGateway / Repository: 無変更
UI / デザイン / Prototype       : 無変更（新規ボタン・新規画面の追加なし）
Legacyロジック                 : 無変更（分岐条件がfalseの場合の実行パスは
                                  1文字も変わっていない。premiumGate()の
                                  既存3ブランチ・switchTab()の既存Legacy
                                  分岐はそのまま）
```

追加されたのは「Flag ONの場合にLegacy処理をスキップしてshowXxxNext()を
呼ぶ」という条件分岐のみ。Flag自体は全画面共通で既定OFF・opt-in
（PR-FEATUREFLAG-01で統一済み）のまま変更していない。

---

## 3. モジュール評価順序への影響（安全性確認）

`tab-navigation.js`が新たに`insights-next-shell.js`・`me-next-shell.js`・
`experiment-next-shell.js`をESモジュールとして直接importするため、
これら3ファイルの評価タイミングが`main.js`側の元のimport位置（203〜219行目）
より早まる（`tab-navigation.js`は157行目でimportされるため）。

3ファイルいずれもトップレベルでは
`isXxxNextEnabled()`（localStorage読み取りのみ）と
`window.ippoMarkBootEvent`の型チェック呼び出し、`window.ippoXxxNext`
オブジェクト代入のみを行い、DOM操作・state読み取り・boot完了への依存が
無いことを実装コードで確認済み（home-next-shell.jsについて過去に
PR-OB-01で確認済みの安全パターンと同一）。全テストスイート実行でも
新規失敗が発生しないことを確認した（5節参照）。

---

## 4. テスト

### 新規（`tests/modules/tab-navigation.test.js`、9件）

- Insights: Flag OFF→legacy `showScreen`実行 / Flag ON→`showInsightsNext()`
  実行・legacy不実行 / Flag ON時のnav-item active同期
- Settings(Me): Flag OFF→legacy `showScreen`実行 / Flag ON→`showMeNext()`
  実行・legacy不実行
- Home/Calendarタブ: 今回の分岐が無関係タブに影響しないことの確認
- Experiment Card（タイトルクリック・ボタンクリック）: Flag OFF→
  `window.openExperiments()` / Flag ON→`showExperimentNext()`

### 追加（`tests/modules/premium-lock.test.js`、+3件）

- Flag OFF（既定）: 従来通りロックオーバーレイが開く
- Flag ON かつ非premium: `showBillingNext()`が呼ばれ、オーバーレイは
  開かない
- Flag ON でも`isAdminOrPremium()`がtrue: callbackが呼ばれ
  `showBillingNext()`は呼ばれない（既存の最優先分岐が維持されることの確認）

### 結果

Build: PASS。フルスイート314ファイル中311PASS、5,447件中5,412PASS
（既知3ファイル35件を除き新規失敗ゼロ、+12件は今回追加分すべてPASS）。

---

## 5. Feature Flag確認（変更なしであることの確認）

```
OFF（既定・localStorage未設定） → Legacy（本PRの変更前と完全に同一挙動）
ON（'1'）                      → Runtime（本PRで新たに、通常操作からも到達可能に）
```

Flagの既定値・命名・保存先（localStorage）はいずれも無変更。
`PR-FEATUREFLAG-01`で統一したopt-inパターンをそのまま踏襲。

---

## 6. Browser Verificationとの関係

本PRの完了により、Founderは`window.ippoXxxNext.enable()`でFlagをON
にした後、**実際のタブ操作・ボタン操作**でRuntime Screenへ到達できる
ようになった（従来は`.preview()`を都度呼ぶ必要があった）。

これにより`PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.md`の
「画面遷移」手順は、`.preview()`だけでなく実際のナビゲーション操作でも
再現できる状態になった。ただし本PRはBrowser Verificationを実施しない
（AI_EXECUTION.md 10節）。Founder確認待ちのまま。

---

## Next

本PRはコード変更を伴うため通常のFAST/STANDARD Validationに従うが、
Architecture変更を伴わないためMode: STANDARD（複数ファイル横断だが
Router/Shell/Adapter/Domain等のレイヤー変更なし）。
Decision Log: 更新不要（Roadmap/Architecture/Business/Founder Strategy
変更なし。既存Legacy関数へのFeature Flag分岐追加のみ）。

Founder Browser Verification待ちのまま停止。
