-- ============================================================
--  Group I: Index Creation
--  CRITICAL: このファイルはSupabase SQL Editorで1文ずつ手動実行する
--  CRITICAL: BEGIN; で囲まない（CONCURRENTLY はトランザクション外で実行）
--  CRITICAL: 失敗した場合は DROP INDEX <name>; 後に再実行する
--  実行確認: SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%';
-- ============================================================

-- records テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_user_date
  ON public.records(user_id, record_date DESC) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_symptoms
  ON public.records USING GIN(symptom_keys) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_factors
  ON public.records USING GIN(factor_keys) WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_period
  ON public.records(user_id, record_date) WHERE is_period = true AND is_deleted = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_records_sync
  ON public.records(user_id) WHERE sync_pending = true;

-- experiments テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exp_disease
  ON public.experiments USING GIN(disease_keys);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exp_factor_completed
  ON public.experiments(factor_key, status) WHERE status = 'COMPLETED';

-- cases テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_pro_search
  ON public.cases(primary_disease_key, tier, consent_level, quality_score DESC)
  WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_disease_arr
  ON public.cases USING GIN(disease_keys);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_symptoms_arr
  ON public.cases USING GIN(primary_symptom_keys);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_search_vec
  ON public.cases USING GIN(search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_age_disease
  ON public.cases(age_group, primary_disease_key) WHERE tier IS NOT NULL;

-- consent_events テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ce_consent_latest
  ON public.consent_events(consent_id, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ce_user_history
  ON public.consent_events(user_id, occurred_at DESC);

-- outcomes テーブル
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_out_exp_version
  ON public.outcomes(experiment_id, version DESC) WHERE superseded_by IS NULL;
