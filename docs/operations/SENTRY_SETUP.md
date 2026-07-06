# Sentry Setup — Client + Edge Functions

Operations Recovery Program PR-OPS-01。Founder自身が実施する残タスクの手順書。

コード側の実装は完了済み。以下の値を設定するだけで有効化される（コード変更不要）。
未設定の間は完全に no-op（Client: `src/runtime/sentry-reporter.js` / Edge Functions: `supabase/functions/_shared/logger.ts`）。

---

## 1. Sentryアカウント・プロジェクト作成（Founder実施）

1. https://sentry.io でアカウント作成（Free tier で開始可能）
2. Organization作成 → Project作成を2つ:
   - `ippo-client`（Platform: Browser JavaScript）
   - `ippo-edge-functions`（Platform: Deno）
3. 各ProjectのDSN（`Settings → Client Keys (DSN)`）を控える

---

## 2. ローカル開発環境

`.env.local` に追記（Client DSN）:

```
VITE_SENTRY_DSN=https://xxxxx@oyyyyy.ingest.sentry.io/zzzzz
```

未設定のままでもローカル開発・ビルド・テストはすべて動作する（no-op）。
また `src/runtime/sentry-reporter.js` は本番ビルド（`import.meta.env.PROD`）でのみ有効化されるため、
`npm run dev` では DSN を設定していても発火しない。

---

## 3. GitHub Secrets（CI / Edge Function デプロイ用）

Repository → Settings → Secrets and variables → Actions に以下を追加:

| Secret名 | 用途 | 参照元 |
|---|---|---|
| `VITE_SENTRY_DSN` | Client DSN。**本番デプロイ**（[.github/workflows/build.yml](../../.github/workflows/build.yml)、GitHub Pages）とPRビルドチェック（[.github/workflows/ci.yml](../../.github/workflows/ci.yml)）の両方に注入 | build.yml / ci.yml |
| `SENTRY_DSN` | Edge Function DSN。`supabase secrets set` で同期 | [.github/workflows/deploy-supabase.yml](../../.github/workflows/deploy-supabase.yml) |

いずれも未設定のままでもCI/デプロイは失敗しない（空文字が渡り、no-opになるだけ）。

---

## 4. 本番ホスティング（Vercel / Netlify 等）の Environment Variables

Vercelの場合の例（Project → Settings → Environment Variables）:

| Key | Value | Environment |
|---|---|---|
| `VITE_SENTRY_DSN` | Client DSN | **Production のみ**（Preview/Developmentには設定しない） |

Production のみに限定する理由: `sentry-reporter.js` は `isProduction()` チェックを行うため
Preview環境で設定してもクライアント側では発火しないが、Sentry無料枠のイベント消費を避けるため
Production限定での設定を推奨する。

---

## 5. 設定後の確認方法

1. Client: 本番ビルドをデプロイ後、ブラウザConsoleで意図的にエラーを起こし
   （例: `throw new Error('sentry-test')` をConsoleで実行）、Sentryダッシュボードに
   Issueが数分以内に出現することを確認する。
2. Edge Functions: `supabase functions deploy` 後、対象関数に一時的に無効なリクエストを送り
   `log('error', ...)` が呼ばれる経路を踏ませ、Sentryダッシュボードに反映されることを確認する。

---

## 6. 運用方針

- アラート設定（Sentry → Alerts）はFounderが手動設定する（Recovery Program範囲外、規約上の判断を伴わない単純作業のため）。
- 推奨アラート: 1時間あたりの新規Issue数が閾値を超えた場合にメール通知。
- Free tierのイベント上限に達した場合は古いIssueの自動アーカイブで対応可能（課金は伴わない）。
