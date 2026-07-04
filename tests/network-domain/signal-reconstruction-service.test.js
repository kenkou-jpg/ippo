// tests/network-domain/signal-reconstruction-service.test.js
// SignalReconstructionService — Wave1 Stub, PR-033
import { describe, it, expect } from 'vitest';
import { SignalReconstructionService } from '../../src/domains/network/signal-reconstruction-service.js';

const svc = () => new SignalReconstructionService();

// ── canReconstruct() ──────────────────────────────────────────────────────────
describe('SignalReconstructionService.canReconstruct()', () => {
  it('returns canReconstruct:true when records are present', () => {
    const result = svc().canReconstruct([{ id: 'r1' }]);
    expect(result.canReconstruct).toBe(true);
  });

  it('returns canReconstruct:false when records array is empty', () => {
    const result = svc().canReconstruct([]);
    expect(result.canReconstruct).toBe(false);
  });

  it('returns canReconstruct:false when called with no argument', () => {
    const result = svc().canReconstruct();
    expect(result.canReconstruct).toBe(false);
  });

  it('returns correct recordCount', () => {
    const result = svc().canReconstruct([{}, {}, {}]);
    expect(result.recordCount).toBe(3);
  });

  it('returns bd015Compliant:true always', () => {
    expect(svc().canReconstruct([]).bd015Compliant).toBe(true);
    expect(svc().canReconstruct([{}]).bd015Compliant).toBe(true);
  });

  it('includes a note about Wave1 Stub status', () => {
    expect(svc().canReconstruct([]).note).toMatch(/Wave1 Stub/);
  });

  it('handles non-array input gracefully', () => {
    const result = svc().canReconstruct(null);
    expect(result.canReconstruct).toBe(false);
  });
});

// ── rebuildSignals() ──────────────────────────────────────────────────────────
describe('SignalReconstructionService.rebuildSignals()', () => {
  it('returns rebuilt as empty array (Wave1 Stub)', () => {
    const result = svc().rebuildSignals([{ id: 'r1' }]);
    expect(result.rebuilt).toEqual([]);
  });

  it('returns correct recordCount', () => {
    const result = svc().rebuildSignals([{}, {}]);
    expect(result.recordCount).toBe(2);
  });

  it('returns signalCount:0 (Wave1 Stub)', () => {
    expect(svc().rebuildSignals([{}]).signalCount).toBe(0);
  });

  it('returns bd015Compliant:true', () => {
    expect(svc().rebuildSignals([]).bd015Compliant).toBe(true);
  });

  it('includes a note about Wave1 Stub', () => {
    expect(svc().rebuildSignals([]).note).toMatch(/Wave1 Stub/);
  });

  it('handles empty input', () => {
    const result = svc().rebuildSignals([]);
    expect(result.recordCount).toBe(0);
  });

  it('handles no argument', () => {
    expect(() => svc().rebuildSignals()).not.toThrow();
  });
});

// ── verifyIntegrity() ────────────────────────────────────────────────────────
describe('SignalReconstructionService.verifyIntegrity()', () => {
  it('returns verified:true (Wave1 Stub)', () => {
    expect(svc().verifyIntegrity([]).verified).toBe(true);
  });

  it('returns empty issues array', () => {
    expect(svc().verifyIntegrity([]).issues).toEqual([]);
  });

  it('returns correct signalCount', () => {
    const signals = [{}, {}, {}];
    expect(svc().verifyIntegrity(signals).signalCount).toBe(3);
  });

  it('returns bd015Compliant:true', () => {
    expect(svc().verifyIntegrity([]).bd015Compliant).toBe(true);
  });

  it('includes a Wave1 Stub note', () => {
    expect(svc().verifyIntegrity([]).note).toMatch(/Wave1 Stub/);
  });

  it('handles no argument', () => {
    expect(() => svc().verifyIntegrity()).not.toThrow();
  });
});
