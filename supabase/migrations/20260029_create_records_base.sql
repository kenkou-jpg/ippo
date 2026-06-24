-- ============================================================
--  20260029: records ベーステーブル作成（存在しない場合のみ）
--  20260030 の ALTER TABLE の前提テーブルを保証する
-- ============================================================

CREATE TABLE IF NOT EXISTS public.records (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
