-- ============================================================
--  Group C: User Domain — 011
--  anonymized_user_map テーブル
--  CRITICAL: Service Role のみアクセス可。ポリシーなし = 全拒否
--  CRITICAL: anonymized_id は不可逆（SCHEMA_V1 C-5）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anonymized_user_map (
  user_id         uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymized_id   uuid    NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ポリシーなし = anon / authenticated 全ロール拒否
-- Service Role (RLS bypass) のみ操作可
ALTER TABLE public.anonymized_user_map ENABLE ROW LEVEL SECURITY;
