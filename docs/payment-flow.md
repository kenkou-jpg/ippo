# Payment Flow — ippo (Stripe)

> 現状の決済フロー、既知の穴、production-safe にするための条件を記載。

## フロー概要

```
ユーザー
  │ 「年額プランで始める」ボタン
  ▼
startStripeCheckout()  [src/services/stripe.js]
  │ supabase.auth.getSession() で JWT 取得
  │ POST /functions/v1/create-checkout
  │   { price_id, success_url, cancel_url }
  ▼
Supabase Edge Function: create-checkout
  │ Stripe API: checkout.sessions.create()
  ▼
Stripe ホスト決済ページ (外部リダイレクト)
  │ 決済完了
  ▼
success_url: ?stripe=success&plan=annual
  │ handleStripeReturn() IIFE が検出
  ▼
polling: checkPremiumStatus() × 12回 (2.5s間隔 = 30秒)
  │ supabase.from('profiles').select('is_premium')
  ├─ isPremium === true → 「ようこそ」toast
  └─ 30秒後も false  → 「有効化に時間がかかる」toast (Phase 1 で追加)
```

## 価格 ID

| 変数 | 値 | 状態 |
|------|-----|------|
| `STRIPE_PRICE_MONTHLY` | `price_XXXXXXXXXXXXXXXXXX` | **プレースホルダー** (Phase 1 でガード済み) |
| `STRIPE_PRICE_ANNUAL` | `price_YYYYYYYYYYYYYYYYYY` | **プレースホルダー** (Phase 1 でガード済み) |

**本番稼動前に必要な作業:**
1. Stripe ダッシュボードで Price ID を作成
2. `src/services/stripe.js` の定数を実際の値に置換
3. `isPlaceholderPrice()` チェックが外れることを確認

## Webhook の現状

**未整備。** Stripe は決済完了後 webhook で Edge Function を呼ぶ設計が一般的だが、
現在 ippo には webhook エンドポイントがない。

### Webhook なし時の動作

```
Stripe 決済完了
  ↓
Stripe → ippo webhook URL なし (何も起きない)
  ↓
フロントエンド polling が is_premium を確認
  ↓
profiles テーブルの is_premium は false のまま
  ↓
30秒後 polling 終了 → ユーザーにトースト表示
  ↓
プレミアム機能は使えないまま
```

### 解決策の選択肢

| 方法 | 難度 | 説明 |
|------|------|------|
| A. Webhook 整備 | 中 | Stripe → Supabase Edge Function → profiles 更新 |
| B. 手動 DB 更新 | 低 | 管理者が profiles テーブルを直接更新 |
| C. Checkout Success で直接更新 | 中 | `create-checkout` 完了後に profiles を更新する方法（ただし二重課金対策が必要） |

**推奨: A (Webhook)** — Stripe ダッシュボードで `checkout.session.completed` をトリガーに、
`/functions/v1/handle-webhook` エンドポイントを Supabase Edge Function として実装。

## checkPremiumStatus の依存関係

```
checkPremiumStatus()
  ├─ supabase (SDKクライアント) — null の場合は silent fail
  ├─ supabase.auth.getSession() — SDK セッション必須
  ├─ supabase.from('profiles') — profiles テーブルが存在すること
  ├─ ADMIN_USER_ID (グローバル定数) — 管理者バイパス
  └─ updatePremiumBadges() — DOM 存在前提
```

### 既知の失敗モード

| 状況 | 結果 |
|------|------|
| SDK セッションなし | `isPremium = false`、cloudBackupAll スキップ |
| profiles テーブルに行なし | `profile?.is_premium` → false (意図通り) |
| Supabase key が未設定 | `supabase` が null → `getSession` で例外 → `isPremium = false` |
| ネットワーク断 | catch → `isPremium = false` (フォールバック) |

## Premium 有効化後の状態確認

```js
// コンソールで確認
window.isPremium          // true/false
window.state.isPremium    // state にも反映されているか確認
window.__ippoLastSyncStatus // 最後の cloudBackupAll 結果
```

## production 稼動の最低条件

- [ ] Stripe Price ID を実際の値に設定
- [ ] Stripe Webhook エンドポイントを実装・登録
- [ ] `profiles` テーブルのスキーマ確認（`is_premium boolean` カラム存在）
- [ ] 決済完了 → `is_premium = true` のエンドツーエンド動作確認
- [ ] キャンセル時のユーザー体験確認（`?stripe=cancel` フロー）
