# PR-INSIGHTS-RUNTIME-02: Prototype Insights Screen Runtime統合（表示のみ）

Founder Decision（Pattern Calendarは吸収しない、Insights Phaseは
RUNTIME-02→03→04→Browser Verificationの順で継続）を受けて実装。

## 実装した内容

home-next-shell.js / experiment-next-shell.jsと同一パターンで、Prototype
Insights画面の**スクリーン骨格のみ**を追加。データソース接続は一切行わない
（PR-INSIGHTS-RUNTIME-03/04で別途実施）。

### 新規ファイル

- `src/screens/insights-next.html`: Prototype `#screen-insights`相当。
  「今週のハイライト」（confidence-row含む、hidden）・「実験結果サマリー」
  （hidden）・「周期との重なりグラフ」（Premium-locked、静的表示のみ）の
  3セクション
- `src/modules/insights-next/insights-next-shell.js`: Feature flag
  `ippo_insights_ui_v2`（デフォルトOFF）。`renderInsightsNext()`は現時点では
  no-op（データソースがまだ無いため）。到達方法は
  `window.ippoInsightsNext.preview()`のみ（Navigation変更なし、home-next/
  experiment-nextと同一パターン）
- `src/modules/insights-next/insights-next.css`: `src/styles/app.css`の
  既存トークンを直接参照

### 意図的に含めなかったもの

- **Pattern Calendar**: Prototypeの`#screen-insights`には「パターンカレンダー」
  セクションが存在するが、Founder Decisionにより意図的に除外した
  （Calendar/Record/Insight/Patternを横断する情報設計事項のため、
  吸収・新設・廃止いずれもGeneral Release後の独立PRとして扱う）。
  現行`calendar-next.js`は無変更のまま維持

### 変更ファイル

- `src/modules/screen-router.js`: SCREEN_HTMLへ`'insights-next'`を追加登録
- `src/main.js`: `insights-next-shell.js`をimport

## テスト

新規 `tests/modules/insights-next/insights-next-shell.test.js`（4件）:
Feature Flag OFF/ONの検出、`renderInsightsNext()`が画面未マウント時も
例外を投げないこと、データソース未接続の現時点でhighlight/compare領域が
書き込まれないこと。

Regression: `tests/modules/home-next/`・`tests/modules/experiment-next/`・
`tests/modules/insights-next/`で計50件PASS。Build PASS（新規循環chunk
警告なし）。

Browser Verification: 不要（新規スクリーンの骨格追加のみでロジック・
データ接続なし。到達手段もwindow.ippoInsightsNext経由のみで既存Navigation
は無変更）

## Next

PR-INSIGHTS-RUNTIME-03（Read-only ViewModel Adapter）
