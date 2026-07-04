-- ============================================================
--  Group H: Audit / Infrastructure — 060
--  audit_log テーブル（汎用監査ログ）
--  CRITICAL: INSERT ONLY。SELECT は Admin / Service Role のみ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                bigserial   PRIMARY KEY,
  table_name        text        NOT NULL,
  record_id         text        NOT NULL,
  action            text        NOT NULL
    CHECK (action IN ('INSERT','UPDATE','DELETE','STATUS_CHANGE','TIER_CHANGE')),
  performed_by      uuid,
  performed_by_role text,
    -- 'user'|'service'|'batch'|'admin'
  before_value      jsonb,
  after_value       jsonb,
  reason            text,
  occurred_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_al_table_record ON public.audit_log(table_name, record_id, occurred_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Service Role のみ INSERT / SELECT。一般ユーザーは全拒否
