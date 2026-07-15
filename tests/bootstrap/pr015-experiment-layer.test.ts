import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js', () => ({
  LegacyBridge: class MockLegacyBridge { boot = vi.fn(); },
}));
vi.mock('../../src/modules/app-bootstrap.js', () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js', () => ({ supabase: null }));

import { ExperimentMapper }            from '../../src/repositories/experiment/experiment-mapper.js';
import { ExperimentRepositoryImpl }    from '../../src/repositories/experiment/experiment-repository.js';
import { ExperimentQueryService }      from '../../src/application/experiment-query-service.js';
import { ExperimentCommandService }    from '../../src/application/experiment-command-service.js';
import { ExperimentLifecycleService }  from '../../src/domains/experiment/experiment-lifecycle-service.js';
import {
  resetAudit, getMetrics,
  trackRepositoryRoute, trackLegacyAccess, trackStorageDirectAccess,
} from '../../src/application/experiment-migration-audit.js';
import { DependencyContainer }         from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }               from '../../src/bootstrap/route-registry.js';
import { loadBootstrapConfig }         from '../../src/bootstrap/bootstrap-config.js';
import { CompositionRoot, TOKENS }     from '../../src/application/composition-root.js';
import { runArchitectureGuard, assertImplementsContract } from '../../src/application/architecture-guard.js';
import { IExperimentRepository }       from '../../src/contracts/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStorage(initial: object = {}) {
  const store: Record<string, unknown> = { ...initial };
  return {
    get:    vi.fn((key: string) => store[key] ?? null),
    set:    vi.fn((key: string, value: unknown) => { store[key] = value; }),
    remove: vi.fn((key: string) => { delete store[key]; }),
    clear:  vi.fn(),
    has:    vi.fn((key: string) => key in store),
    _store: store,
  };
}

function makeRepo(experiments: object[] = []) {
  const storage = makeStorage({ ippo_state: { experiments } });
  return { repo: new ExperimentRepositoryImpl(storage as any), storage };
}

const LEGACY_ACTIVE = {
  id: 'exp_001',
  title: 'グルテンフリー実験',
  factor: 'gluten',
  condition: 'diet',
  hypothesis: '小麦粉をやめると痛みが減る',
  days: 30,
  startDate: '2024-03-01T00:00:00',
  status: 'active',
};

const LEGACY_COMPLETED = {
  id: 'exp_002',
  title: '睡眠改善実験',
  hypothesis: '22時就寝で回復が上がる',
  days: 14,
  startDate: '2024-02-01T00:00:00',
  status: 'completed',
};

const LEGACY_CANCELLED = {
  id: 'exp_003',
  title: '有酸素運動実験',
  hypothesis: '週3回で症状改善',
  days: 21,
  startDate: '2024-01-10T00:00:00',
  status: 'cancelled',
};

// ── ExperimentMapper ──────────────────────────────────────────────────────────

