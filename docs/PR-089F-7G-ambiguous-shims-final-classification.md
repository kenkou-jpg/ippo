# PR-089F-7G — updateSettingsHero / closeSuccess / setGraphTab / closeModal / renderPainScale 最終分類

> **PR番号:** PR-089F-7G（Batch-11分割⑦-G、`PR-089F-7A`監査の残AMBIGUOUS分類の最終処理）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 呼び出し元ゼロ・参照先DOM要素消滅を確認できた関数のみ最小差分で削除する。
> `closeModal`・`updateSettingsHero`は既知の製品判断保留事項のため統合・削除しない。
> Business Logic変更・UI変更・Architecture変更は行わない。

---

## 結論サマリー

| 関数 | 判定 | 対応 |
|---|---|---|
| `updateSettingsHero()` | **既知AMBIGUOUS（PR-081時点で確定済み）** | 現状維持（触れない） |
| `closeSuccess()` | **現役・削除不可** | 現状維持 |
| `setGraphTab(tab, el)` | **SAFE_DEAD確定** | 削除 |
| `closeModal()` | **削除不可 + no-op疑惑あり（PR-089Z送り）** | 現状維持、疑惑を記録 |
| `renderPainScale(v, f)` | **SAFE_DEAD確定** | 削除 |

---

## 1. `updateSettingsHero()` — 現状維持（既知AMBIGUOUS）

### 所在
`src/app-legacy.js`（`isAdminOrPremium`/`updatePremiumBadges`呼び出し近傍）+
`src/modules/settings-display-runtime.js`

### 既存コメントによる確定済み判断
app-legacy.js側に本PR以前から以下のコメントが既にあり、**PR-081時点で「統合は製品判断が
必要なためScope外」という判断が確定・文書化済み**:

> 「PR-081: settings-display-runtime.js に同名の別実装（window.updateSettingsHero、
> initSettingsPanels()呼び出しを追加で行う）が既に存在し、load順（後着ロード）で
> window.updateSettingsHero は常にそちらに上書きされる。premium-lock.js へ移動した
> updatePremiumBadges() 内の bare 呼び出しは本ローカル実装（initSettingsPanels非呼び出し）を
> 維持する必要があるため、専用ブリッジを設ける（挙動変更なし、PR-080E
> window.__ippoGetBowelCount と同型パターン）。updateSettingsHero 自体の重複解消は
> 製品判断が必要なため本PRのScope外（PR-080C/PR-080G と同型の判断）。」

`window.__ippoLegacyUpdateSettingsHero = updateSettingsHero;` という専用ブリッジが存在し、
`tests/modules/premium-lock.test.js`にも
「calls window.__ippoLegacyUpdateSettingsHero (not the settings-display-runtime.js
window.updateSettingsHero)」というテストがあり、**現に実行される・テストされている
コード**であることを確認した。

### 判定
削除・統合しない。引継ぎ指示どおり、本PRでは一切触れていない。

---

## 2. `closeSuccess()` — 現状維持（現役コード）

### 所在
`src/app-legacy.js`（`getSuccessMessage`直後）

### 確認内容
```js
function closeSuccess() {
  if (window.__ippoSuccessOverlayTimer) {
    clearTimeout(window.__ippoSuccessOverlayTimer);
    window.__ippoSuccessOverlayTimer = null;
  }
  var overlay = document.getElementById('success-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.opacity = '';
  }
}
```

- `app.html:1211`: `<button class="success-close" onclick="closeSuccess()">閉じる</button>`
  という実際のHTML onclickが存在する。
- この`#success-overlay`は、PR-089F-7Fで調査した「LEGACY — SOFT-ISOLATED」ブロック
  （`#record-modal`、2026-05-27付け）の**外側**にある独立したDOM要素であり、
  soft-isolated指定を受けていない。
- `#success-overlay`は旧`saveRecord()`（app-legacy.js内、7F調査でAMBIGUOUSと判定）だけでなく、
  現行の実際の保存ボタン（`app.html:677`の`saveRecordScreen()`）が呼ぶ成功時フローからも
  `classList.add('active')`される想定の共有UI要素であり、`closeSuccess()`は
  そのオーバーレイを閉じるための現役ハンドラである。

### 判定
削除不可。現状維持。

---

