# PR-BILLING-RUNTIME-01: Premium / Pro現状確認

対象: Premium/Pro Phase着手前の現状確認。コード変更なし（調査のみ）。

## 1. 現在のSubscription/Billingの正実装

- `src/modules/premium/premium-service.js`: **Premium状態のSSOT**。
  Supabase `subscriptions`テーブルをRealtime購読し、`_isPremiumValue`
  （bool）をlocalStorageへキャッシュ。`isPremium()`（後方互換）・
  `getTierLevel()`（PR-P2-05で追加）の2つを公開
- `src/services/stripe.js`: Checkout開始（`startStripeCheckout()`）・
  プラン選択UI操作・決済完了リダイレクト処理・3ヶ月アップセル通知
- `src/modules/premium/premium-lock.js`: `premiumGate(callback)`
  （既存の主要ペイウォールゲート）・ロックオーバーレイのUI生成

## 2. FREE / Premium / Proの型・値・命名

`getTierLevel()`（`premium-service.js:102`）はコード上`'free'|'premium'|'pro'`
の3層シェイプを意図しているが、**実際に返す値は`'free'`または`'pro'`の
2値のみ**。関数コメントに明記済み: 「現状のStripe/subscriptionsは
Premium/Proを区別する別商品を持たない単一課金のため、課金中は一律'pro'を
返す（コード形状のみ先行させる方針、Founder確認済み＝PR-P2-05・FREEZE-FD-1）。
'premium'は将来Stripe側に別価格が追加された時点で実データに基づき区別する」。
つまり**'premium'という値は現状どのコードパスからも返らない**。

## 3. `getTierLevel()`の現在の実挙動

```js
export function getTierLevel() {
  return _isPremiumValue ? 'pro' : 'free';
}
```
`_isPremiumValue`はSupabase `subscriptions.status === 'active'`かつ
`current_period_end`が未来であるかのbool。

## 4. Stripe checkoutの現在の価格構成

- クライアント側では**価格・Price IDを一切保持しない**
  （`stripe.js`冒頭コメント「Price IDはサーバー側のみで管理」）。
  クライアントは`plan: 'monthly'|'annual'`のみをEdge Function
  （`SUPABASE_URL + '/functions/v1/stripe-checkout'`）へ送信
- UI表示上の価格（`stripe.js` `selectPremiumPlan()`・
  `premium-lock.js`）: **月額¥580 / 年額¥4,800（31%オフ表記）**。
  単一商品（Premium/Pro区別なし）
- 過去のMonetization Council記録（メモリ）では別文書
  （BBS-001）が¥980/¥1,980を記載しており、**価格の不一致が既知の
  未解決事項**として残っている（本調査で実コード側の値
  ¥580/¥4,800を再確認・更新はしていない）

## 5. Supabase `subscriptions`テーブルの実フィールド

`supabase/migrations/20260005_subscriptions.sql`:

| カラム | 型 | 備考 |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users、UNIQUE（1ユーザー1行） |
| stripe_customer_id | text | |
| stripe_subscription_id | text | |
| plan | text | CHECK: `'monthly'\|'annual'` |
| status | text | CHECK: `'active'\|'canceled'\|'past_due'\|'inactive'`、デフォルト`'inactive'` |
| current_period_end | timestamptz | |
| created_at / updated_at | timestamptz | |

RLS: クライアントは**自分の行のSELECTのみ**可能。INSERT/UPDATE/DELETEは
Service Role専用（stripe-webhookのみが書込む）。**Tier種別（Premium/Pro
の区別）を表すカラムは存在しない**（`plan`は月額/年額の課金周期であり、
商品種別ではない）。

## 6. Premium/Pro UIの現在の到達経路

- `premiumGate(callback)`（`premium-lock.js`）が全体の主要ゲート。
  `window.isAdminOrPremium()`で判定し、非Premiumならロックオーバーレイを
  表示。多数の機能（体温レポート・相関レポート・実験のカスタム作成等）が
  `onclick="premiumGate(openXxx)"`の形でこれを直接呼んでいる