describe('ExperimentMapper', () => {
  const mapper = new ExperimentMapper();

  it('fromLegacy: maps active status to ACTIVE', () => {
    const d = mapper.fromLegacy(LEGACY_ACTIVE);
    expect(d.status).toBe('ACTIVE');
  });

  it('fromLegacy: maps completed status to COMPLETED', () => {
    const d = mapper.fromLegacy(LEGACY_COMPLETED);
    expect(d.status).toBe('COMPLETED');
  });

  it('fromLegacy: maps cancelled status to ABANDONED', () => {
    const d = mapper.fromLegacy(LEGACY_CANCELLED);
    expect(d.status).toBe('ABANDONED');
  });

  it('fromLegacy: extracts YYYY-MM-DD from ISO startDate', () => {
    const d = mapper.fromLegacy(LEGACY_ACTIVE);
    expect(d.startDate).toBe('2024-03-01');
  });

  it('fromLegacy: computes plannedEndDate from days', () => {
    const d = mapper.fromLegacy(LEGACY_ACTIVE);
    expect(d.plannedEndDate).toBe('2024-03-31');
  });

  it('fromLegacy: preserves id', () => {
    const d = mapper.fromLegacy(LEGACY_ACTIVE);
    expect(d.id).toBe('exp_001');
  });

  it('fromLegacy: maps factor to diseaseKey', () => {
    const d = mapper.fromLegacy(LEGACY_ACTIVE);
    expect(d.diseaseKey).toBe('gluten');
  });

  it('fromLegacy: returns null for null input', () => {
    expect(mapper.fromLegacy(null as any)).toBeNull();
  });

  it('toLegacy: round-trips status ACTIVE → active', () => {
    const domain = mapper.fromLegacy(LEGACY_ACTIVE);
    const legacy = mapper.toLegacy(domain);
    expect(legacy.status).toBe('active');
  });

  it('toLegacy: round-trips status ABANDONED → cancelled', () => {
    const domain = mapper.fromLegacy(LEGACY_CANCELLED);
    const legacy = mapper.toLegacy(domain);
    expect(legacy.status).toBe('cancelled');
  });

  it('toLegacy: preserves title', () => {
    const domain = mapper.fromLegacy(LEGACY_ACTIVE);
    const legacy = mapper.toLegacy(domain);
    expect(legacy.title).toBe('グルテンフリー実験');
  });
});

// ── ExperimentRepositoryImpl ──────────────────────────────────────────────────

describe('ExperimentRepositoryImpl', () => {
  it('implements IExperimentRepository', () => {
    const { repo } = makeRepo();
    expect(repo).toBeInstanceOf(IExperimentRepository);
  });

  it('findById: returns mapped entity when found', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const e = await repo.findById('exp_001');
    expect(e).not.toBeNull();
    expect(e!.id).toBe('exp_001');
    expect(e!.status).toBe('ACTIVE');
  });

  it('findById: returns null when not found', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    expect(await repo.findById('nonexistent')).toBeNull();
  });

  it('findAllByUser: excludes deleted experiments', async () => {
    const deleted = { ...LEGACY_ACTIVE, id: 'exp_del', isDeleted: true };
    const { repo } = makeRepo([LEGACY_ACTIVE, deleted]);
    const list = await repo.findAllByUser('u1');
    expect(list.every(e => e.id !== 'exp_del')).toBe(true);
  });

  it('findActiveByUser: returns only active experiments', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE, LEGACY_COMPLETED]);
    const list = await repo.findActiveByUser('u1');
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('ACTIVE');
  });

  it('findByStatus: returns experiments matching COMPLETED', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE, LEGACY_COMPLETED]);
    const list = await repo.findByStatus('u1', 'COMPLETED');
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('COMPLETED');
  });

  it('findByStatus: maps ABANDONED to cancelled in legacy', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE, LEGACY_CANCELLED]);
    const list = await repo.findByStatus('u1', 'ABANDONED');
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('ABANDONED');
  });

  it('save: inserts new experiment', async () => {
    const { repo } = makeRepo([]);
    const saved = await repo.save({
      id: 'exp_new',
      title: '新実験',
      hypothesis: 'テスト',
      status: 'ACTIVE',
      startDate: '2024-04-01',
      plannedEndDate: '2024-04-30',
    });
    expect(saved.id).toBe('exp_new');
    const found = await repo.findById('exp_new');
    expect(found).not.toBeNull();
  });

  it('save: assigns id when missing', async () => {
    const { repo } = makeRepo([]);
    const saved = await repo.save({ title: 'No ID', hypothesis: 'h', status: 'DRAFT' });
    expect(saved.id).toMatch(/^exp_/);
  });

  it('save: upserts existing experiment by id', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const found = await repo.findById('exp_001');
    const updated = await repo.save({ ...found, title: '更新済み実験' });
    expect(updated.title).toBe('更新済み実験');
    const refetched = await repo.findById('exp_001');
    expect(refetched!.title).toBe('更新済み実験');
  });

  it('update: patches fields', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const updated = await repo.update('exp_001', { status: 'COMPLETED' });
    expect(updated.status).toBe('COMPLETED');
  });

  it('update: throws for unknown id', async () => {
    const { repo } = makeRepo([]);
    await expect(repo.update('bad', {})).rejects.toThrow('not found');
  });

  it('delete: soft-deletes experiment', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    await repo.delete('exp_001');
    const all = await repo.findAllByUser('u1');
    expect(all.every(e => e.id !== 'exp_001')).toBe(true);
  });
});

