-- ============================================================
--  Group H: Audit / Infrastructure — 062
--  research_exports テーブル（IRB管理・研究利用エクスポート記録）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.research_exports (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by          text        NOT NULL,
  irb_number            text,
  purpose               text        NOT NULL,
  disease_keys          text[]      NOT NULL,
  export_query          jsonb       NOT NULL,
  case_count            integer     NOT NULL,
  consent_level_min     smallint    NOT NULL,

  k_value               smallint    NOT NULL DEFAULT 5,
  anonymization_stage   smallint    NOT NULL DEFAULT 2,

  status                text        NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','EXPORTED','REJECTED','EXPIRED')),
  approved_at           timestamptz,
  exported_at           timestamptz,
  expires_at            timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.research_exports ENABLE ROW LEVEL SECURITY;
-- Service Role / Admin のみ