- 専用画面: `src/screens/pro-feature.html`・`src/screens/pro-hub.html`
  （`screen-router.js`にSCREEN_HTML登録済み、既存本番画面）

## 7. Prototype Premium/Pro画面との乖離

Prototype（`prototype/index.html` `#screen-me`のplan-card 2枚 +
`prototype/app.js` `openModal('premium'|'pro')`のモーダル詳細）は
**Premium/Proの物語的な2分類**（Premium=「自分の体を深く理解する」・
Pro=「改善実験を進める」）で構成され、**価格は一切表示しない**
（モーダルにもMe画面インラインカードにも¥表記なし。CTAは
「Premiumにする（プロトタイプ）」という明示的なモック表記）。

現行UIは**単一Pro商品**を月額/年額の価格付きで提示する構成であり、
Prototypeの2層物語的分類とは構造が異なる（FREEZE-FD-1として既知）。

**重要**: Prototypeのモーダル内容自体は価格を含まないため、表示専用の
画面統合（PR-BILLING-RUNTIME-02）は価格・Stripe商品構成を一切変更せずに
実装可能。

## 8. Feature Flagの有無

Billing/Premium関連の`ippo_*`Feature Flagは存在しない。home-next
（`ippo_home_next`）・experiment-next（`ippo_experiment_ui_v2`）・
insights-next（`ippo_insights_ui_v2`）で確立した命名パターンを踏襲し、
`ippo_billing_ui_v2`を新設する想定。

## 9. Checkout CTAの既存接続状況

**現行`startStripeCheckout()`は本番稼働中**（Edge Function
`stripe-checkout`を実際に呼び出し、Stripe Checkoutページへリダイレクトする
実装）。Prototype UIを接続する際は、この既存の稼働中Checkoutを
**誤って重複起動・迂回させない**よう注意が必要（PR-BILLING-RUNTIME-02は
表示のみでCheckout自体は未接続とする）。

## 10. Legacy課金UIの依存先

`premiumGate()`は`window.isAdminOrPremium`・`window.state`・
`window.analyzeTemperatureLegacy`等、複数のwindowグローバルに依存。
`pro-hub.html`/`pro-feature.html`も同様にlegacy window関数群に依存した
構成（詳細な依存グラフは未調査、本PRの範囲外）。

## 11. Founder Decisionが必要な未確定事項

```
a. 価格の不一致解消（実コード¥580/¥4,800 vs 過去文書記載の¥980/¥1,980、
   どちらを正とするか）
b. Premium/Proを実際に2商品へ分割するか（Stripe Price ID追加が必要）、
   単一商品のまま「Pro」名称で統一するか
c. 分割する場合の機能境界（Premiumに何を含め、Proに何を含めるか。
   Prototypeのモーダルはヒント程度の項目リストのみで確定仕様ではない）
d. 既存有料ユーザー（現行'pro'相当）の新tier体系への移行方法
e. Trial（無料試用）の有無
f. Checkout CTAの本番接続タイミング・移行手順
```

## 12. 価格を変更せずに先行可能な実装範囲

- Prototype Premium/Pro画面（Me画面のplan-card 2枚 + モーダル詳細）の
  表示専用Runtime統合（PR-BILLING-RUNTIME-02） — Prototype自体が価格非表示
  のため無理なく可能
- 現行`getTierLevel()`（'free'|'pro'の2値）をそのまま使ったRead-only
  ViewModel Adapter（PR-BILLING-RUNTIME-03） — 'premium'状態は実データが
  存在しないため、表示用fixtureまたは明示的な「未接続」状態として隔離し、
  実運用データとして偽装しない
- `window.app.api`経由のSubscription状態Read接続（PR-BILLING-RUNTIME-04）
  — ApiGatewayに対応するRead方法が現状無いため、追加が必要かどうかは
  実装時に確認（Home/Insightsと同様、既存Serviceの配線追加であれば
  Architecture変更に該当しない想定）

## Next

PR-BILLING-RUNTIME-02（Prototype Premium/Pro画面の表示専用Runtime統合、
Feature Flag `ippo_billing_ui_v2` デフォルトOFF）
