-- ============================================================
--  PR-REC-06a-FIX-2: records / record_symptoms / record_factors への
--  書込みを単一トランザクションで行うRPC関数
--
--  根拠: infrastructure/record/record.repository.ts の
--  SupabaseRecordRepository.upsert() は、records upsert →
--  record_symptoms delete/insert → record_factors delete/insert を
--  3回の独立したSupabase API呼び出しで行っており、途中で失敗すると
--  部分的成功状態（recordsだけ更新され子テーブルが古いまま）が
--  残り得る（PR-REC-06a-FIX D節で明記済みの既知制約）。
--  plpgsql関数呼び出しはデフォルトで単一トランザクションのため、
--  本関数へ集約することでこの非原子性を解消する。
--
--  設計方針:
--  - SECURITY INVOKER（デフォルト）: 呼び出したユーザー自身の権限で実行され、
--    既存RLS（auth.uid() = user_id）がそのまま適用される。
--  - 症状/行動タグのラベル→key解決（symptoms/factor_definitions参照）は
--    引き続きJS側（SupabaseRecordRepository）で行い、解決済みkeyのみを
--    本関数へ渡す。vocabulary解決ロジックをSQL側へ持ち込まない。
--  - auth.uid() IS NOT NULL の場合のみ p_user_id = auth.uid() を検証する
--    （RLSの二重化。defense-in-depth）。service_role キー経由の呼び出し
--    （PR-REC-06c バックフィルスクリプト等）は auth.uid() が NULL になり、
--    RLS自体もservice_roleではBYPASSされるため、この関数独自のチェックだけが
--    誤って正規のservice_role呼び出しを拒否することがないようにする。
--
--  このマイグレーションファイルはまだSupabaseへ適用していない
--  （Founder承認まで適用しない）。
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_record_with_children(
  p_user_id        uuid,
  p_record_date    date,
  p_mood           smallint DEFAULT NULL,
  p_pain_level     smallint DEFAULT NULL,
  p_body_temp      numeric(4,1) DEFAULT NULL,
  p_wellness_score smallint DEFAULT NULL,
  p_sleep_quality  smallint DEFAULT NULL,
  p_note           text DEFAULT NULL,
  p_experiment_id  uuid DEFAULT NULL,
  p_medication     text[] DEFAULT NULL,
  p_period_day     smallint DEFAULT NULL,
  p_symptom_keys   text[] DEFAULT '{}',
  p_factor_keys    text[] DEFAULT '{}'
)
RETURNS public.records
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_record public.records;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'upsert_record_with_children: p_user_id does not match auth.uid()';
  END IF;

  INSERT INTO public.records (
    user_id, record_date, mood, pain_level, body_temp, wellness_score,
    sleep_quality, note, experiment_id, medication, period_day,
    symptom_keys, factor_keys, updated_at
  ) VALUES (
    p_user_id, p_record_date, p_mood, p_pain_level, p_body_temp, p_wellness_score,
    p_sleep_quality, p_note, p_experiment_id, p_medication, p_period_day,
    p_symptom_keys, p_factor_keys, now()
  )
  ON CONFLICT (user_id, record_date) DO UPDATE SET
    mood            = EXCLUDED.mood,
    pain_level      = EXCLUDED.pain_level,
    body_temp       = EXCLUDED.body_temp,
    wellness_score  = EXCLUDED.wellness_score,
    sleep_quality   = EXCLUDED.sleep_quality,
    note            = EXCLUDED.note,
    experiment_id   = EXCLUDED.experiment_id,
    medication      = EXCLUDED.medication,
    period_day      = EXCLUDED.period_day,
    symptom_keys    = EXCLUDED.symptom_keys,
    factor_keys     = EXCLUDED.factor_keys,
    updated_at      = EXCLUDED.updated_at
  RETURNING * INTO v_record;

  -- record_symptoms を delete-then-insert で同期（同一トランザクション内）
  DELETE FROM public.record_symptoms WHERE record_id = v_record.id;
  IF array_length(p_symptom_keys, 1) > 0 THEN
    INSERT INTO public.record_symptoms (record_id, user_id, symptom_key, recorded_at)
    SELECT v_record.id, p_user_id, key, p_record_date
    FROM unnest(p_symptom_keys) AS key;
  END IF;

  -- record_factors を delete-then-insert で同期（同一トランザクション内）
  DELETE FROM public.record_factors WHERE record_id = v_record.id;
  IF array_length(p_factor_keys, 1) > 0 THEN
    INSERT INTO public.record_factors (record_id, user_id, factor_key, recorded_at)
    SELECT v_record.id, p_user_id, key, p_record_date
    FROM unnest(p_factor_keys) AS key;
  END IF;

  RETURN v_record;
END;
$$;

-- authenticated: 通常のクライアント（Prototype Record保存時のShadow Write）
-- service_role: PR-REC-06c バックフィルスクリプト等の管理操作
GRANT EXECUTE ON FUNCTION public.upsert_record_with_children(
  uuid, date, smallint, smallint, numeric, smallint, smallint, text, uuid,
  text[], smallint, text[], text[]
) TO authenticated, service_role;
