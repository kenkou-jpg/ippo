# PR-089F-7E — switchTab / initNavIcons / initSettingsIcons 重複実装 事前調査（削除/委譲/現状維持の判定・コード変更ゼロ）

> **PR番号:** PR-089F-7E（Batch-11分割⑦-E、`PR-089F-7A`監査のB. ALREADY_OVERRIDDEN分類の一部）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 本PRは調査・比較・判定のみ。Business Logic変更・UI変更・Architecture変更・
> 物理移動・削除・統合・`BASELINE_LINE_COUNT`更新のいずれも実施しない。
> `src/app-legacy.js` への変更は一切なし。

---

## 0. 背景

PR-089F-7A監査で、以下3関数は「専用moduleが`window.*`を握り、app-legacy.js側は
内部bare呼び出し専用の重複コードとして生存している」B. ALREADY_OVERRIDDENに
分類された。

- `switchTab`
- `initNavIcons`
- `initSettingsIcons`

本PRの指示（app-legacy.js側の重複実装が削除可能か、委譲可能か、現状維持すべきかを
判定する）に従い、3件を実装比較した。

**結論を先に述べると、3件すべてに実質的な差分があり、削除・委譲可能なものはゼロ。
特に `initNavIcons`/`initSettingsIcons` は、実際にDOMへ描画されているのは
app-legacy.js側のローカル実装であり、moduleのwindow export側が事実上デッドコードに
なっているという逆転した状況が判明した。**

---

## 1. `switchTab`

### 所在
- `src/app-legacy.js:1323`（ローカル関数、`window.switchTab`は一切設定しない）
- `src/modules/tab-navigation.js:241`（`export async function`、`window.switchTab`を
  上書き。HTML内`onclick="switchTab(...)"`はグローバルスコープ経由でこちらを呼ぶ）

### window所有権
`window.switchTab`はtab-navigation.js側が唯一設定している
（`docs/legacy-dependency-map.md:195,263`にも既存記録あり）。他モジュール
（`src/modules/record.js:24`、`src/modules/daily-record-card-guard.js:15`）も
`import { switchTab } from './tab-navigation.js'`で明示的にtab-navigation.js版を
参照しており、app-legacy.js版への依存はない。

### 実装比較 — **機能セットが大きく異なる**

| 項目 | app-legacy.js版（bare, 同期） | tab-navigation.js版（`window.switchTab`, 非同期） |
|---|---|---|
| 画面ロード | なし（静的DOM前提） | `ensureScreenLoaded(tab)` — calendar/insights等の動的screen注入 |
| currentScreen同期 | なし | `showScreen(tab)` — welcome-reset-guardとの整合性維持 |
| insights切替 | `switchInsTab`/`renderInsightDiscoveries`をbare呼び出し | `window.switchInsTab`/`window.renderInsightDiscoveries`に加え、
  `renderMonthlySummaryText`/`renderInsClinicalSummary`/`_wireInsightsScreen`/共通ヘッダー描画 |
| home切替 | home cluster 6関数をbare呼び出し（PR-089F-7D調査対象、いずれも差分あり） | 同6関数を`window.*`経由で呼ぶ（home-renderer.js側が実行される） |
| calendar切替 | 未対応 | `buildCalendarNext`/`buildCalendar`呼び出し |
| settings切替 | 未対応 | sp-overlay残留解消・共通ヘッダー描画・`updateSettingsHero`等4関数呼び出し |

### 到達経路の確認
app-legacy.js版switchTabは、同ファイル内`closeModal()`（1379行目）からのみbare呼び出し
される（1382行目 `switchTab(_prevTab, prevBtn)`）。`closeModal`自体は同ファイル内
789/1472/1515行目からbare呼び出しされ、実際に到達し得る。

一方、`window.closeModal`は`record-modal-controller.js`が「起動時点のwindow.closeModal
（=このモジュールロード時点で未定義）」をキャプチャして委譲する薄いラッパーになっており、
app-legacy.jsはこれまで一度も`window.closeModal`を設定していないため、外部から
`window.closeModal()`を呼ぶと実質no-opになる（**PR-089F-7D調査時に既出の疑惑と同一事象。
7Gスコープのため本PRでは深追いしない**）。

つまり app-legacy.js版switchTabは「モーダルを閉じる」という同ファイル内部の
限定的なフローでのみ使われ、tab-navigation.js版よりも機能が乏しい状態のまま
生き残っている。

### 判定
- **同一性:** **別物**。tab-navigation.js版は動的画面ロード・状態同期・
  settings/calendar切替等、app-legacy.js版に存在しない機能を多数持つ。
- **削除可能性:** **削除不可（現状維持）**。app-legacy.js版switchTabを削除すると
  `closeModal`内部の`switchTab(_prevTab, prevBtn)`呼び出しがReferenceErrorになり、
  モーダルクローズ処理自体が壊れる。委譲（tab-navigation.js版をimportして代替）も
  Scope外の挙動変更（非同期化・画面ロード追加）を伴うため本PRでは実施しない。

---

## 2. `initNavIcons`

### 所在
- `src/app-legacy.js:233`（ローカル関数）+ 2693行目で`window.initNavIcons`にも代入
- `src/modules/settings-display-runtime.js:48`（`export function`、
  `window.initNavIcons`を上書き）

### 実装比較 — **注入対象IDが食い違う**

| 項目 | app-legacy.js版 | settings-display-runtime.js版 |
|---|---|---|
| `nav-icon-home` | ○ | ○ |
| `nav-icon-calendar` | **対象外** | ○ |
| `nav-icon-insights` | ○ | ○ |
| `nav-icon-settings` | ○ | **対象外** |
| `nav-icon-plus` | ○ | ○ |
| `home-settings-icon` | ○ | ○ |

