-- ============================================================
--  Group B: Master Data — 002
--  symptoms テーブル（英語snake_caseキー確定版）
--  CRITICAL: key は変更禁止（SCHEMA_V1 C-2）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.symptoms (
  key             text    PRIMARY KEY,
  display_name_ja text    NOT NULL,
  display_name_en text,
  layer           smallint NOT NULL CHECK (layer IN (1, 2, 3)),
  is_sensitive    boolean DEFAULT false,
  meddra_code     text,
  snomed_code     text,
  nci_code        text,
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sym_read ON public.symptoms FOR SELECT USING (true);
