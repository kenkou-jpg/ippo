-- ============================================================
--  Group C: User Domain — 012
--  subscriptions テーブル拡張（既存テーブルにカラム追加）
-- ============================================================

-- plan と status は既存カラムを確認してから追加
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan   text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'inactive';

-- stripe_customer_id / stripe_subscription_id は既存にある可能性があるためIF NOT EXISTS
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz;

CREATE INDEX IF NOT EXISTS idx_sub_user ON public.subscriptions(user_id);
