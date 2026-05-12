# Auth & Data Flow — ippo

> 現状の2スタック認証構造の図式。一本化は Phase 2 禁止。まず把握のみ。

## 認証スタック構成

```
┌─────────────────────────────────────────────────────────────────┐
│  ブラウザ localStorage                                           │
│                                                                  │
│  ippo_sb_token      ← アクセストークン (JWT)                    │
│  ippo_sb_refresh    ← リフレッシュトークン                      │
│  ippo_sb_user_id    ← Supabase user UUID                        │
│  ippo_sb            ← SDK が管理するセッション blob             │
└──────────────┬───────────────────────────┬──────────────────────┘
               │                           │
   ┌───────────▼──────────┐   ┌────────────▼────────────────┐
   │  Inline REST Auth    │   │  SDK Auth                   │
   │  (app.html ~L1596)   │   │  (src/services/supabase.js) │
   │                      │   │                             │
   │  supabaseToken       │   │  supabase.auth.getSession() │
   │  supabaseUserId      │   │  persistSession: true       │
   │  supabaseSignInAnon()│   │  storageKey: 'ippo_sb'      │
   │  supabaseRefresh()   │   │  custom storage adapter     │
   │  supabaseEnsureAuth()│   │  (maps -token/-refresh keys)│
   └───────────┬──────────┘   └────────────┬────────────────┘
               │                           │
               │  共有ストレージキー        │
               │  (ippo_sb_token 等)       │
               └───────────┬───────────────┘
                           │
                  ┌────────▼────────┐
                  │ Bridge 関数     │
                  │ checkPremium    │
                  │ Status()        │
                  │                 │
                  │ SDK session →   │
                  │ supabaseToken   │
                  │ supabaseUserId  │
                  └─────────────────┘
```

## 各スタックの用途

| 用途 | 使用スタック | 関数 |
|------|------------|------|
| 匿名サインアップ | Inline REST | `supabaseSignInAnonymous()` |
| トークン更新 | Inline REST | `supabaseRefreshSession()` |
| プレミアム待機リスト登録 | Inline REST | `submitPremiumWaitlist()` |
| クラウドバックアップ | SDK | `cloudBackupAll()` |
| クラウド復元 | SDK | `cloudRestore()` |
| プレミアム状態確認 | SDK | `checkPremiumStatus()` |
| Stripe チェックアウト | SDK (getSession) | `startStripeCheckout()` |
| 全レコード同期 | SDK | `syncAllRecordsToCloud()` |

## localStorage キーの役割

| キー | 書き込み元 | 読み取り元 |
|------|-----------|-----------|
| `ippo_sb_token` | Inline signup/refresh & SDK adapter | Inline `supabaseEnsureAuth()` & SDK adapter |
| `ippo_sb_refresh` | Inline signup/refresh & SDK adapter | Inline `supabaseRefreshSession()` & SDK adapter |
| `ippo_sb_user_id` | Inline + `checkPremiumStatus()` | Inline `supabaseEnsureAuth()` |
| `ippo_sb` | SDK session blob | SDK `getSession()` |
| `ippo_state` | `saveState()` | App 起動時 |

## Bridge: checkPremiumStatus()

`checkPremiumStatus()` が両スタックの同期点：

```
supabase.auth.getSession()  ← SDK で取得
  ↓
session.user.id → supabaseUserId (inline var)
session.access_token → supabaseToken (inline var)
localStorage.setItem('ippo_sb_user_id', ...)
```

これにより、SDK セッションが有効な間は inline 変数も最新になる。

## 既知のミスマッチリスク

### ケース 1: SDK セッション切れ + Inline トークン残留
- `checkPremiumStatus()` が null session を返す
- `ippo_sb_token` は localStorage に残っている
- `cloudBackupAll()` → SDK session なし → スキップ
- 検出: `window.__ippoAuthMismatch.sdkId === null && inlineId !== null`

### ケース 2: 初回 Inline サインアップ後、SDK 未初期化
- `supabaseSignInAnonymous()` が先に走り `ippo_sb_token` を書く
- SDK の `persistSession` が後から同じキーを読んで初期化
- 通常は問題なし（共有キーが一致するため）

### ケース 3: 複数デバイス / ブラウザ
- ローカルストレージは端末ごとに独立
- `cloudBackupAll()` の `user_id` が一致していれば上書き同期

## デバッグ用グローバル変数

```js
window.__ippoAuthMismatch    // { inlineId, sdkId, ts } ミスマッチ時のみ存在
window.__ippoLastSyncStatus  // { ts, result: 'success'|'skipped'|'error', reason }
window.__ippoSupabaseStatus  // SDK 初期化状態
```

## 将来の一本化方針（Phase 2 では実施しない）

1. Inline REST auth を全廃し SDK 一本化
2. `supabaseEnsureAuth()` → `supabase.auth.signInAnonymously()` に置換
3. `supabaseToken` / `supabaseUserId` inline 変数を削除
4. `cloudBackupAll` / `submitPremiumWaitlist` が同じセッションを参照

**リスク**: Inline auth を消すと `submitPremiumWaitlist` が壊れる可能性。
SDK の anonymous signIn が anon key 不要で動くか要確認。
