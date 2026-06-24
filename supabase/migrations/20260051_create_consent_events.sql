-- ============================================================
--  Group F: Consent Domain — 041
--  consent_events テーブル（Source of Truth — append-only）
--  CRITICAL: UPDATE / DELETE 禁止（法的証拠）
--  CRITICAL: INSERT ONLY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consent_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id      uuid        NOT NULL REFERENCES public.consents(id),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),

  event_type      text        NOT NULL
    CHECK (event_type IN (
      'PRESENTED','GRANTED','WITHDRAWN','EXPIRED','SUSPENDED',
      'LEVEL_CHANGED','POLICY_UPDATED','JURISDICTION_CHANGED'
    )),

  from_level      smallint,
  to_level        smallint,
  from_status     text,
  to_status       text        NOT NULL,

  policy_version  text        NOT NULL,
  jurisdiction    text        NOT NULL,

  ip_hash         text,
  user_agent_hash text,

  payload         jsonb,

  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_consent ON public.consent_events(consent_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_user    ON public.consent_events(user_id, event_type, occurred_at DESC);

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ce_own_read   ON public.consent_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY p_ce_own_insert ON public.consent_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE / DELETE ポリシーなし = 全ロール拒否（法的証拠保護）
