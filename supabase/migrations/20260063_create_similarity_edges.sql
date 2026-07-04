-- ============================================================
--  Group G: Case Domain — 053
--  similarity_edges テーブル（症例類似グラフ）
--  CRITICAL: テーブル名は similarity_edges（case_similarity ではない）（RD-008）
--  CRITICAL: case_id_a < case_id_b を強制して重複排除
-- ============================================================

CREATE TABLE IF NOT EXISTS public.similarity_edges (
  case_id_a         text        NOT NULL REFERENCES public.cases(id),
  case_id_b         text        NOT NULL REFERENCES public.cases(id),

  similarity_score  numeric(6,5) NOT NULL,
  disease_overlap   numeric(4,3),
  symptom_overlap   numeric(4,3),
  experiment_type_match boolean,
  outcome_match     boolean,
  age_group_match   boolean,

  algorithm_version text        NOT NULL DEFAULT 'v1',
  calculated_at     timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (case_id_a, case_id_b),
  CHECK (case_id_a < case_id_b)
);

CREATE INDEX IF NOT EXISTS idx_sim_a_score ON public.similarity_edges(case_id_a, similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_sim_b_score ON public.similarity_edges(case_id_b, similarity_score DESC);

ALTER TABLE public.similarity_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sim_pro ON public.similarity_edges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_premium = true
    )
  );
