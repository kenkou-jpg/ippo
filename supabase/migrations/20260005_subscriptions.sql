-- ============================================================
--  ippo – subscriptions テーブル
--  Premium の Source of Truth を profiles.is_premium から
--  専用テーブルへ移行する。
--
--  ADR-003: Premium Source of Truth 統一判断
--  - profiles.is_premium は二元管理・webhook サイレント失敗バグの原因
--  - subscriptions テーブルを唯一の参照先とする
--  - stripe-webhook が UPSERT / UPDATE を行い、クライアントは SELECT のみ
-- ============================================================

-- ─── subscriptions テーブル ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text        CHECK (plan IN ('monthly', 'annual')),
  status                 text        NOT NULL DEFAULT 'inactive'
                                     CHECK (status IN ('active', 'canceled', 'past_due', 'inactive')),
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ─── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザー自身の行のみ SELECT 可。INSERT/UPDATE/DELETE は Service Role のみ。
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ─── updated_at 自動更新 ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- ─── Realtime 有効化 ───────────────────────────────────────────
-- premium-service.js が postgres_changes を購読するために必要
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- ─── 既存有料ユーザーの移行 ────────────────────────────────────
-- profiles.is_premium = true のユーザーを subscriptions へ移行する。
-- plan は記録がないため 'annual' を仮定（手動修正が必要な場合は別途対応）。
INSERT INTO public.subscriptions (user_id, status, plan, created_at, updated_at)
SELECT
  id        AS user_id,
  'active'  AS status,
  'annual'  AS plan,
  COALESCE(created_at, now()) AS created_at,
  now()     AS updated_at
FROM public.profiles
WHERE is_premium = true
ON CONFLICT (user_id) DO NOTHING;