## 3. `setGraphTab(tab, el)` — 削除

### 所在
`src/app-legacy.js`（削除前、`shareApp`/`addToHome`移動コメント直後）

### 確認内容
- 同ファイル内の bare `setGraphTab(` 呼び出し: **ゼロ**
- HTML `onclick="setGraphTab(...)"`: **なし**（`app.html`/`src/screens/*.html`全件検索）
- 参照DOM要素 `.sg-tab` / `#graph-overlay` / `.sg-title` / `.demo-overlay-sub`:
  **現行のどのHTMLにも存在しない**
- テスト参照: **なし**
- `window.setGraphTab`への代入は本ファイル末尾のexportブロックに1行存在するのみ
  （`if (typeof setGraphTab === "function") window.setGraphTab = setGraphTab;`）で、
  これを呼び出す側は存在しない。

呼び出し元ゼロ + 参照先DOM要素も消滅という、PR-080G `buildCalendar`・本PR-089F-7F
`toggleFast`と同型のパターンで確認済みDead Code。

### 対応
関数定義と対応する`window.setGraphTab`のexport行を削除。

---

## 4. `closeModal()` — 削除不可、no-op疑惑をPR-089Z送りとして記録

### 所在
`src/app-legacy.js`（`openRecordModal`直後）+ `src/modules/record-modal-controller.js`
（`window.closeModal`を上書き）

### 到達経路の確認

app-legacy.js側のローカル`closeModal()`は、同ファイル内の3箇所からbare呼び出しされている:

1. 788行目付近: キーボード等のグローバルハンドラ内、`rm.classList.contains('active')`
   ガード付き（`rm`は`#record-modal`要素）。
2. `saveRecord()`内（編集モード分岐、1418行目相当）。
3. `saveRecord()`内（新規保存分岐、1461行目相当）。

これら3箇所はいずれも「PR-089F-7Fでソフトアイソレート済みと確認した`#record-modal`
サブシステム（`openRecordModal`のfallback経由でのみ開く）」の内部処理であり、
**ES moduleのスコープ規則によりbare呼び出しは常にapp-legacy.js自身のローカル実装を
指す**ため、このサブシステムが稼働する限りにおいては正しく機能する
（`closeModal()`削除は、この内部フロー全体を壊すため実施できない）。

一方、`app.html:1184`の`<div class="modal-overlay" id="record-modal" onclick="closeModal()"
...>`（オーバーレイ背景タップで閉じる用のonclick）は、HTML属性のため**グローバルスコープ
経由で`window.closeModal`を呼ぶ**。この`window.closeModal`は
`record-modal-controller.js`が以下のパターンで上書きしている:

```js
// Vite module はすべての inline <script> 実行後にロードされる想定で、
// window.closeModal が既存の「inline実装」を指していることを前提に薄く委譲する設計。
const _inlineCloseModal = typeof window.closeModal === 'function'
  ? window.closeModal
  : null;

export function closeModal() {
  if (typeof _inlineCloseModal === 'function') {
    return _inlineCloseModal.apply(this, arguments);
  }
}
window.closeModal = closeModal;
```

本PRで`app.html`の実際の`<script>`タグを確認したところ、存在するのは
`<script type="module" src="/src/main.js"></script>`の1本のみで、コメントが前提とする
「inline `<script>`」は現行コードに存在しない。加えてapp-legacy.js自身も
`window.closeModal`を一度も設定しないため（コードベース全体を検索して確認済み、
唯一の代入元は`record-modal-controller.js`自身）、`_inlineCloseModal`は常に`null`となり、
**外部から`window.closeModal()`を呼んでも何も起きない（no-op）**。

つまり、`#record-modal`のオーバーレイ背景をタップして閉じようとした場合、
`window.closeModal()`が呼ばれるが実際には何も起きず、モーダルが閉じないという
**ユーザー影響のある潜在バグの疑いが強い**。ただし:

- このモーダル自体が2026-05-27付けで「通常フローでは到達不能（handleHomeCTAの
  fallbackのみ）」とsoft-isolate済みであるため、実際にユーザーがこの画面に到達する
  頻度は極めて低いと推測される。
- 実行時のブラウザ検証は本調査では未実施（コード読解のみ）。