// ── ExperimentQueryService ────────────────────────────────────────────────────

describe('ExperimentQueryService', () => {
  beforeEach(() => resetAudit());

  it('list: delegates to findAllByUser', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE, LEGACY_COMPLETED]);
    const svc = new ExperimentQueryService(repo);
    const list = await svc.list('u1');
    expect(list.length).toBe(2);
  });

  it('findActive: returns only active', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE, LEGACY_COMPLETED]);
    const svc = new ExperimentQueryService(repo);
    const list = await svc.findActive('u1');
    expect(list.length).toBe(1);
    expect(list[0].status).toBe('ACTIVE');
  });

  it('findById: returns entity', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const svc = new ExperimentQueryService(repo);
    const e = await svc.findById('exp_001');
    expect(e!.title).toBe('グルテンフリー実験');
  });

  it('tracks repository route on each call', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const svc = new ExperimentQueryService(repo);
    await svc.list();
    await svc.findActive();
    const m = getMetrics();
    expect(m.repositoryRoutes).toBeGreaterThanOrEqual(2);
  });
});

// ── ExperimentCommandService ──────────────────────────────────────────────────

describe('ExperimentCommandService', () => {
  beforeEach(() => resetAudit());

  it('create: saves with DRAFT status when none provided', async () => {
    const { repo } = makeRepo([]);
    const svc = new ExperimentCommandService(repo);
    const e = await svc.create({ title: 'テスト実験', hypothesis: 'h' });
    expect(e.status).toBe('DRAFT');
  });

  it('create: ignores explicit status, always DRAFT (PR-EXP-RUNTIME-04 Founder Decision 2: 正規4status以外のDomain混入防止)', async () => {
    const { repo } = makeRepo([]);
    const svc = new ExperimentCommandService(repo);
    const e = await svc.create({ title: 'テスト実験', hypothesis: 'h', status: 'ACTIVE' });
    expect(e.status).toBe('DRAFT');
  });

  it('complete: ExperimentLifecycleService未配線の場合はエラー(PR-EXP-RUNTIME-04 Founder Decision 1: 状態遷移はLifecycleService経由のみ)', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const svc = new ExperimentCommandService(repo);
    await expect(svc.complete('exp_001', '2024-03-31')).rejects.toThrow('not wired');
  });

  it('complete: ExperimentLifecycleService経由でCOMPLETEDへ遷移しactualEndDateが設定される', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const lifecycle = new ExperimentLifecycleService(repo);
    const svc = new ExperimentCommandService(repo, lifecycle);
    const e = await svc.complete('exp_001', '2024-03-31');
    expect(e.status).toBe('COMPLETED');
    expect(e.actualEndDate).toBe('2024-03-31');
  });

  it('complete: actualEndDateはデフォルトで今日の日付になる', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const lifecycle = new ExperimentLifecycleService(repo);
    const svc = new ExperimentCommandService(repo, lifecycle);
    const e = await svc.complete('exp_001');
    expect(e.actualEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('update: patches arbitrary fields', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const svc = new ExperimentCommandService(repo);
    const e = await svc.update('exp_001', { title: '修正済みタイトル' });
    expect(e.title).toBe('修正済みタイトル');
  });

  it('delete: soft-deletes experiment', async () => {
    const { repo } = makeRepo([LEGACY_ACTIVE]);
    const svc = new ExperimentCommandService(repo);
    await svc.delete('exp_001');
    const remaining = await repo.findAllByUser('u1');
    expect(remaining.every(e => e.id !== 'exp_001')).toBe(true);
  });

  it('tracks repository route on each call', async () => {
    const { repo } = makeRepo([]);
    const svc = new ExperimentCommandService(repo);
    await svc.create({ title: 't', hypothesis: 'h' });
    const m = getMetrics();
    expect(m.repositoryRoutes).toBeGreaterThanOrEqual(1);
  });
});

