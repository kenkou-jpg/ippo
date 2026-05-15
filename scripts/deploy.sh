#!/usr/bin/env bash
# scripts/deploy.sh
# ローカルから Supabase へ一括デプロイするスクリプト
#
# 使い方:
#   ./scripts/deploy.sh                 # 全デプロイ
#   ./scripts/deploy.sh --functions     # Edge Functions のみ
#   ./scripts/deploy.sh --migrations    # マイグレーションのみ
#   ./scripts/deploy.sh --secrets       # シークレット同期のみ
#
# 事前に必要なもの:
#   - supabase CLI インストール済み (brew install supabase/tap/supabase)
#   - supabase login 済み
#   - .env.local に SUPABASE_PROJECT_REF, SUPABASE_DB_URL を設定

set -euo pipefail

# ── .env.local の読み込み ─────────────────────────────────
if [ -f ".env.local" ]; then
  set -a
  source .env.local
  set +a
fi

# ── 必須変数チェック ──────────────────────────────────────
: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF が未設定です (.env.local に追加してください)}"

# ── フラグ処理 ────────────────────────────────────────────
RUN_ALL=true
RUN_FUNCTIONS=false
RUN_MIGRATIONS=false
RUN_SECRETS=false

for arg in "$@"; do
  case $arg in
    --functions)   RUN_ALL=false; RUN_FUNCTIONS=true ;;
    --migrations)  RUN_ALL=false; RUN_MIGRATIONS=true ;;
    --secrets)     RUN_ALL=false; RUN_SECRETS=true ;;
  esac
done

if $RUN_ALL; then
  RUN_FUNCTIONS=true
  RUN_MIGRATIONS=true
  RUN_SECRETS=true
fi

# ── プロジェクトのリンク ──────────────────────────────────
echo "🔗 Supabase プロジェクトにリンク中 (ref: $SUPABASE_PROJECT_REF)..."
supabase link --project-ref "$SUPABASE_PROJECT_REF"

# ── DB マイグレーション ───────────────────────────────────
if $RUN_MIGRATIONS; then
  echo ""
  echo "🗄️  DB マイグレーションを実行中..."
  if [ -n "${SUPABASE_DB_URL:-}" ]; then
    supabase db push --db-url "$SUPABASE_DB_URL"
  else
    supabase db push
  fi
  echo "✅ マイグレーション完了"
fi

# ── Edge Functions デプロイ ───────────────────────────────
if $RUN_FUNCTIONS; then
  echo ""
  echo "🚀 Edge Functions をデプロイ中..."

  FUNCTIONS=(
    ai-analyze
    stripe-checkout
    stripe-webhook
    report-generate
  )

  for fn in "${FUNCTIONS[@]}"; do
    echo "  → $fn"
    supabase functions deploy "$fn" --no-verify-jwt
  done

  echo "✅ Edge Functions デプロイ完了"
fi

# ── シークレット同期 ──────────────────────────────────────
if $RUN_SECRETS; then
  echo ""
  echo "🔐 Edge Function シークレットを同期中..."

  # 必須シークレットの存在チェック
  REQUIRED_SECRETS=(
    ANTHROPIC_API_KEY
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET
    STRIPE_PRICE_MONTHLY
    STRIPE_PRICE_ANNUAL
    SUPABASE_SERVICE_ROLE_KEY
  )

  MISSING=()
  for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ -z "${!secret:-}" ]; then
      MISSING+=("$secret")
    fi
  done

  if [ ${#MISSING[@]} -gt 0 ]; then
    echo "⚠️  以下のシークレットが未設定です (.env.local に追加してください):"
    for s in "${MISSING[@]}"; do
      echo "   - $s"
    done
    echo "   シークレット同期をスキップします"
  else
    supabase secrets set \
      ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
      STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
      STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
      STRIPE_PRICE_MONTHLY="$STRIPE_PRICE_MONTHLY" \
      STRIPE_PRICE_ANNUAL="$STRIPE_PRICE_ANNUAL" \
      SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
    echo "✅ シークレット同期完了"
  fi
fi

echo ""
echo "🎉 デプロイ完了！"
