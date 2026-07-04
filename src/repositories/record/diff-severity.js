// Diff Severity — classifies the significance of a field-level difference
// between the legacy record and the v2 shadow store record.
//
// LOW      — format difference only (both values convey the same semantic content)
// MEDIUM   — one side is missing/null where the other has a value
// HIGH     — both sides have a value but they differ
// CRITICAL — identity mismatch, record disappearance, or data corruption

/** @enum {string} */
export const Severity = Object.freeze({
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
});

// Fields whose mismatch is always CRITICAL regardless of the value pair.
const CRITICAL_FIELDS = new Set(['id', 'recordId', 'record_date', 'recordDate']);

// Fields where a null/missing value on one side is only MEDIUM (expected during migration).
const NULLABLE_FIELDS = new Set([
  'qualityScore', 'smiScore', 'wellnessScore',
  'metadata', 'experiments', 'foods',
  'consentLevel',
]);

/**
 * Determine the severity of a single field diff.
 *
 * @param {string} field
 * @param {unknown} oldValue
 * @param {unknown} newValue
 * @returns {import('./diff-severity.js').Severity}
 */
export function classifySeverity(field, oldValue, newValue) {
  // Identity / structural fields — CRITICAL unless values are semantically equal
  if (CRITICAL_FIELDS.has(field)) {
    // Date fields: normalise before escalating (format difference only → LOW)
    if (_isDateField(field)) {
      const o = _extractDate(String(oldValue ?? ''));
      const n = _extractDate(String(newValue ?? ''));
      if (o && n && o === n) return Severity.LOW;
    }
    // Strict equality check
    if (String(oldValue ?? '') === String(newValue ?? '')) return Severity.LOW;
    return Severity.CRITICAL;
  }

  const oldMissing = oldValue == null || oldValue === '' ||
    (Array.isArray(oldValue) && oldValue.length === 0);
  const newMissing = newValue == null || newValue === '' ||
    (Array.isArray(newValue) && newValue.length === 0);

  // Both sides are semantically empty — treat as format-level difference
  if (oldMissing && newMissing) return Severity.LOW;

  // One side is missing — MEDIUM for nullable fields, HIGH otherwise
  if (oldMissing !== newMissing) {
    return NULLABLE_FIELDS.has(field) ? Severity.MEDIUM : Severity.HIGH;
  }

  // Both present — check for format-only diff (same serialised content)
  const oldStr = _stringify(oldValue);
  const newStr = _stringify(newValue);
  if (oldStr === newStr) return Severity.LOW;

  // Date fields: normalise to YYYY-MM-DD before escalating
  if (_isDateField(field)) {
    const o = _extractDate(String(oldValue));
    const n = _extractDate(String(newValue));
    if (o && n && o === n) return Severity.LOW;
  }

  return Severity.HIGH;
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _stringify(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    try { return JSON.stringify(v, Object.keys(v).sort()); } catch { return String(v); }
  }
  return String(v);
}

function _isDateField(field) {
  return /date|Date|_at$|At$/.test(field);
}

function _extractDate(s) {
  const m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
