// tests/research/consent-gate-service.test.js — Release Readiness Recovery PR-076.
// ConsentGateService — BD-021 / BD-049 Research Consent gate.
import { describe, it, expect } from 'vitest';
import {
  ConsentGateService, ResearchConsentNotVerifiedError, RESEARCH_CONSENT_MIN_LEVEL,
} from '../../src/domains/research/consent-gate-service.js';

describe('RESEARCH_CONSENT_MIN_LEVEL', () => {
  it('is 2 (ConsentRepository.js: Level2 = RESEARCH GRANTED)', () => {
    expect(RESEARCH_CONSENT_MIN_LEVEL).toBe(2);
  });
});

describe('ConsentGateService.filterCasesByResearchConsent', () => {
  it('returns empty result for no cases', () => {
    const gate = new ConsentGateService();
    const result = gate.filterCasesByResearchConsent([]);
    expect(result.included).toEqual([]);
    expect(result.excludedCaseIds).toEqual([]);
  });

  it('includes cases with consentLevel >= 2', () => {
    const gate = new ConsentGateService();
    const cases = [{ id: 'C1', consentLevel: 2 }, { id: 'C2', consentLevel: 3 }];
    const result = gate.filterCasesByResearchConsent(cases);
    expect(result.included).toHaveLength(2);
    expect(result.excludedCaseIds).toHaveLength(0);
  });

  it('excludes cases with consentLevel < 2', () => {
    const gate = new ConsentGateService();
    const cases = [{ id: 'C1', consentLevel: 1 }, { id: 'C2', consentLevel: 0 }];
    const result = gate.filterCasesByResearchConsent(cases);
    expect(result.included).toHaveLength(0);
    expect(result.excludedCaseIds).toEqual(['C1', 'C2']);
  });

  it('fail-closed: excludes cases with a missing consentLevel (treated as 0)', () => {
    const gate = new ConsentGateService();
    const result = gate.filterCasesByResearchConsent([{ id: 'C1' }]);
    expect(result.included).toHaveLength(0);
    expect(result.excludedCaseIds).toEqual(['C1']);
  });

  it('returns frozen results', () => {
    const gate = new ConsentGateService();
    const result = gate.filterCasesByResearchConsent([{ id: 'C1', consentLevel: 2 }]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.included)).toBe(true);
    expect(Object.isFrozen(result.excludedCaseIds)).toBe(true);
  });
});

describe('ConsentGateService.assertSignalsConsentVerified', () => {
  it('does not throw when there are no signals', () => {
    const gate = new ConsentGateService();
    expect(() => gate.assertSignalsConsentVerified([], false)).not.toThrow();
  });

  it('does not throw when signalsConsentVerified is true', () => {
    const gate = new ConsentGateService();
    expect(() => gate.assertSignalsConsentVerified([{ id: 's1' }], true)).not.toThrow();
  });

  it('throws ResearchConsentNotVerifiedError when signals exist without verification', () => {
    const gate = new ConsentGateService();
    expect(() => gate.assertSignalsConsentVerified([{ id: 's1' }], false))
      .toThrow(ResearchConsentNotVerifiedError);
  });

  it('throws when signalsConsentVerified is omitted (defaults to false)', () => {
    const gate = new ConsentGateService();
    expect(() => gate.assertSignalsConsentVerified([{ id: 's1' }])).toThrow(/BD-049/);
  });
});
