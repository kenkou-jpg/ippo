import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Isolate CDN deps pulled in via composition-root → adapters → supabase ────
vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: false, userId: null, isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

// ── Contracts via index ──────────────────────────────────────────────────────
import {
  IStorageService,
  IRecordRepository,
  IExperimentRepository,
  IConsentRepository,
  ICaseRepository,
  IAnalyticsService,
  ISimilarityService,
  IAuthService,
} from '../../src/contracts/index.js';

import { TOKENS } from '../../src/application/composition-root.js';
import { assertImplementsContract } from '../../src/application/architecture-guard.js';

// ── Index exports all 8 contracts ────────────────────────────────────────────
describe('contracts/index.js — export completeness', () => {
  it('exports IStorageService',       () => expect(IStorageService).toBeDefined());
  it('exports IRecordRepository',     () => expect(IRecordRepository).toBeDefined());
  it('exports IExperimentRepository', () => expect(IExperimentRepository).toBeDefined());
  it('exports IConsentRepository',    () => expect(IConsentRepository).toBeDefined());
  it('exports ICaseRepository',       () => expect(ICaseRepository).toBeDefined());
  it('exports IAnalyticsService',     () => expect(IAnalyticsService).toBeDefined());
  it('exports ISimilarityService',    () => expect(ISimilarityService).toBeDefined());
  it('exports IAuthService',          () => expect(IAuthService).toBeDefined());
});

// ── Every method throws "Not Implemented" ────────────────────────────────────
describe('IStorageService — all methods throw Not Implemented', () => {
  const s = new IStorageService();
  it('get',    () => expect(() => s.get('k')).toThrow('Not Implemented'));
  it('set',    () => expect(() => s.set('k', 1)).toThrow('Not Implemented'));
  it('remove', () => expect(() => s.remove('k')).toThrow('Not Implemented'));
  it('clear',  () => expect(() => s.clear()).toThrow('Not Implemented'));
  it('has',    () => expect(() => s.has('k')).toThrow('Not Implemented'));
});

describe('IRecordRepository — all methods throw Not Implemented', () => {
  const r = new IRecordRepository();
  it('findById',         () => expect(() => r.findById('x')).toThrow('Not Implemented'));
  it('findByUserAndDate',() => expect(() => r.findByUserAndDate('u','d')).toThrow('Not Implemented'));
  it('findAllByUser',    () => expect(() => r.findAllByUser('u')).toThrow('Not Implemented'));
  it('save',             () => expect(() => r.save({})).toThrow('Not Implemented'));
  it('update',           () => expect(() => r.update('x', {})).toThrow('Not Implemented'));
  it('delete',           () => expect(() => r.delete('x')).toThrow('Not Implemented'));
});

describe('IExperimentRepository — all methods throw Not Implemented', () => {
  const e = new IExperimentRepository();
  it('findById',        () => expect(() => e.findById('x')).toThrow('Not Implemented'));
  it('findAllByUser',   () => expect(() => e.findAllByUser('u')).toThrow('Not Implemented'));
  it('findActiveByUser',() => expect(() => e.findActiveByUser('u')).toThrow('Not Implemented'));
  it('findByStatus',    () => expect(() => e.findByStatus('u', 'ACTIVE')).toThrow('Not Implemented'));
  it('save',            () => expect(() => e.save({})).toThrow('Not Implemented'));
  it('update',          () => expect(() => e.update('x', {})).toThrow('Not Implemented'));
  it('delete',          () => expect(() => e.delete('x')).toThrow('Not Implemented'));
});

describe('IConsentRepository — all methods throw Not Implemented', () => {
  const c = new IConsentRepository();
  it('findByUserId', () => expect(() => c.findByUserId('u')).toThrow('Not Implemented'));
  it('save',         () => expect(() => c.save({})).toThrow('Not Implemented'));
  it('update',       () => expect(() => c.update('x', {})).toThrow('Not Implemented'));
  it('appendEvent',  () => expect(() => c.appendEvent({})).toThrow('Not Implemented'));
});

describe('ICaseRepository — all methods throw Not Implemented', () => {
  const c = new ICaseRepository();
  it('findById',     () => expect(() => c.findById('x')).toThrow('Not Implemented'));
  it('findAllByUser',() => expect(() => c.findAllByUser('u')).toThrow('Not Implemented'));
  it('findByStatus', () => expect(() => c.findByStatus('u', 'CANDIDATE')).toThrow('Not Implemented'));
  it('save',         () => expect(() => c.save({})).toThrow('Not Implemented'));
  it('update',       () => expect(() => c.update('x', {})).toThrow('Not Implemented'));
});

