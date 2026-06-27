// emotion-rules.js — Deterministic Emotion Signal Generation Rules (PR-043).
// BD-031: No AI, no LLM, no diagnosis, no treatment, no urgency — pure rule engine.
// BD-024: Emotion Signal auto-generation is Wave2 scope (now active).
// BD-038: Rule-based only — LLM is Wave3+.
//
// Signal generation conditions for each Emotion sub-type:
//   MOOD:       record.moodScore       [0, 10] → EMOTION signal
//   FATIGUE:    record.fatigueLevel    [0, 10] → EMOTION signal
//   STRESS:     record.stressLevel     [0, 10] → EMOTION signal
//   MOTIVATION: record.motivationScore [0, 10] → EMOTION signal
//
// A signal is generated only when the corresponding field is a finite number in [0, 10].
// All rules are stateless and deterministic — same input always yields same output.

import { SIGNAL_TYPES, SIGNAL_UNITS, MENSTRUAL_PHASES } from './network-signal-types.js';

/** Sub-types carried in signal metadata. */
export const EMOTION_SIGNAL_SUBTYPES = Object.freeze({
  MOOD:       'MOOD',
  FATIGUE:    'FATIGUE',
  STRESS:     'STRESS',
  MOTIVATION: 'MOTIVATION',
});

// ── Boundary helpers ──────────────────────────────────────────────────────────

/**
 * Validate and clamp a raw score value.
 * Returns null when the value is absent or non-numeric.
 * @param {unknown} v
 * @returns {number|null}
 */
function _parseScore(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 10) return null;
  return n;
}

/**
 * Normalize a raw score [0, 10] to [0, 1].
 * Precision: 4 decimal places (avoids floating-point drift in tests).
 */
function _normalize(raw) {
  return Math.round((raw / 10) * 10000) / 10000;
}

// ── MOOD rule ─────────────────────────────────────────────────────────────────

/**
 * Classify mood raw score into a deterministic category.
 * Boundaries are inclusive on the lower bound.
 * @param {number} raw  [0, 10]
 * @returns {'POSITIVE'|'NEUTRAL'|'NEGATIVE'}
 */
function _moodCategory(raw) {
  if (raw >= 7) return 'POSITIVE';
  if (raw >= 4) return 'NEUTRAL';
  return 'NEGATIVE';
}

/**
 * Apply the MOOD rule to a record.
 * @param {object} record
 * @param {string} recordId
 * @param {string} timestamp
 * @param {string} menstrualPhase
 * @returns {object|null}  Raw signal params (not yet built) or null when field is absent.
 */
export function applyMoodRule(record, recordId, timestamp, menstrualPhase = MENSTRUAL_PHASES.UNKNOWN) {
  const raw = _parseScore(record?.moodScore);
  if (raw === null) return null;
  return {
    signalType:      SIGNAL_TYPES.EMOTION,
    rawValue:        raw,
    normalizedValue: _normalize(raw),
    unit:            SIGNAL_UNITS.EMOTION,
    recordId,
    timestamp,
    menstrualPhase,
    metadata: {
      subType:  EMOTION_SIGNAL_SUBTYPES.MOOD,
      category: _moodCategory(raw),
      source:   'RULE_ENGINE',
    },
  };
}

// ── FATIGUE rule ──────────────────────────────────────────────────────────────

/**
 * Classify fatigue raw score.
 * @param {number} raw  [0, 10]
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
function _fatigueCategory(raw) {
  if (raw >= 7) return 'HIGH';
  if (raw >= 4) return 'MEDIUM';
  return 'LOW';
}

/**
 * Apply the FATIGUE rule to a record.
 */
export function applyFatigueRule(record, recordId, timestamp, menstrualPhase = MENSTRUAL_PHASES.UNKNOWN) {
  const raw = _parseScore(record?.fatigueLevel);
  if (raw === null) return null;
  return {
    signalType:      SIGNAL_TYPES.EMOTION,
    rawValue:        raw,
    normalizedValue: _normalize(raw),
    unit:            SIGNAL_UNITS.EMOTION,
    recordId,
    timestamp,
    menstrualPhase,
    metadata: {
      subType:  EMOTION_SIGNAL_SUBTYPES.FATIGUE,
      category: _fatigueCategory(raw),
      source:   'RULE_ENGINE',
    },
  };
}

// ── STRESS rule ───────────────────────────────────────────────────────────────

/**
 * Classify stress raw score.
 * @param {number} raw  [0, 10]
 * @returns {'HIGH'|'MODERATE'|'LOW'}
 */
function _stressCategory(raw) {
  if (raw >= 7) return 'HIGH';
  if (raw >= 4) return 'MODERATE';
  return 'LOW';
}

/**
 * Apply the STRESS rule to a record.
 */
export function applyStressRule(record, recordId, timestamp, menstrualPhase = MENSTRUAL_PHASES.UNKNOWN) {
  const raw = _parseScore(record?.stressLevel);
  if (raw === null) return null;
  return {
    signalType:      SIGNAL_TYPES.EMOTION,
    rawValue:        raw,
    normalizedValue: _normalize(raw),
    unit:            SIGNAL_UNITS.EMOTION,
    recordId,
    timestamp,
    menstrualPhase,
    metadata: {
      subType:  EMOTION_SIGNAL_SUBTYPES.STRESS,
      category: _stressCategory(raw),
      source:   'RULE_ENGINE',
    },
  };
}

// ── MOTIVATION rule ───────────────────────────────────────────────────────────

/**
 * Classify motivation raw score.
 * @param {number} raw  [0, 10]
 * @returns {'HIGH'|'MODERATE'|'LOW'}
 */
function _motivationCategory(raw) {
  if (raw >= 7) return 'HIGH';
  if (raw >= 4) return 'MODERATE';
  return 'LOW';
}

/**
 * Apply the MOTIVATION rule to a record.
 */
export function applyMotivationRule(record, recordId, timestamp, menstrualPhase = MENSTRUAL_PHASES.UNKNOWN) {
  const raw = _parseScore(record?.motivationScore);
  if (raw === null) return null;
  return {
    signalType:      SIGNAL_TYPES.EMOTION,
    rawValue:        raw,
    normalizedValue: _normalize(raw),
    unit:            SIGNAL_UNITS.EMOTION,
    recordId,
    timestamp,
    menstrualPhase,
    metadata: {
      subType:  EMOTION_SIGNAL_SUBTYPES.MOTIVATION,
      category: _motivationCategory(raw),
      source:   'RULE_ENGINE',
    },
  };
}

// ── Composite rule application ────────────────────────────────────────────────

/**
 * Apply all four emotion rules to a record.
 * Returns an array of signal param objects (null entries filtered out).
 *
 * @param {object} record
 * @param {{ recordId?: string, timestamp?: string, menstrualPhase?: string }} context
 * @returns {object[]}  Zero to four signal param objects.
 */
export function applyAllEmotionRules(record, {
  recordId       = null,
  timestamp      = new Date().toISOString(),
  menstrualPhase = MENSTRUAL_PHASES.UNKNOWN,
} = {}) {
  const candidates = [
    applyMoodRule(record, recordId, timestamp, menstrualPhase),
    applyFatigueRule(record, recordId, timestamp, menstrualPhase),
    applyStressRule(record, recordId, timestamp, menstrualPhase),
    applyMotivationRule(record, recordId, timestamp, menstrualPhase),
  ];
  return candidates.filter(Boolean);
}
