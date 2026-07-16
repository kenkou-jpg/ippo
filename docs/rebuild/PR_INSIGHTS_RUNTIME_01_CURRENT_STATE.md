# PR-INSIGHTS-RUNTIME-01: Insights Phase現状確認 + forbidden-word-validator接続

対象: IMPLEMENTATION_PLAN_V1.1 Phase4（Prototype Insights）着手前の現状確認。
副産物として、確認中に見つかった低リスク・高確度のギャップ
（forbidden-word-validator未接続）を、PR-HOME-01と同じパターンで解消した。

## 1. 現状確認

- 現行Insights画面（`src/screens/insights.html`、1205行）は「PRO Insight
  静かな呼吸UI v4」という独自デザイン言語（青紫系 `#18245a`/`#8b7fd6`）で、
  Prototype（Soft Sakuraパレット: rose/plum/gold/sage/ink）とは配色が
  一致していない。Home（home-next）・Experiment（experiment-next）は
  既にPrototypeへ視覚統合済みだが、Insightsはまだ手つかず
- 描画ロジックは`src/modules/insights-dynamic-renderer.js`
  （`renderInsightsDynamic()`）に集約されている（484行、ファイルサイズは
  home-next一式より小さく把握しやすい）
- **confidence表示は既に統一済みと確認**: `_renderSampleBadge()`が
  `insight.confidenceLabel`（4段階: high/medium/low/insufficient、
  `stats-utils.js`の`confidenceLabel()`と同一語彙）を使用している。
  Home側で本セッション中に行ったconfidenceLabel統一（PR-HOME-INSIGHT-
  CONFIDENCE）と同じ語彙が、Insights側では元々使われていた
- **Pattern Calendarは未実装**: `src/`全体を検索しても
  パターンカレンダー相当の実装は存在しない。既存計画文書
  （`docs/IMPLEMENTATION_PLAN_V1.md` 出力17）に「Calendar機能
  （calendar-next.jsの月齢計算等）の行き場（Insightsのパターンカレンダーへ
  吸収 or 別枠維持）」が**未解決のFounder Decision**として記載されており、
  `calendar-next.js`（既存の独立したCalendar画面）が今も存在する。
  この吸収方針が決まらないまま実装を進めると手戻りリスクが高いため、
  Pattern Calendarの着手はこのPRでは見送った
- **forbidden-word-validator（BD-038）は未接続だった**: ファイル冒頭の
  コメントに「禁止語: 異常・危険・深刻・悪化しています・問題があります」
  という申し合わせは記載されていたが、実行時に`forbidden-word-validator.js`
  （BD-038 SSOT）を呼ぶコードは存在しなかった。Home側は本セッション中の
  PR-HOME-01で既に接続済みだったため、Insights側だけが取り残されていた

## 2. 実施したこと（forbidden-word-validator接続）

`src/modules/insights-dynamic-renderer.js`:
- `_safeText(text)`ヘルパーを追加。`validateOutput(text, false)`を通し、
  BD-038違反時は`null`を返す（呼び出し元は元々null時のフォールバック表示を
  持つため、呼び出し側のロジック変更は不要）
- `_signalText(sig)` / `_recentChangeText(sig)`（signalデータの
  trigger/symptom/avgをテンプレートへ埋め込む2つの生成関数。
  `_renderMainInsight`/`_renderHints`/`_buildDiseaseContent`
  〈Disease Tabカード〉の3箇所すべてから呼ばれる共通経路）の返り値を
  `_safeText()`経由に変更。生成関数側で検証することで、呼び出し箇所ごとに
  個別対応する必要がなくなった
- `_renderMainInsight()`のengine insight（`window.ippoInsightEngine`由来の
  `top.main`/`top.sub`）にも同様に`_safeText()`を適用

EXP_MAP（実験提案の固定文言）・Layer1疾患別デフォルト文言・低データ時の
固定フォールバック文言など、完全に静的なコピーは対象外とした
（PR-HOME-01と同じ判断基準: 動的に生成される文言のみを検証対象とする）。

## 3. テスト

新規 `tests/modules/insights-dynamic-renderer.test.js`（10件）:
`_safeText`の正常系/禁止パターン検知/null安全性、`_signalText`の
テンプレート生成/未知id/sig.trigger等への禁止パターン混入時のブロック、
`_recentChangeText`の同様のケース。

Regression: `tests/modules/`・`tests/domains/signal-insight/`で29ファイル中
27ファイルPASS（失敗2ファイルは`build-draft-from-ui.test.js`/
`save-record-screen.test.js`、`record.service.js`import解決エラーに起因する
既知の事前失敗、無関係と確認済み）。Build PASS。

Browser Verification: 不要（表示テキストの内容は変わらない想定 — 現在の
テンプレート・EXP_MAPはいずれも禁止パターンを含まないため、通常操作では
挙動に変化がない。違反時のみnullへフォールバックする防御的な変更）

## 4. Next

Pattern Calendarの着手には、`calendar-next.js`の扱い（Insightsへ吸収する
かどうか）についてFounder Decisionが必要。それ以外のInsights Phase作業
（Prototype配色への視覚統合等）は、Home/Experimentで確立した
「scoped token」「小さいPRへの分割」パターンを踏襲できる見込み。
