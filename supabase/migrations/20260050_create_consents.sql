-- ============================================================
--  Group F: Consent Domain — 040
--  consents テーブル（Denormalized Cache）
--  CRITICAL: level CHECK (BETWEEN 0 AND 3) — Level 4は使用しない（RD-006）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consents (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  consent_type    text    NOT NULL DEFAULT 'PLATFORM'
    CHECK (consent_type IN ('PLATFORM','CASE_PUBLICATION','RESEARCH','AI_TRAINING','COMMERCIAL')),
  level           smallint NOT NULL DEFAULT 0
    CHECK (level BETWEEN 0 AND 3),

  status          text    NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','PRESENTED','GRANTED','WITHDRAWN','EXPIRED','SUSPENDED')),

  policy_version  text    NOT NULL,
  jurisdiction    text    NOT NULL DEFAULT 'JP'
    CHECK (jurisdiction IN ('JP','EU','US','OTHER')),

  ip_hash         text,
  user_agent_hash text,

  presented_at    timestamptz,
  granted_at      timestamptz,
  withdrawn_at    timestamptz,
  expires_at      timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, consent_type, jurisdiction)
);

CREATE INDEX IF NOT EXISTS idx_con_user   ON public.consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_con_status ON public.consents(status, consent_type);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_con_own ON public.consents USING (auth.uid() = user_id);
