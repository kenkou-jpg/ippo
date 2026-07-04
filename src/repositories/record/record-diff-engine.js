// RecordDiffEngine — field-by-field comparison between the legacy domain record
// and the v2 shadow record.  Produces a DiffResult containing per-field diffs
// and an overall severity.
//
// Compared fields (per spec):
//   id, date, symptoms, foods, experiments, consentLevel, qualityScore, metadata
// Plus a defensive scan of all keys present in either record.

import { classifySeverity, Severity } from './diff-severity.js';

// Canonical set of fields that MUST be compared (spec-mandated).
const REQUIRED_FIELDS = [
  'id',
  'recordDate',
  'symptoms',
  'foods',
  'experiments',
  'consentLevel',
  'qualityScore',
  'metadata',
];

// Additional fields to compare defensively (common record fields).
const EXTRA_FIELDS = [
  'userId',
  'painLevel',
  'painLocation',
  'painType',
  'menstrualCycle',
  'temperature',
  'energy',
  'mood',
  'sleepHours',
  'sleepQuality',
  'mealCount',
  'fasting',
  'bowel',
  'bowelCount',
  'wellnessScore',
  'smiScore',
  'isDeleted',
  'note',
];

/**
 * @typedef {Object} FieldDiff
 * @property {string}   field
 * @property {unknown}  oldValue
 * @property {unknown}  newValue
 * @property {string}   severity
 */

/**
 * @typedef {Object} DiffResult
 * @property {string}      recordId
 * @property {string}      recordDate
 * @property {boolean}     hasDiff        — true if any field differs
 * @property {string}      maxSeverity    — highest severity across all diffs
 * @property {FieldDiff[]} diffs          — only fields that differ
 * @property {FieldDiff[]} allFields      — every compared field (for audit)
 * @property {string}      ts             — ISO timestamp
 */

export class RecordDiffEngine {
  /**
   * Compare a legacy domain record against a v2 shadow record.
   *
   * @param {object} legacyRecord   — fromLegacy() output (domain shape)
   * @param {object} v2Record       — RecordV2Store output
   * @returns {DiffResult}
   */
  compare(legacyRecord, v2Record) {
    const recordId   = legacyRecord?.id   ?? v2Record?.id   ?? '';
    const recordDate = legacyRecord?.recordDate ?? v2Record?.recordDate ?? '';

    // Missing one side entirely — CRITICAL
    if (!legacyRecord || !v2Record) {
      const severity = Severity.CRITICAL;
      const diff = {
        field:    '_record',
        oldValue: legacyRecord ? 'present' : 'missing',
        newValue: v2Record     ? 'present' : 'missing',
        severity,
      };
      return {
        recordId, recordDate,
        hasDiff: true,
        maxSeverity: severity,
        diffs: [diff],
        allFields: [diff],
        ts: new Date().toISOString(),
      };
    }

    // Union of all field names to compare
    const fieldSet = new Set([
      ...REQUIRED_FIELDS,
      ...EXTRA_FIELDS,
      ...Object.keys(legacyRecord).filter(k => k !== '_legacy'),
      ...Object.keys(v2Record).filter(k => k !== '_v2' && k !== '_savedAt'),
    ]);

    const allFields = [];
    const diffs     = [];
    let   maxSev    = Severity.LOW;

    for (const field of fieldSet) {
      const oldVal = legacyRecord[field];
      const newVal = v2Record[field];

      // Equality check first — identical values are never a diff regardless of field
      const equal = _equal(oldVal, newVal);
      const sev   = equal ? Severity.LOW : classifySeverity(field, oldVal, newVal);

      const entry = { field, oldValue: oldVal, newValue: newVal, severity: sev };
      allFields.push(entry);

      if (!equal) {
        diffs.push(entry);
        if (_sevOrdinal(sev) > _sevOrdinal(maxSev)) maxSev = sev;
      }
    }

    return {
      recordId,
      recordDate,
      hasDiff:     diffs.length > 0,
      maxSeverity: maxSev,
      diffs,
      allFields,
      ts: new Date().toISOString(),
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _sevOrdinal(s) {
  return { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }[s] ?? 0;
}

function _equal(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return String(a) === String(b);
}
