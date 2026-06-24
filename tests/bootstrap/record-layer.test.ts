import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: vi.fn(() => ({ isReady: true, userId: 'u1', isPremium: false, isAdmin: false })),
  AUTH_LIFECYCLE: { AUTH_READY: 'AUTH_READY' },
}));

import { LocalStorageAdapter }       from '../../src/adapters/storage/local-storage-adapter.js';
import { RecordMapper }               from '../../src/repositories/record/record-mapper.js';
import { RecordRepositoryImpl }       from '../../src/repositories/record/record-repository.js';
import { RecordQueryService }         from '../../src/application/record-query-service.js';
import { RecordCommandService }       from '../../src/application/record-command-service.js';
import {
  resetAudit, getCoverage,
  trackRepositoryRead, trackRepositoryWrite,
  trackLegacyRead, trackLegacyWrite,
} from '../../src/application/record-migration-audit.js';
import { DependencyContainer }        from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }              from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig }        from '../../src/bootstrap/bootstrap-config.js';
import { CompositionRoot, TOKENS }    from '../../src/application/composition-root.js';
import { runArchitectureGuard }       from '../../src/application/architecture-guard.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(initial: object = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    get: vi.fn((key: string) => store[key] ?? null),
    set: vi.fn((key: string, value: unknown) => { store[key] = value; }),
    remove: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(),
    has:  vi.fn((key: string) => key in store),
    _store: store,
  };
}

function makeRepo(records: object[] = []) {
  const storage = makeStorage({ ippo_state: { records } });
  return { repo: new RecordRepositoryImpl(storage as any), storage };
}

// ── RecordMapper ──────────────────────────────────────────────────────────────

describe('RecordMapper', () => {
  const mapper = new RecordMapper();

  it('normalizeDate: extracts YYYY-MM-DD from ISO string', () => {
    expect(mapper.normalizeDate({ record_date: '2024-03-15T00:00:00' })).toBe('2024-03-15');
  });

  it('normalizeDate: falls back to date field', () => {
    expect(mapper.normalizeDate({ date: '2024-03-15T08:00:00' })).toBe('2024-03-15');
  });

  it('normalizeDate: returns empty string for missing fields', () => {
    expect(mapper.normalizeDate({})).toBe('');
    expect(mapper.normalizeDate(null as any)).toBe('');
  });

  it('fromLegacy: maps snake_case → camelCase', () => {
    const legacy = { record_date: '2024-03-15', pain_level: 3, sleep_hours: 7 };
    const domain = mapper.fromLegacy(legacy);
    expect(domain.recordDate).toBe('2024-03-15');
    expect(domain.painLevel).toBe(3);
    expect(domain.sleepHours).toBe(7);
  });

  it('fromLegacy: safe defaults for missing fields', () => {
    const domain = mapper.fromLegacy({ record_date: '2024-01-01' });
    expect(domain.symptoms).toEqual([]);
    expect(domain.painLocation).toEqual([]);
    expect(domain.isDeleted).toBe(false);
    expect(domain.consentLevel).toBe(0);
  });

  it('fromLegacy: preserves _legacy reference', () => {
    const legacy = { record_date: '2024-01-01', customField: 'x' };
    expect(mapper.fromLegacy(legacy)._legacy).toBe(legacy);
  });

  it('fromLegacy: returns null for null input', () => {
    expect(mapper.fromLegacy(null as any)).toBeNull();
  });

  it('toLegacy: writes both record_date and date', () => {
    const domain = { recordDate: '2024-05-10', note: 'test' };
    const legacy = mapper.toLegacy(domain);
    expect(legacy.record_date).toBe('2024-05-10');
    expect(legacy.date).toBe('2024-05-10T00:00:00');
  });

  it('toLegacy: round-trip preserves extra legacy fields', () => {
    const legacy = { record_date: '2024-01-01', _customLegacyField: 'preserved' };
    const domain = mapper.fromLegacy(legacy);
    const back   = mapper.toLegacy(domain);
    expect(back._customLegacyField).toBe('preserved');
  });
});

// ── RecordRepositoryImpl ──────────────────────────────────────────────────────

