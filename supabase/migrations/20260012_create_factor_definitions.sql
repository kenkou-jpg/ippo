-- ============================================================
--  Group B: Master Data — 003
--  factor_definitions テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.factor_definitions (
  key             text    PRIMARY KEY,
  display_name_ja text    NOT NULL,
  display_name_en text,
  category        text,
    -- 'dietary'|'lifestyle'|'environmental'|'supplement'|'medical'
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.factor_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_fac_read ON public.factor_definitions FOR SELECT USING (true);
