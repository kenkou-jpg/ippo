// disease-types.js — SSOT for all Disease domain type registries.
// IPPO-GOV-001 (LEGACY_ASSET_INVENTORY.md) BD-004 / BD-008 compliance:
//   Disease information is structured across 4 layers (Record/Profile/Case/Network).
//   Wave1: foundation only — no Diagnosis Engine, no Recommendation, no Network Search.
// PR-029: Disease Entity Foundation

/**
 * Disease category registry.
 * All categories are frozen. Free-text entry is forbidden for controlled fields.
 * @readonly
 */
export const DISEASE_CATEGORIES = Object.freeze({
  GYNECOLOGY:  'Gynecology',
  ENDOCRINE:   'Endocrine',
  DIGESTIVE:   'Digestive',
  MENTAL:      'Mental',
  DERMATOLOGY: 'Dermatology',
  NEUROLOGY:   'Neurology',
  UNKNOWN:     'Unknown',
});

/**
 * Disease severity levels.
 * UNKNOWN is the default when the user has not specified severity.
 * @readonly
 */
export const DISEASE_SEVERITY = Object.freeze({
  LOW:     'LOW',
  MEDIUM:  'MEDIUM',
  HIGH:    'HIGH',
  UNKNOWN: 'UNKNOWN',
});

/**
 * Diagnostic confidence levels.
 * USER_REPORTED: self-diagnosed / suspected.
 * PHYSICIAN_CONFIRMED: formally diagnosed by a physician.
 * UNKNOWN: confidence not stated.
 * @readonly
 */
export const DISEASE_CONFIDENCE = Object.freeze({
  USER_REPORTED:       'USER_REPORTED',
  PHYSICIAN_CONFIRMED: 'PHYSICIAN_CONFIRMED',
  UNKNOWN:             'UNKNOWN',
});

/**
 * Who confirmed the diagnosis — PR-045: DiseaseEntity V2 Upgrade.
 * SELF: user self-reported. PHYSICIAN: formally confirmed by a physician.
 * @readonly
 */
export const CONFIRMED_BY = Object.freeze({
  SELF:      'SELF',
  PHYSICIAN: 'PHYSICIAN',
  UNKNOWN:   'UNKNOWN',
});

/** Convenience sets for O(1) membership checks. */
export const DISEASE_CATEGORY_VALUES   = Object.freeze(new Set(Object.values(DISEASE_CATEGORIES)));
export const DISEASE_SEVERITY_VALUES   = Object.freeze(new Set(Object.values(DISEASE_SEVERITY)));
export const DISEASE_CONFIDENCE_VALUES = Object.freeze(new Set(Object.values(DISEASE_CONFIDENCE)));
export const CONFIRMED_BY_VALUES       = Object.freeze(new Set(Object.values(CONFIRMED_BY)));