describe('RecordRepositoryImpl', () => {
  it('findAllByUser: returns mapped records', async () => {
    const { repo } = makeRepo([
      { record_date: '2024-01-01', pain_level: 2 },
      { record_date: '2024-01-02', pain_level: 5 },
    ]);
    const all = await repo.findAllByUser('u1');
    expect(all).toHaveLength(2);
    expect(all[0].recordDate).toBe('2024-01-01');
    expect(all[1].painLevel).toBe(5);
  });

  it('findAllByUser: returns empty array when no records', async () => {
    const { repo } = makeRepo([]);
    expect(await repo.findAllByUser('u1')).toEqual([]);
  });

  it('findByUserAndDate: finds by date', async () => {
    const { repo } = makeRepo([{ record_date: '2024-06-10', mood: 4 }]);
    const r = await repo.findByUserAndDate('u1', '2024-06-10');
    expect(r).not.toBeNull();
    expect(r!.mood).toBe(4);
  });

  it('findByUserAndDate: returns null for missing date', async () => {
    const { repo } = makeRepo([{ record_date: '2024-06-10' }]);
    expect(await repo.findByUserAndDate('u1', '2024-12-31')).toBeNull();
  });

  it('findById: finds by id field', async () => {
    const { repo } = makeRepo([{ id: 'rec-1', record_date: '2024-06-01' }]);
    const r = await repo.findById('rec-1');
    expect(r).not.toBeNull();
  });

  it('save: upserts by recordDate', async () => {
    const { repo, storage } = makeRepo([{ record_date: '2024-06-15', painLevel: 1 }]);
    await repo.save({ recordDate: '2024-06-15', painLevel: 9 });
    const saved = (storage._store['ippo_state'] as any).records[0];
    expect(saved.painLevel).toBe(9);
  });

  it('save: inserts new record if date not found', async () => {
    const { repo, storage } = makeRepo([]);
    await repo.save({ recordDate: '2024-07-01', mood: 3 });
    expect((storage._store['ippo_state'] as any).records).toHaveLength(1);
  });

  it('update: merges patch into existing record', async () => {
    const { repo } = makeRepo([{ id: 'r1', record_date: '2024-01-10', mood: 1 }]);
    const updated = await repo.update('r1', { mood: 5 });
    expect(updated.mood).toBe(5);
  });

  it('update: throws for unknown id', async () => {
    const { repo } = makeRepo([]);
    await expect(repo.update('no-such', {})).rejects.toThrow('Record not found');
  });

  it('delete: soft-deletes by setting isDeleted', async () => {
    const { repo, storage } = makeRepo([{ id: 'r2', record_date: '2024-01-20' }]);
    await repo.delete('r2');
    const rec = (storage._store['ippo_state'] as any).records[0];
    expect(rec.isDeleted).toBe(true);
  });

  it('delete: no-op for unknown id', async () => {
    const { repo } = makeRepo([]);
    await expect(repo.delete('ghost')).resolves.toBeUndefined();
  });
});

// ── RecordQueryService ────────────────────────────────────────────────────────

describe('RecordQueryService', () => {
  function makeQueryService(records: object[] = []) {
    const { repo } = makeRepo(records);
    return new RecordQueryService(repo);
  }

  it('list: returns all records', async () => {
    const svc = makeQueryService([{ record_date: '2024-01-01' }, { record_date: '2024-01-02' }]);
    expect(await svc.list()).toHaveLength(2);
  });

  it('list: accepts optional userId', async () => {
    const svc = makeQueryService([{ record_date: '2024-01-01' }]);
    expect(await svc.list('u1')).toHaveLength(1);
  });

  it('findByDate: finds record by date string', async () => {
    const svc = makeQueryService([{ record_date: '2024-03-20', energy: 7 }]);
    const r = await svc.findByDate('2024-03-20');
    expect(r!.energy).toBe(7);
  });

  it('findByDate: returns null for missing date', async () => {
    const svc = makeQueryService([]);
    expect(await svc.findByDate('2099-01-01')).toBeNull();
  });

  it('findById: delegates to repository', async () => {
    const svc = makeQueryService([{ id: 'abc', record_date: '2024-06-01' }]);
    const r = await svc.findById('abc');
    expect(r).not.toBeNull();
  });
});

// ── RecordCommandService ──────────────────────────────────────────────────────

describe('RecordCommandService', () => {
  function makeCommandService(records: object[] = []) {
    const { repo, storage } = makeRepo(records);
    return { svc: new RecordCommandService(repo), storage };
  }

  it('save: persists a new record', async () => {
    const { svc, storage } = makeCommandService([]);
    await svc.save({ recordDate: '2024-08-01', mood: 2 });
    expect((storage._store['ippo_state'] as any).records).toHaveLength(1);
  });

  it('update: patches existing record', async () => {
    const { svc } = makeCommandService([{ id: 'x', record_date: '2024-08-01', mood: 1 }]);
    const r = await svc.update('x', { mood: 10 });
    expect(r.mood).toBe(10);
  });

  it('delete: soft-deletes record', async () => {
    const { svc, storage } = makeCommandService([{ id: 'y', record_date: '2024-08-01' }]);
    await svc.delete('y');
    const rec = (storage._store['ippo_state'] as any).records[0];
    expect(rec.isDeleted).toBe(true);
  });
});

