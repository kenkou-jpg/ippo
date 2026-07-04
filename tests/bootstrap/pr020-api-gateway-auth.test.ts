import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted) ────────────────────────────────────────────────────
vi.mock('../../src/legacy/legacy-bridge.js',   () => ({ LegacyBridge: class { boot = vi.fn(); } }));
vi.mock('../../src/modules/app-bootstrap.js',  () => ({ bootstrap: vi.fn() }));
vi.mock('../../src/services/supabase.js',      () => ({ supabase: null }));
vi.mock('../../src/modules/auth/auth-service.js', () => ({
  getAuthState: () => ({ isReady: true, userId: 'u1', isAdmin: false, isPremium: true }),
}));

import { AuthContext, UserSession }       from '../../src/domains/auth/auth-context.js';
import { PermissionPolicy }               from '../../src/domains/auth/permission-policy.js';
import { RoleResolver }                   from '../../src/domains/auth/role-resolver.js';
import { PermissionService, AuthError }   from '../../src/domains/auth/permission-service.js';
import { SimilarityAccessGuard }          from '../../src/domains/auth/similarity-access-guard.js';
import { ApiGateway }                     from '../../src/application/api-gateway.js';
import { ConsentEnforcementService, ConsentRequiredError } from '../../src/domains/consent/consent-enforcement-service.js';
import {
  getSupabaseDirectCount,
  getRepositoryBypassCount,
  getPR020AuditSummary,
} from '../../src/application/legacy-access-audit.js';
import { DependencyContainer }            from '../../src/bootstrap/dependency-container.js';
import { RouteRegistry }                  from '../../src/bootstrap/route-registry.js';
import { CompositionRoot, TOKENS }        from '../../src/application/composition-root.js';
import { runArchitectureGuard }           from '../../src/application/architecture-guard.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAuthService(overrides = {}) {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      id:        overrides.id        ?? 'u1',
      email:     overrides.email     ?? 'test@example.com',
      isAdmin:   overrides.isAdmin   ?? false,
      isPremium: overrides.isPremium ?? true,
    }),
  };
}

function makeNullAuthService() {
  return { getCurrentUser: vi.fn().mockResolvedValue(null) };
}

function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = v; },
    removeItem: (k)    => { delete store[k]; },
  };
}