### 判定
- app-legacy.js側のローカル`closeModal`は内部フローで現に使われているため**削除不可**。
- `window.closeModal`のno-op疑惑は、`closeModal`自体の削除・統合とは別の問題
  （バグ修正）であり、Business Logic変更に該当するため本PR（調査のみ）のScopeを超える。
- **修正はPR-089Z、または別途Founderが優先度を判断するタイミングへ持ち越す。**
  引継ぎメモの指示通り、本PRでは削除・統合いずれも実施していない。

### 補足: openRecordModal/saveAndSyncも同型の疑惑あり（PR-089F-7Fより申し送り再掲）
PR-089F-7Fの調査で、`record-modal-controller.js`は`window.openRecordModal`/
`window.saveAndSync`についても同じ`_inline*`キャプチャパターンを使っており、
同様にno-opになっている可能性が高いことを確認済み（前PRの申し送り事項）。
`closeModal`単体の問題ではなく、`record-modal-controller.js`の`_inline*`委譲パターン
全体（3関数）に共通する設計上のギャップである可能性が高いため、PR-089Zでは
3関数まとめて確認することを推奨する。

---

## 5. `renderPainScale(v, f)` — 削除

### 所在
`src/app-legacy.js`（削除前、`initSettingsIcons`直後）

### 実装
```js
function renderPainScale(v,f){return typeof window.renderPainScale==='function'?window.renderPainScale(v,f):''; }
```

`window.renderPainScale`（実体は`src/modules/pain-scale.js`が提供）への委譲のみを行う
薄いshimだったが、この**ローカル関数自身をbareで呼ぶ箇所が同ファイル内に一切ない**
ことを確認した。

### 確認内容
- 同ファイル内の bare `renderPainScale(` 呼び出し: **ゼロ**
- `window.renderPainScale`への代入: app-legacy.js側には**存在しない**
  （実際の代入元は`src/modules/pain-scale.js:32`の`window.renderPainScale = renderPainScale;`）
- HTML onclick等での参照: **なし**
- テスト参照: `tests/modules/record-input-b1-5.test.js`は存在するが、これは
  `record-input.js`側の`_renderPainScale()`（`window.renderPainScale`を直接参照する
  別実装）を対象としたテストであり、app-legacy.js側のローカル`renderPainScale`とは無関係。

呼び出し元ゼロが確認できたため、PR-089F-7A/7Cで「調査のみ・変更なし」と保留されていた
本関数を確認済みDead Codeとして削除する。

### 対応
関数定義を削除。実体（`window.renderPainScale`）は`pain-scale.js`側にそのまま残るため
挙動への影響はない。

---

## 6. 結論・Next

- `setGraphTab`/`renderPainScale`は**確認済みSAFE_DEADのため削除**
  （`setGraphTab`は対応する`window.setGraphTab` export行も削除）。
- `updateSettingsHero`は**PR-081時点の既知AMBIGUOUS判断を踏襲し、現状維持**（触れていない）。
- `closeSuccess`は**現役コードのため現状維持**。
- `closeModal`は**app-legacy.js内部フローで現に使われるため削除不可、現状維持**。
  ただし`window.closeModal`（および同型の`window.openRecordModal`/`window.saveAndSync`）が
  `record-modal-controller.js`の`_inline*`キャプチャ失敗によりno-opになっている疑いが強く、
  ユーザー影響のある潜在バグとして**PR-089Zへ申し送る**（本PRでは修正しない）。
- `BASELINE_LINE_COUNT`を2,778 → 2,765へ更新（`setGraphTab`/`renderPainScale`削除分）。
- これでPR-089F-7A監査で分類された全項目（7B〜7G）の処理が完了した。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-089F-7G |
| **作成日** | 2026-07-05 |
| **権威レベル** | 実装記録（`docs/PR-089A-legacy-final-cutover-audit.md`・PR-089F-7A監査・
PR-081既存コメント・PR-089F-7D/7F申し送りの補足） |
| **検証方法** | 既存コードの読解・grepによる呼び出し元確認・HTML全件検索。実行時検証
（ブラウザ実機確認）は未実施 |
| **判定** | setGraphTab/renderPainScaleは削除。updateSettingsHero/closeSuccess/closeModalは
現状維持。closeModalのno-op疑惑はPR-089Zへ申し送り |