`app.html`のbottom navには`nav-icon-home`/`nav-icon-calendar`/`nav-icon-plus`/
`nav-icon-insights`/`nav-icon-settings`の5つの`<span>`が存在する。うち
`nav-icon-calendar`のみHTML側に既にインラインSVGが直書きされており
（`app.html:343`）、JSによる注入がなくても表示は成立する。残り4つは空`<span>`で
JS注入が必須。

### 到達経路の確認 — **window export側が事実上デッドコード**

app-legacy.jsは ES module（`import`文を使用）のため、DOMContentLoaded内の
bare呼び出し`initNavIcons()`（1778行目）は**常にapp-legacy.js自身のローカル
関数（233行目）を実行する**。settings-display-runtime.jsが設定する
`window.initNavIcons`は、コードベース全体を検索しても`window.initNavIcons()`
または裸の`initNavIcons()`として一度も呼び出されていない（HTML内
`onclick`属性にも存在しない）。

つまり実行時に実際にDOMへ反映されるのはapp-legacy.js版のみであり、
`nav-icon-settings`が正しく描画されているのはapp-legacy.js版のおかげである。
仮にapp-legacy.js版を削除し、settings-display-runtime.js版へ処理を委譲した
場合、**`nav-icon-settings`アイコンが空になる退行が発生する**。

### 判定
- **同一性:** **別物（注入対象ID・サイズが異なる）**。
- **削除可能性:** **削除不可（現状維持）**。app-legacy.js版は実際に画面へ
  反映される唯一の実装であり、削除すると設定タブアイコンが消える退行になる。
  settings-display-runtime.js側のwindow export（未使用）を先に整理する話は
  本PRのScope（app-legacy.js側の重複実装判定）の外であり、着手しない。

---

## 3. `initSettingsIcons`

### 所在
- `src/app-legacy.js:249`（ローカル関数）+ 2695行目で`window.initSettingsIcons`にも代入
- `src/modules/settings-display-runtime.js:64`（`export function`、
  `window.initSettingsIcons`を上書き）

### 実装比較 — **サイズ・色が食い違う**

| 項目 | app-legacy.js版 | settings-display-runtime.js版 |
|---|---|---|
| アイコンサイズ | 16px | 15px |
| `settings-icon-density`の見た目 | `ICONS.settings(...)`（歯車アイコン） | `ICONS.barChart(...)`（棒グラフアイコン） |
| `settings-icon-home-info`の色 | `#4a7c5c`（緑系） | `var(--ink-light)`（グレー系） |
| その他13項目 | アイコン種類は同一、色・サイズのみ差分 | 同左 |

対象ID自体は`initNavIcons`と異なりapp-legacy.js版・settings-display-runtime.js版で
一致している（15項目、`settings.html`実DOM上のIDと突合済み）が、見た目のサイズ・
一部アイコン種類・色が異なる。

### 到達経路の確認
`initNavIcons`と同一の構造。app-legacy.jsはES moduleのため、DOMContentLoaded内の
bare呼び出し`initSettingsIcons()`（1779行目）は常にapp-legacy.js自身の
ローカル関数（249行目）を実行し、settings-display-runtime.js側の
`window.initSettingsIcons`はコードベース全体で一度も呼び出されていない。

### 判定
- **同一性:** **別物（サイズ・一部アイコン種類・色が異なる）**。
- **削除可能性:** **削除不可（現状維持）**。実際に画面へ反映されるのは
  app-legacy.js版であり、削除すると設定画面アイコンの見た目が変わる
  （UI変更に該当し、本PRのScope外）。

---

## 4. 結論・Next

- 3件とも**実装差分あり、削除・委譲不可**。
  - `switchTab`: tab-navigation.js版が機能的に上位互換だが、app-legacy.js版は
    `closeModal`内部フローで現に使われており削除するとReferenceErrorになる。
  - `initNavIcons`/`initSettingsIcons`: 通説（module側が新しく正）とは逆に、
    **実際に画面へ反映されているのはapp-legacy.js側のローカル実装**であり、
    settings-display-runtime.js側のwindow exportが未使用というねじれた状態。
    app-legacy.js版を削除すると実際のUIが壊れる。
- 3件とも**削除・委譲・物理移動のいずれも実施しない**（Business Logic変更・
  UI変更・Architecture変更禁止のスコープを遵守）。
- 本PRでの`app-legacy.js`への変更はゼロ（`BASELINE_LINE_COUNT`更新なし）。
- 3件の重複解消（どちらを正とするか等）は製品判断が必要なため、
  **PR-089Z（Final Cutover）**、または別途Founderが判断するタイミングへ持ち越す。
- `closeModal`のno-op疑惑は7Gスコープのため本PRでは触れていない（1節で存在確認のみ記録）。
- 7F（SAFE_DEAD候補）・7G（updateSettingsHero/closeSuccess/setGraphTab/closeModal/
  renderPainScale）には着手していない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-089F-7E |
| **作成日** | 2026-07-05 |
| **権威レベル** | 調査記録（`docs/PR-089A-legacy-final-cutover-audit.md`・PR-089F-7A監査・PR-089F-7Dの補足） |
| **検証方法** | 既存コードの読解・grepによる呼び出し元確認のみ（コード変更・実行時検証は未実施） |
| **判定** | 3件とも実装差分ありのため削除不可・現状維持。重複解消はPR-089Z等へ先送り |
