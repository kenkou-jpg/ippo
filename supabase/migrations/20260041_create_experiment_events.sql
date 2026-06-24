-- ============================================================
--  Group E: Experiment Domain — 031
--  experiment_events テーブル
--  CRITICAL: PAUSED / RESUMED は存在しない（RD-003確定）
--  CRITICAL: ABANDONED payload に outcome_id: null を含む（RD-004）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.experiment_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid        NOT NULL REFERENCES public.experiments(id),
  user_id       uuid        NOT NULL REFERENCES auth.users(id),

  event_type    text        NOT NULL
    CHECK (event_type IN ('CREATED','STARTED','COMPLETED','ABANDONED','CONFIG_CHANGED')),

  from_status   text,
  to_status     text        NOT NULL,

  payload       jsonb,
    -- STARTED:        {actual_start_date, baseline_end_date}
    -- COMPLETED:      {actual_end_date, outcome_id}
    -- ABANDONED:      {reason, days_completed, outcome_id: null}
    -- CONFIG_CHANGED: {field, old_value, new_value}

  occurred_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ee_experiment ON public.experiment_events(experiment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ee_user_type  ON public.experiment_events(user_id, event_type);

ALTER TABLE public.experiment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ee_own_read   ON public.experiment_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY p_ee_own_insert ON public.experiment_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE/DELETE ポリシーなし = 禁止
