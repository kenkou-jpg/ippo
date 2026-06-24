// RecordMapper — translates between legacy record shape and domain record shape.
// Legacy shape: snake_case keys, date stored as ISO string or YYYY-MM-DD.
// Domain shape: camelCase keys, RecordEntity interface.
// Keeping this separate allows swapping to RecordV2 schema in a future PR.

const _EMPTY_ARRAY = Object.freeze([]);

// Normalise a date field to 'YYYY-MM-DD'.
function _normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    // ISO datetime: take the date part
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }
  return '';
}

export class RecordMapper {
  /**
   * Best-effort extraction of the record date from any legacy shape.
   * @param {object} r  legacy record
   * @returns {string}  'YYYY-MM-DD' or ''
   */
  normalizeDate(r) {
    if (!r) return '';
    const candidates = [
      r.record_date, r.recordDate, r.date,
      r.targetDate, r.selectedDate, r.editingDate,
      r.created_at, r.createdAt,
    ];
    for (const c of candidates) {
      const d = _normalizeDate(c);
      if (d) return d;
    }
    return '';
  }

  /**
   * Legacy record → domain-aligned object.
   * Missing fields are filled with safe defaults so consumers never see undefined.
   * @param {object} r  legacy record
   * @returns {object}  partial RecordEntity
   */
  fromLegacy(r) {
    if (!r) return null;
    const recordDate = this.normalizeDate(r);
    return {
      id:              r.id       ?? recordDate ?? '',
      userId:          r.user_id  ?? r.userId   ?? null,
      recordDate,
      createdAt:       r.created_at  ?? r.createdAt  ?? new Date().toISOString(),
      updatedAt:       r.updated_at  ?? r.updatedAt  ?? new Date().toISOString(),

      // Symptoms
      symptoms:        Array.isArray(r.symptoms) ? r.symptoms : _EMPTY_ARRAY,
      painLevel:       r.painLevel      ?? r.pain_level    ?? null,
      painLocation:    Array.isArray(r.painLocation)  ? r.painLocation  : _EMPTY_ARRAY,
      painType:        Array.isArray(r.painType)      ? r.painType      : _EMPTY_ARRAY,

      // Menstrual
      menstrualCycle:  r.menstrualCycle ?? r.menstrual_cycle ?? null,
      bloodClot:       Array.isArray(r.bloodClot)  ? r.bloodClot  : _EMPTY_ARRAY,
      bloodColor:      Array.isArray(r.bloodColor) ? r.bloodColor : _EMPTY_ARRAY,

      // Vitals
      temperature:     r.temperature   ?? null,
      tempMethod:      r.tempMethod    ?? r.temp_method  ?? null,

      // Energy / Mood
      energy:          r.energy        ?? null,
      mood:            r.mood          ?? null,

      // Sleep
      sleepBed:        r.sleepBed      ?? r.sleep_bed    ?? null,
      sleepWake:       r.sleepWake     ?? r.sleep_wake   ?? null,
      sleepHours:      r.sleepHours    ?? r.sleep_hours  ?? null,
      sleepQuality:    r.sleepQuality  ?? r.sleep_quality ?? null,

      // Meals
      meals:           r.meals         ?? {},
      firstMealTime:   r.firstMealTime ?? r.first_meal_time ?? null,
      lastMealTime:    r.lastMealTime  ?? r.last_meal_time  ?? null,
      mealCount:       r.mealCount     ?? r.meal_count      ?? 0,
      fasting:         r.fasting       ?? 0,

      // Bowel
      bowel:           r.bowel         ?? null,
      bowelCount:      r.bowelCount    ?? r.bowel_count    ?? 0,

      // Discharge
      dischargeAmount: r.dischargeAmount ?? r.discharge_amount ?? null,
      dischargeType:   Array.isArray(r.dischargeType) ? r.dischargeType : _EMPTY_ARRAY,

      // Scores
      wellnessScore:   r.wellnessScore ?? r.wellness_score ?? null,
      smiScore:        r.smiScore      ?? r.smi_score      ?? null,

      // Body / Disease
      bodyChoices:     r.bodyChoices   ?? r.body_choices   ?? {},
      diseaseCheck:    r.diseaseCheck  ?? r.disease_check  ?? {},
      diseases:        Array.isArray(r.diseases) ? r.diseases : _EMPTY_ARRAY,

      // Factors
      factors:         Array.isArray(r.factors)    ? r.factors    : _EMPTY_ARRAY,
      medication:      Array.isArray(r.medication) ? r.medication : _EMPTY_ARRAY,

      // Meta
      note:            r.note          ?? null,
      isDeleted:       r.isDeleted     ?? r.is_deleted     ?? false,
      consentLevel:    r.consentLevel  ?? r.consent_level  ?? 0,

      // Preserve any extra legacy fields for round-trip safety
      _legacy: r,
    };
  }

  /**
   * Domain-aligned object → legacy shape (for writing back to state JSON).
   * Strips the `_legacy` field; callers must not rely on the exact key set.
   * @param {object} r  domain record
   * @returns {object}  legacy-compatible record
   */
  toLegacy(r) {
    if (!r) return null;
    // Start from the original legacy object if available, then overlay changes
    const base = r._legacy ?? {};
    const date = r.recordDate ?? base.record_date ?? base.date ?? '';
    return {
      ...base,
      // Canonical date fields — always write both for backward compat
      record_date:     date,
      date:            date ? `${date}T00:00:00` : base.date ?? '',

      // Symptoms
      symptoms:        r.symptoms      ?? base.symptoms    ?? [],
      painLevel:       r.painLevel     ?? base.painLevel   ?? null,
      painLocation:    r.painLocation  ?? base.painLocation ?? [],
      painType:        r.painType      ?? base.painType    ?? [],

      // Vitals
      temperature:     r.temperature   ?? base.temperature ?? null,
      tempMethod:      r.tempMethod    ?? base.tempMethod  ?? null,
      energy:          r.energy        ?? base.energy      ?? null,
      mood:            r.mood          ?? base.mood        ?? null,

      // Sleep
      sleepHours:      r.sleepHours    ?? base.sleepHours  ?? null,
      sleepQuality:    r.sleepQuality  ?? base.sleepQuality ?? null,

      // Meta
      note:            r.note          ?? base.note        ?? null,
      isDeleted:       r.isDeleted     ?? base.isDeleted   ?? false,
    };
  }
}
