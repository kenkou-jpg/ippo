-- ============================================================
--  Group B: Master Data — 001
--  disease_definitions テーブル
--  CRITICAL: key / disease_prefix は変更禁止（SCHEMA_V1 C-4）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disease_definitions (
  key             text    PRIMARY KEY,
  display_name_ja text    NOT NULL,
  display_name_en text,
  icd10_code      text,
  icd10_subcode   text,
  snomed_code     text,
  disease_prefix  text    NOT NULL UNIQUE,
  category        text,
    -- 'endometriosis_family'|'ovarian'|'hormonal'|'pelvic'
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disease_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dis_read ON public.disease_definitions FOR SELECT USING (true);