// ── RecordMigrationAudit ──────────────────────────────────────────────────────

describe('RecordMigrationAudit', () => {
  beforeEach(() => resetAudit());

  it('getCoverage: returns null when no calls made', () => {
    const c = getCoverage();
    expect(c.reads).toBeNull();
    expect(c.writes).toBeNull();
  });

  it('trackRepositoryRead: increments repository reads', () => {
    trackRepositoryRead();
    trackRepositoryRead();
    const c = getCoverage();
    expect(c.counts.repository).toBe(2);
    expect(c.reads).toBe(1.0);
  });

  it('trackLegacyRead: increments legacy reads', () => {
    trackRepositoryRead();
    trackLegacyRead('test-site');
    const c = getCoverage();
    expect(c.reads).toBeCloseTo(0.5);
  });

  it('trackRepositoryWrite: coverage reflects writes', () => {
    trackRepositoryWrite();
    const c = getCoverage();
    expect(c.counts.writesViaRepo).toBe(1);
    expect(c.writes).toBe(1.0);
  });

  it('trackLegacyWrite: counts legacy writes', () => {
    trackRepositoryWrite();
    trackLegacyWrite('site-a');
    const c = getCoverage();
    expect(c.writes).toBeCloseTo(0.5);
  });

  it('resetAudit: resets all counters', () => {
    trackRepositoryRead();
    trackLegacyRead();
    resetAudit();
    const c = getCoverage();
    expect(c.reads).toBeNull();
  });
});

// ── CompositionRoot: RecordRepository resolution ─────────────────────────────

describe('CompositionRoot — RecordRepository', () => {
  it('resolves RecordRepository as RecordRepositoryImpl', () => {
    vi.stubGlobal('window', {
      SUPABASE_URL: undefined,
      SUPABASE_KEY: undefined,
      dispatchEvent: vi.fn(),
    });
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root = new CompositionRoot(container, registry, config);
    root.assemble();

    const repo = container.resolve(TOKENS.RecordRepository);
    expect(repo).toBeInstanceOf(RecordRepositoryImpl);
  });

  it('RecordRepository depends on StorageService from container', () => {
    vi.stubGlobal('window', {
      SUPABASE_URL: undefined,
      SUPABASE_KEY: undefined,
      dispatchEvent: vi.fn(),
    });
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root = new CompositionRoot(container, registry, config);
    root.assemble();

    const storage = container.resolve(TOKENS.StorageService);
    const repo    = container.resolve(TOKENS.RecordRepository);
    expect(repo).toBeInstanceOf(RecordRepositoryImpl);
    expect(storage).toBeInstanceOf(LocalStorageAdapter);
  });
});

// ── ArchitectureGuard ─────────────────────────────────────────────────────────

describe('ArchitectureGuard', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { __ippoArchGuard: undefined, dispatchEvent: vi.fn() });
    runArchitectureGuard();
  });

  it('installs __ippoArchGuard on window', () => {
    expect((window as any).__ippoArchGuard).toBeDefined();
  });

  it('records forbidden feature→feature violation', () => {
    (window as any).__ippoArchGuard.check('/features/record/index.js', '/features/experiment/index.js');
    expect((window as any).__ippoArchGuard.violations).toHaveLength(1);
    expect((window as any).__ippoArchGuard.violations[0].label).toBe('feature→feature');
  });

  it('records forbidden screen→repository violation', () => {
    (window as any).__ippoArchGuard.check('/screens/record-screen.js', '/repositories/record/record-repository.js');
    expect((window as any).__ippoArchGuard.violations[0].label).toBe('screen→repository');
  });

  it('records forbidden repository→repository violation', () => {
    (window as any).__ippoArchGuard.check('/repositories/a.js', '/repositories/b.js');
    expect((window as any).__ippoArchGuard.violations[0].label).toBe('repository→repository');
  });

  it('does NOT flag adapter→repository (allowed)', () => {
    (window as any).__ippoArchGuard.check('/adapters/storage/local-storage-adapter.js', '/contracts/IStorageService.js');
    expect((window as any).__ippoArchGuard.violations).toHaveLength(0);
  });

  it('does NOT flag application→repository (service layer, allowed)', () => {
    (window as any).__ippoArchGuard.check('/application/record-query-service.js', '/repositories/record/record-repository.js');
    expect((window as any).__ippoArchGuard.violations).toHaveLength(0);
  });
});
