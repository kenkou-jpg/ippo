# PR-ME-RUNTIME-02: Prototype Me画面の表示専用Runtime統合

Founder確認済み方針: Plan Card部分は`billing-next`と重複させず、
「現在のプラン」テキスト＋タップでbilling-nextへ遷移する導線のみとする。

## 実装した内容

home-next-shell.js等と同一パターンで、Prototype `#screen-me`の骨格を
`me-next`画面として追加。Feature Flag `ippo_me_ui_v2`（デフォルトOFF）。

### 含めた要素

- プロフィール欄: アバター・名前・「現在のプラン」（すべて空/hidden、
  PR-ME-RUNTIME-03以降のRead-only Adapter接続まで表示しない）。
  「現在のプラン」ボタンはタップで`showBillingNext()`
  （billing-next画面）へ遷移する導線のみ実装（Plan Card自体は実装しない
  ＝重複回避、Founder確認済み）
- プライバシーカード: Prototype `onboarding-card`と完全同一コピー
  （「あなたの記録は、あなただけが見られます。第三者への共有・公開は
  行いません」）。Consentの同意取得UIではなく既存の安心材料コピーであり、
  同意文言・レベル変更には該当しない
- 設定リスト: 5行（通知設定/データのエクスポート/アカウント/気になる
  ことを変更する/ヘルプ）を静的表示のみで実装。Prototype自身もこれらに
  クリックハンドラを持たない（`btn-review-onboarding`はPrototype専用の
  レビューツールのため対象外）ため、production側でも機能実装は行わない

### 意図的に含めなかったもの（PR-ME-RUNTIME-01の現状確認による）

- **Plan Card 2枚**: `billing-next`と内容重複するため実装せず、遷移導線
  のみとした（Founder確認済み）
- **Research Consent UI**: Prototypeに設計が一切存在しないため対象外
  （PR-ME-RUNTIME-01参照、Founder Decision待ち）
- **preview-block**: 「Founderレビュー用の機能です。本番には含まれません」
  と明記されたPrototype専用ツールのため対象外

### 変更ファイル

- `src/modules/screen-router.js`: SCREEN_HTMLへ`'me-next'`を追加登録
- `src/main.js`: `me-next-shell.js`をimport

## テスト

新規 `tests/modules/me-next/me-next-shell.test.js`（4件）: Feature Flag
OFF/ON、画面未マウント時の安全性、「現在のプラン」ボタンから
`showBillingNext()`が呼ばれることの確認。

Regression: home-next/experiment-next/insights-next/billing-next/me-nextで
計78件PASS。Build PASS（新規循環chunk警告なし）。

Browser Verification: 不要（新規スクリーンの骨格追加のみ。到達手段は
window.ippoMeNext経由のみで既存Navigationは無変更）

## Next

PR-ME-RUNTIME-03/04（プロフィール名・現在のプランのRead-only Adapter接続）。
Research Consent UIはFounder DecisionでPrototype設計方針が決まるまで
このPhaseでは着手しない。
