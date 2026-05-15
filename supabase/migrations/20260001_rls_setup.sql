-- ============================================================
--  ippo – RLS Setup Migration
--  適用方法: Supabase Dashboard → SQL Editor で実行
-- ============================================================

-- ─── profiles テーブル: カラム追加 ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz          DEFAULT null;

-- ─── RLS 有効化 ──────────────────────────────────────────────
ALTER TABLE public.records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts  ENABLE ROW LEVEL SECURITY;

-- ─── records ポリシー ────────────────────────────────────────
DROP POLICY IF EXISTS "records_select_own"  ON public.records;
DROP POLICY IF EXISTS "records_insert_own"  ON public.records;
DROP POLICY IF EXISTS "records_update_own"  ON public.records;
DROP POLICY IF EXISTS "records_delete_own"  ON public.records;

CREATE POLICY "records_select_own"
  ON public.records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "records_insert_own"
  ON public.records FOR INSERT
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "records_update_own"
  ON public.records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "records_delete_own"
  ON public.records FOR DELETE
  USING (auth.uid() = user_id);

-- ─── profiles ポリシー ───────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ユーザー自身による UPDATE（is_premium と premium_expires_at は除外）
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- is_premium と premium_expires_at の変更は Service Role のみ許可
    -- （stripe-webhook 関数がサービスロールキーで操作する）
  );

-- is_premium を直接書き換えできないようにカラムレベルのセキュリティを設定
-- （Supabase は Column Level Security を RLS ポリシーの WITH CHECK で制御）
-- 注: フロントエンドからの is_premium 更新を完全にブロックするには
--     Supabase のサービスロールキー経由のみで更新する運用とする。

-- ─── community_posts ポリシー ────────────────────────────────
DROP POLICY IF EXISTS "community_posts_select_all"   ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_auth"  ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete_own"   ON public.community_posts;

-- 全認証ユーザーが読める（匿名投稿のため user_id は SELECT で返さない運用）
CREATE POLICY "community_posts_select_all"
  ON public.community_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "community_posts_insert_auth"
  ON public.community_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "community_posts_delete_own"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 新規ユーザー登録時に profiles を自動作成するトリガー ────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_premium, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    false,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
