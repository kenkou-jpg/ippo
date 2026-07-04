-- ============================================================
--  Group K: Triggers / Guards
--  CRITICAL: outcomes UPDATE禁止トリガー（SCHEMA_V1 C-7）
--  CRITICAL: cases 物理DELETE禁止トリガー
--  CRITICAL: consent_events DELETE禁止トリガー（法的証拠）
-- ============================================================

-- ── outcomes UPDATE 禁止 ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_outcome_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'outcomes are immutable. Use INSERT with version+1 and set superseded_by instead. (SCHEMA_V1 C-7)';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_outcome_update ON public.outcomes;
CREATE TRIGGER trg_prevent_outcome_update
  BEFORE UPDATE ON public.outcomes
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.prevent_outcome_update();

-- ── cases 物理DELETE 禁止 ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_cases_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'Cases cannot be physically deleted. Set status = ARCHIVED instead. (SCHEMA_V1 §1-4)';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_cases_delete ON public.cases;
CREATE TRIGGER trg_prevent_cases_delete
  BEFORE DELETE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_cases_delete();

-- ── consent_events DELETE 禁止 ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_consent_events_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'consent_events are legal evidence and cannot be deleted. (SCHEMA_V1 §1-4)';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_consent_events_delete ON public.consent_events;
CREATE TRIGGER trg_prevent_consent_events_delete
  BEFORE DELETE ON public.consent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_consent_events_delete();

-- ── consent_events UPDATE 禁止 ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.prevent_consent_events_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'consent_events are append-only. No UPDATE allowed. (SCHEMA_V1 §1-3)';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_consent_events_update ON public.consent_events;
CREATE TRIGGER trg_prevent_consent_events_update
  BEFORE UPDATE ON public.consent_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_consent_events_update();

-- ── cases.is_public の自動更新 ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_cases_is_public()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_public := (NEW.tier IN ('TIER2','TIER1') AND NEW.consent_level >= 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cases_is_public ON public.cases;
CREATE TRIGGER trg_cases_is_public
  BEFORE INSERT OR UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cases_is_public();

-- ── profiles.updated_at / records.updated_at 自動更新 ───────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['profiles','records','experiments','consents','cases'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;