describe('IAnalyticsService — all methods throw Not Implemented', () => {
  const a = new IAnalyticsService();
  it('track',            () => expect(() => a.track('e', 'u')).toThrow('Not Implemented'));
  it('calculate',        () => expect(() => a.calculate('u')).toThrow('Not Implemented'));
  it('generateInsights', () => expect(() => a.generateInsights('u')).toThrow('Not Implemented'));
});

describe('ISimilarityService — all methods throw Not Implemented', () => {
  const s = new ISimilarityService();
  it('calculateSimilarity',() => expect(() => s.calculateSimilarity('a','b')).toThrow('Not Implemented'));
  it('findSimilarCases',   () => expect(() => s.findSimilarCases('x', 5)).toThrow('Not Implemented'));
  it('buildEdges',         () => expect(() => s.buildEdges([])).toThrow('Not Implemented'));
  it('upsertEdge',         () => expect(() => s.upsertEdge({})).toThrow('Not Implemented'));
});

describe('IAuthService — all methods throw Not Implemented', () => {
  const a = new IAuthService();
  it('getCurrentUser',    () => expect(() => a.getCurrentUser()).toThrow('Not Implemented'));
  it('signIn',            () => expect(() => a.signIn('e','p')).toThrow('Not Implemented'));
  it('signOut',           () => expect(() => a.signOut()).toThrow('Not Implemented'));
  it('hasPermission',     () => expect(() => a.hasPermission('x')).toThrow('Not Implemented'));
  it('onAuthStateChange', () => expect(() => a.onAuthStateChange(() => {})).toThrow('Not Implemented'));
});

// ── Subclass extends contract → assertImplementsContract passes ──────────────
describe('assertImplementsContract — conformance check', () => {
  it('passes when impl extends the contract', () => {
    class MyStorage extends IStorageService {
      get(key) { return null; }
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertImplementsContract(MyStorage, IStorageService, TOKENS.StorageService);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs error when impl does NOT extend the contract', () => {
    class BadImpl {}
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertImplementsContract(BadImpl, IStorageService, TOKENS.StorageService);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('does not extend IStorageService'));
    spy.mockRestore();
  });
});

// ── Contract has zero dependencies (no domain / no DB / no localStorage) ─────
describe('contracts — no side effects at import time', () => {
  it('IStorageService can be instantiated in a plain object environment', () => {
    expect(() => new IStorageService()).not.toThrow();
  });

  it('IRecordRepository can be instantiated without DOM or storage', () => {
    expect(() => new IRecordRepository()).not.toThrow();
  });
});

// ── TOKENS alignment — every stub has a corresponding contract ───────────────
describe('TOKENS alignment with contracts', () => {
  const contractTokenMap: Record<string, boolean> = {
    [TOKENS.StorageService]:       true,
    [TOKENS.RecordRepository]:     true,
    [TOKENS.ExperimentRepository]: true,
    [TOKENS.ConsentRepository]:    true,
    [TOKENS.CaseRepository]:       true,
    [TOKENS.AnalyticsService]:     true,
    [TOKENS.SimilarityService]:    true,
    [TOKENS.AuthService]:          true,
  };

  it('all 8 contract-bound tokens exist in TOKENS', () => {
    expect(Object.keys(contractTokenMap)).toHaveLength(8);
    for (const token of Object.keys(contractTokenMap)) {
      expect(Object.values(TOKENS)).toContain(token);
    }
  });
});

// ── Architecture Guard — contract→domain forbidden ───────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));

describe('ArchGuard — contract layer rules (PR-011.5)', () => {
  beforeEach(() => {
    const { runArchitectureGuard } = require('../../src/application/architecture-guard.js');
    delete (globalThis as any).window.__ippoArchGuard;
    runArchitectureGuard();
  });

  it('flags contract→domain violation', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/contracts/IRecord.js', '/src/domains/record/index.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('contract→domain'));
    spy.mockRestore();
  });

  it('flags contract→repository violation', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/contracts/IRecord.js', '/src/repositories/RecordRepo.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('contract→repository'));
    spy.mockRestore();
  });

  it('flags contract→ui violation', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/contracts/IRecord.js', '/src/screens/RecordScreen.js');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('contract→ui'));
    spy.mockRestore();
  });

  it('allows application→contracts import', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.__ippoArchGuard.check('/src/application/composition-root.js', '/src/contracts/IRecordRepository.js');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
