# PR-BILLING-RUNTIME-02: Prototype Premium/Pro画面の表示専用Runtime統合

Founder Decision（Home/Experiment/Insightsと同じRead-only→Read接続→
Founder Decision待ちパターンを維持、価格変更を伴わない範囲のみ自走）に
沿って実装。

## 実装した内容

home-next-shell.js等と同一パターンで、Prototypeの**Premium/Pro画面骨格**を
追加。Subscription状態のRead接続・Checkout接続は一切行わない（PR-BILLING-
RUNTIME-03/04で別途実施、Checkout自体はFounder Decision待ち）。

### スコープの決め方

Prototypeの実際の構造では、Premium/Pro案内は独立画面ではなく
「Me画面（`#screen-me`）内のplan-card 2枚 + 共有modal-backdrop」として
実装されている。現行production側には「Me」に相当する新画面
（`me-next`）がまだ存在しない（Phase 6の対象、今回のスコープ外）ため、
本PRではPremium/Pro部分のみを独立した`billing-next`画面として切り出した
（home-next/experiment-next/insights-nextと同じ画面シェルパターンを踏襲）。
Me画面が実装された時点で、この画面をMe側から呼び出す形に統合する想定
（現時点では`window.ippoBillingNext.preview()`が唯一の到達手段）。

### 新規ファイル

- `src/screens/billing-next.html`: Prototype `#screen-me`のplan-card-premium
  / plan-card-pro 2枚（コピー完全一致）+ 詳細モーダル用の
  `#bln-modal-backdrop`/`#bln-modal-sheet`（空、shell.js側でPrototype
  `openModal()`と同一コピーを注入）
- `src/modules/billing-next/billing-next-shell.js`: Feature flag
  `ippo_billing_ui_v2`（デフォルトOFF）。モーダルの開閉（`data-bln-open`/
  `data-bln-close`）はイベント委譲で実装、Prototypeの
  `openModal()`/`closeModal()`と同等の純粋なUI操作のみ。モーダル内の
  「Premiumにする」「Proにする」CTAは`disabled`固定・ラベルも
  「（準備中）」と明示し、押しても何も起きない。「あとで」は動作する
  （閉じるのみ）
- `src/modules/billing-next/billing-next.css`: `src/styles/app.css`の
  既存トークンを直接参照

### 変更ファイル

- `src/modules/screen-router.js`: SCREEN_HTMLへ`'billing-next'`を追加登録
- `src/main.js`: `billing-next-shell.js`をimport

### 禁止事項の遵守確認

```
✓ Feature FlagはデフォルトOFF
✓ 表示のみ（現在のプラン状態等の動的描画は未実装、RUNTIME-03以降）
✓ Checkout未接続（モーダルCTAはdisabled、既存startStripeCheckout()は
  一切呼ばれない。テストで確認済み）
✓ Stripe未変更・商品価格未変更（コード上に価格情報を一切含めていない。
  Prototype自体が価格非表示のため、そもそも変更しようがない）
✓ Subscription状態の書込みなし
✓ 現行課金UI（pro-feature.html/pro-hub.html/premium-lock.js等）に影響なし
  （無変更）
✓ 既存DOM・CSSと衝突しない（`bln-*`プレフィックスで完全に隔離、
  #screen-billing-nextスコープ）
✓ Prototypeのコピー・カード構成を維持（plan-tagline・plan-list項目・
  モーダル文言すべて完全一致）
```

## テスト

新規 `tests/modules/billing-next/billing-next-shell.test.js`（7件）:
Feature Flag OFF/ON、画面未マウント時の安全性、Premium/Proモーダルの
開閉、「あとで」での正常クローズ、CTAがdisabledでCheckoutへ未接続である
ことの確認（`window.startStripeCheckout`が呼ばれないことを明示的に検証）。

Regression: home-next/experiment-next/insights-next/billing-nextで
計65件PASS。Build PASS（新規循環chunk警告なし）。

Browser Verification: 不要（新規スクリーンの骨格追加のみ、Checkout・
Subscription接続なし。到達手段もwindow.ippoBillingNext経由のみで既存
Navigationは無変更）

## Next

PR-BILLING-RUNTIME-03（Read-only ViewModel Adapter）。'premium'状態は
実データが存在しない（現行`getTierLevel()`は'free'/'pro'のみ）ため、
表示用fixtureまたは明示的な「未接続」状態として隔離し、実運用データとして
偽装しないこと（PR-BILLING-RUNTIME-01調査で確認済みの制約）。
