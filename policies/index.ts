export const QUALITY_SCORE = {
  coverage: 30,
  duration: 30,
  completeness: 15,
  outcome: 15,
  consent: 10,
} as const;

export const TIER_RULES = {
  TIER1: {},
  TIER2: {
    minCoverage: 70,
    requireConsentLevel: 1,
    requireOutcome: true,
  },
  TIER3: {
    consentRequired: false,
  },
} as const;

export const CONSENT_LEVELS = [0, 1, 2, 3] as const;

export type ConsentLevel = typeof CONSENT_LEVELS[number];