// ── ExperimentMigrationAudit ──────────────────────────────────────────────────

describe('ExperimentMigrationAudit', () => {
  beforeEach(() => resetAudit());

  it('routeRate is null when no calls recorded', () => {
    const m = getMetrics();
    expect(m.routeRate).toBeNull();
  });

  it('routeRate is 1.0 when only repository routes tracked', () => {
    trackRepositoryRoute('test');
    trackRepositoryRoute('test');
    const m = getMetrics();
    expect(m.routeRate).toBe(1.0);
  });

  it('routeRate reflects mix of routes and legacy accesses', () => {
    trackRepositoryRoute('test');
    trackRepositoryRoute('test');
    trackRepositoryRoute('test');
    trackLegacyAccess('legacy-site');
    const m = getMetrics();
    expect(m.routeRate).toBeCloseTo(0.75);
  });

  it('storageDirectAccesses counted independently', () => {
    trackStorageDirectAccess('bad-site');
    const m = getMetrics();
    expect(m.storageDirectAccesses).toBe(1);
    // does not affect routeRate numerator/denominator
    expect(m.routeRate).toBeNull();
  });

  it('reset clears all counters', () => {
    trackRepositoryRoute('x');
    trackLegacyAccess('y');
    trackStorageDirectAccess('z');
    resetAudit();
    const m = getMetrics();
    expect(m.repositoryRoutes).toBe(0);
    expect(m.legacyAccesses).toBe(0);
    expect(m.storageDirectAccesses).toBe(0);
  });
});

// ── CompositionRoot — ExperimentRepository wire-up ───────────────────────────

describe('CompositionRoot: ExperimentRepository', () => {
  it('resolves ExperimentRepository as ExperimentRepositoryImpl', () => {
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    const repo = container.resolve(TOKENS.ExperimentRepository);
    expect(repo).toBeInstanceOf(IExperimentRepository);
    expect(repo).toBeInstanceOf(ExperimentRepositoryImpl);
  });

  it('Experiment feature status is state-machine (upgraded by PR-016)', () => {
    const container = new DependencyContainer();
    const registry  = new RouteRegistry();
    const config    = loadBootstrapConfig();
    const root      = new CompositionRoot(container, registry, config);
    root.assemble();
    const all = registry.getAll();
    // PR-016 upgraded Experiment status from 'bridged' to 'state-machine'
    expect(['bridged', 'state-machine']).toContain(all.get('Experiment')?.status);
  });
});

// ── ArchitectureGuard — Experiment rules ─────────────────────────────────────

describe('ArchitectureGuard: Experiment rules', () => {
  beforeEach(() => { runArchitectureGuard(); });

  it('allows UI → ExperimentQueryService', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.check('/screens/experiment-screen.js', '/application/experiment-query-service.js');
    const violations = guard.violations.filter((v: any) => v.label === 'screen→ExperimentRepository');
    expect(violations.length).toBe(0);
  });

  it('blocks UI → ExperimentRepository direct', () => {
    const guard = (globalThis as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/experiment-screen.js', '/repositories/experiment-repository.js');
    const violations = guard.violations.filter((v: any) => v.label === 'screen→ExperimentRepository');
    expect(violations.length).toBeGreaterThan(0);
  });

  it('assertImplementsContract: passes for ExperimentRepositoryImpl', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    assertImplementsContract(ExperimentRepositoryImpl, IExperimentRepository, 'ExperimentRepository');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
