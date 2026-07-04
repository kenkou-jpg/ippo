-- ============================================================
--  Group J: RLS 確認・補完
--  全新規テーブルのRLS有効化を確認し、漏れがあれば適用する
-- ============================================================

-- Validation: RLS有効化確認
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'disease_definitions','symptoms','factor_definitions',
    'disease_profiles','anonymized_user_map',
    'record_symptoms','record_factors',
    'experiments','experiment_events','outcomes',
    'consents','consent_events',
    'cases','case_snapshots','case_quality_scores','similarity_edges',
    'audit_log','anonymization_log','research_exports'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t AND rowsecurity = true
    ) THEN
      RAISE WARNING 'RLS NOT ENABLED on table: %', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'RLS check complete';
END;
$$;

-- Materialized Views（夜間バッチ更新用）
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_improvement_ranking AS
  SELECT
    e.disease_keys[1]       AS primary_disease_key,
    e.experiment_type,
    e.factor_key,
    COUNT(*)                AS experiment_count,
    AVG(o.primary_effect_size) AS avg_effect_size,
    COUNT(CASE WHEN o.category = 'IMPROVED' THEN 1 END)::float
      / NULLIF(COUNT(*), 0) AS improvement_rate,
    AVG(o.quality_score)    AS avg_quality_score
  FROM public.outcomes o
  JOIN public.experiments e ON e.id = o.experiment_id
  WHERE o.superseded_by IS NULL
    AND o.confidence_level IN ('high','medium')
    AND NOT e.is_deleted
  GROUP BY 1, 2, 3
  HAVING COUNT(*) >= 3;

CREATE UNIQUE INDEX IF NOT EXISTS mv_improvement_ranking_uniq
  ON public.mv_improvement_ranking(primary_disease_key, factor_key);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_case_stats AS
  SELECT
    primary_disease_key,
    tier,
    COUNT(*) AS case_count,
    AVG(quality_score) AS avg_quality
  FROM public.cases
  WHERE is_public = true
  GROUP BY 1, 2;

-- anonymized_user_map の全ユーザー分を生成（ユーザーが存在する場合）
INSERT INTO public.anonymized_user_map (user_id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.anonymized_user_map WHERE user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- UNIQUE(user_id, record_date) 制約はBackfill後に手動実行:
-- ALTER TABLE public.records ADD CONSTRAINT records_user_id_record_date_key
--   UNIQUE (user_id, record_date);
-- 実行前に: SELECT user_id, record_date, COUNT(*) FROM records GROUP BY 1,2 HAVING COUNT(*) > 1;
-- で重複を確認すること