function buildContainer(storage = makeStorage()) {
  const container = new DependencyContainer();
  const registry  = new RouteRegistry();
  const config    = { storage };
  const root      = new CompositionRoot(container, registry, config);
  root.assemble();
  return { container, registry };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | AuthContext & UserSession', () => {
  it('UserSession is frozen after construction', () => {
    const s = new UserSession({ id: 'u1', role: 'user' });
    expect(() => { (s as any).role = 'admin'; }).toThrow();
    expect(s.isAuthenticated).toBe(true);
  });

  it('AuthContext.guest() returns unauthenticated context', () => {
    const ctx = AuthContext.guest();
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.userId).toBeNull();
    expect(ctx.role).toBe('guest');
  });

  it('AuthContext with session reflects session values', () => {
    const s   = new UserSession({ id: 'u1', role: 'admin', isAdmin: true });
    const ctx = new AuthContext(s);
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.userId).toBe('u1');
    expect(ctx.isAdmin).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | PermissionPolicy', () => {
  const policy = new PermissionPolicy();

  it('user has record:read and record:write', () => {
    expect(policy.allows('user', 'record:read')).toBe(true);
    expect(policy.allows('user', 'record:write')).toBe(true);
  });

  it('user does NOT have network:stats:read', () => {
    expect(policy.allows('user', 'network:stats:read')).toBe(false);
  });

  it('admin has network:stats:read', () => {
    expect(policy.allows('admin', 'network:stats:read')).toBe(true);
  });

  it('user has case:read:own but NOT case:read:all', () => {
    expect(policy.allows('user', 'case:read:own')).toBe(true);
    expect(policy.allows('user', 'case:read:all')).toBe(false);
  });

  it('admin has both case:read:own and case:read:all', () => {
    expect(policy.allows('admin', 'case:read:own')).toBe(true);
    expect(policy.allows('admin', 'case:read:all')).toBe(true);
  });

  it('guest has no permissions', () => {
    expect(policy.allows('guest', 'record:read')).toBe(false);
  });

  it('unknown role falls back to guest (no permissions)', () => {
    expect(policy.allows('superuser' as any, 'record:read')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | RoleResolver', () => {
  const resolver = new RoleResolver();

  it('null → guest', () => expect(resolver.resolve(null)).toBe('guest'));
  it('{ isAdmin: true } → admin', () => expect(resolver.resolve({ isAdmin: true })).toBe('admin'));
  it('{ isAdmin: false } → user', () => expect(resolver.resolve({ isAdmin: false })).toBe('user'));
  it('empty object → user', () => expect(resolver.resolve({})).toBe('user'));
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | PermissionService', () => {
  it('getAuthContext returns guest when unauthenticated', async () => {
    const svc = new PermissionService(makeNullAuthService());
    const ctx = await svc.getAuthContext();
    expect(ctx.isAuthenticated).toBe(false);
  });

  it('getAuthContext returns authenticated context for normal user', async () => {
    const svc = new PermissionService(makeAuthService());
    const ctx = await svc.getAuthContext();
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.userId).toBe('u1');
    expect(ctx.role).toBe('user');
  });

  it('getAuthContext returns admin context when isAdmin=true', async () => {
    const svc = new PermissionService(makeAuthService({ isAdmin: true }));
    const ctx = await svc.getAuthContext();
    expect(ctx.role).toBe('admin');
    expect(ctx.isAdmin).toBe(true);
  });

  it('require() resolves when permission is held', async () => {
    const svc = new PermissionService(makeAuthService());
    const ctx = await svc.require('record:read');
    expect(ctx.isAuthenticated).toBe(true);
  });

  it('require() throws UNAUTHENTICATED when not logged in', async () => {
    const svc = new PermissionService(makeNullAuthService());
    await expect(svc.require('record:read')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('require() throws FORBIDDEN when permission not held', async () => {
    const svc = new PermissionService(makeAuthService());
    await expect(svc.require('network:stats:read')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('check() returns false instead of throwing', async () => {
    const svc = new PermissionService(makeAuthService());
    expect(await svc.check('network:stats:read')).toBe(false);
    expect(await svc.check('record:read')).toBe(true);
  });

  it('AuthError is an instance of Error', async () => {
    const svc = new PermissionService(makeNullAuthService());
    const err = await svc.require('record:read').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AuthError');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | SimilarityAccessGuard', () => {
  const guard = new SimilarityAccessGuard();

  it('assertAccess passes when userId matches', () => {
    expect(() => guard.assertAccess('u1', 'u1', false)).not.toThrow();
  });

  it('assertAccess throws FORBIDDEN when userId differs', () => {
    expect(() => guard.assertAccess('u2', 'u1', false)).toThrow(AuthError);
  });

  it('assertAccess passes for admin regardless of userId', () => {
    expect(() => guard.assertAccess('u2', 'u1', true)).not.toThrow();
  });

  it('filterEdges returns only own edges for non-admin', () => {
    const edges = [
      { userId: 'u1', score: 0.9 },
      { userId: 'u2', score: 0.8 },
      { sourceUserId: 'u1', score: 0.7 },
    ];
    const result = guard.filterEdges(edges, 'u1', false);
    expect(result).toHaveLength(2);
    expect(result.every(e => e.userId === 'u1' || e.sourceUserId === 'u1')).toBe(true);
  });

  it('filterEdges returns all edges for admin', () => {
    const edges = [{ userId: 'u1' }, { userId: 'u2' }];
    expect(guard.filterEdges(edges, 'u1', true)).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | ApiGateway — auth enforcement', () => {
  function makeGateway(authOverrides = {}) {
    const authService = makeAuthService(authOverrides);
    const permSvc     = new PermissionService(authService);
    const guard       = new SimilarityAccessGuard();
    const consent     = new ConsentEnforcementService();

    const noopRepo = { findAllByUser: vi.fn().mockResolvedValue([]), save: vi.fn(), findActiveByUser: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(null) };

    return new ApiGateway({
      permissionService:         permSvc,
      similarityAccessGuard:     guard,
      consentEnforcementService: consent,
      recordQueryService:        { findByUser: vi.fn().mockResolvedValue([]) } as any,
      recordCommandService:      { save: vi.fn().mockResolvedValue({ id: 'r1' }) } as any,
      experimentQueryService:    { findActive: vi.fn().mockResolvedValue([]) } as any,
      experimentCommandService:  { create: vi.fn().mockResolvedValue({ id: 'e1' }) } as any,
      caseGenerationService:     { generate: vi.fn().mockResolvedValue({ id: 'c1' }) } as any,
      similarityEngine:          { findSimilar: vi.fn().mockResolvedValue([]) } as any,
    });
  }

  it('getRecords() returns data when authenticated', async () => {
    const gw = makeGateway();
    const result = await gw.getRecords();
    expect(Array.isArray(result)).toBe(true);
  });

  it('getRecords() throws UNAUTHENTICATED when no session', async () => {
    const authSvc = makeNullAuthService();
    const permSvc = new PermissionService(authSvc);
    const gw = new ApiGateway({
      permissionService: permSvc,
      similarityAccessGuard: new SimilarityAccessGuard(),
      consentEnforcementService: new ConsentEnforcementService(),
      recordQueryService: {} as any,
      recordCommandService: {} as any,
      experimentQueryService: {} as any,
      experimentCommandService: {} as any,
      caseGenerationService: {} as any,
      similarityEngine: {} as any,
    });
    await expect(gw.getRecords()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('getSimilarCases() passes with matching userId and consent≥1', async () => {
    const gw = makeGateway();
    const result = await gw.getSimilarCases('c1', { caseUserId: 'u1', consentLevel: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it('getSimilarCases() throws FORBIDDEN when caseUserId differs', async () => {
    const gw = makeGateway();
    await expect(gw.getSimilarCases('c1', { caseUserId: 'u999', consentLevel: 1 }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('getSimilarCases() throws ConsentRequiredError when consent=0', async () => {
    const gw = makeGateway();
    await expect(gw.getSimilarCases('c1', { caseUserId: 'u1', consentLevel: 0 }))
      .rejects.toBeInstanceOf(ConsentRequiredError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | LegacyAccessAudit — PR-020 Audit API', () => {
  it('getSupabaseDirectCount returns count of window.supabase violations', () => {
    const count = getSupabaseDirectCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('getRepositoryBypassCount returns count of localStorage violations', () => {
    const count = getRepositoryBypassCount();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0); // known violations still in place
  });

  it('getPR020AuditSummary returns object with all three keys', () => {
    const summary = getPR020AuditSummary();
    expect(summary).toHaveProperty('supabaseDirect');
    expect(summary).toHaveProperty('repositoryBypass');
    expect(summary).toHaveProperty('total');
    expect(summary.total).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | CompositionRoot — ApiGateway & Auth tokens wired', () => {
  it('ApiGateway resolves from container', () => {
    const { container } = buildContainer();
    const gw = container.resolve(TOKENS.ApiGateway);
    expect(gw).toBeDefined();
    expect(typeof gw.getRecords).toBe('function');
    expect(typeof gw.saveRecord).toBe('function');
    expect(typeof gw.getExperiments).toBe('function');
    expect(typeof gw.createExperiment).toBe('function');
    expect(typeof gw.generateCase).toBe('function');
    expect(typeof gw.getSimilarCases).toBe('function');
  });

  it('PermissionService resolves from container', () => {
    const { container } = buildContainer();
    const svc = container.resolve(TOKENS.PermissionService);
    expect(svc).toBeDefined();
    expect(typeof svc.require).toBe('function');
  });

  it('SimilarityAccessGuard resolves from container', () => {
    const { container } = buildContainer();
    const guard = container.resolve(TOKENS.SimilarityAccessGuard);
    expect(guard).toBeDefined();
    expect(typeof guard.assertAccess).toBe('function');
  });

  it('RecordQueryService resolves from container', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.RecordQueryService)).toBeDefined();
  });

  it('RecordCommandService resolves from container', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.RecordCommandService)).toBeDefined();
  });

  it('ExperimentQueryService resolves from container', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.ExperimentQueryService)).toBeDefined();
  });

  it('ExperimentCommandService resolves from container', () => {
    const { container } = buildContainer();
    expect(container.resolve(TOKENS.ExperimentCommandService)).toBeDefined();
  });

  it('Feature Registry includes Auth=active and API=active', () => {
    const { registry } = buildContainer();
    const features = registry.getAll();
    expect(features.get('Auth')?.status).toBe('active');
    expect(features.get('API')?.status).toBe('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PR-020 | ArchitectureGuard — PR-020 rules registered', () => {
  it('guard installs without error', () => {
    // JSDOM environment — window is available
    expect(() => runArchitectureGuard()).not.toThrow();
  });

  it('screen→LegacyAuthAdapter violation is detected', () => {
    runArchitectureGuard();
    const guard = (window as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/screens/some-screen.js', '/adapters/auth/legacy-auth-adapter.js');
    expect(guard.violations.some((v: any) => v.label === 'screen→LegacyAuthAdapter')).toBe(true);
  });

  it('feature→AdapterDirect violation is detected', () => {
    runArchitectureGuard();
    const guard = (window as any).__ippoArchGuard;
    guard.violations = [];
    guard.check('/features/records/index.js', '/adapters/storage/local-storage-adapter.js');
    expect(guard.violations.some((v: any) => v.label === 'feature→AdapterDirect')).toBe(true);
  });
});
