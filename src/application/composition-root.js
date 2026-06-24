// Composition Root — the ONLY place where `new` is called for production dependencies.
// All wiring lives here. PR-012+ will replace null stubs with real implementations.
//
// ── Contract Audit (PR-011.5) ────────────────────────────────────────────────
// Every non-null registration MUST extend the matching contract (enforced at module load
// via assertImplementsContract() at the bottom of each adapter file).
//
// Token → Contract → Adapter (current) → Target PR
//   StorageService       → IStorageService       → LocalStorageAdapter   (PR-012 ✓)
//   AuthService          → IAuthService          → LegacyAuthAdapter     (PR-012 ✓)
//   RecordRepository     → IRecordRepository     → null stub             (PR-013)
//   ExperimentRepository → IExperimentRepository → null stub             (PR-014)
//   ConsentRepository    → IConsentRepository    → null stub             (PR-015)
//   CaseRepository       → ICaseRepository       → null stub             (PR-016)
//   AnalyticsService     → IAnalyticsService     → null stub             (PR-017)
//   SimilarityService    → ISimilarityService    → null stub             (PR-018)
// ────────────────────────────────────────────────────────────────────────────
import { LegacyBridge }         from '../legacy/legacy-bridge.js';
import { LocalStorageAdapter }  from '../adapters/storage/local-storage-adapter.js';
import { LegacyAuthAdapter }    from '../adapters/auth/legacy-auth-adapter.js';

// DI token constants — use these everywhere instead of bare strings
export const TOKENS = Object.freeze({
  Config:               'Config',
  LegacyBridge:         'LegacyBridge',
  StorageService:       'StorageService',
  AuthService:          'AuthService',
  RecordRepository:     'RecordRepository',
  ExperimentRepository: 'ExperimentRepository',
  ConsentRepository:    'ConsentRepository',
  CaseRepository:       'CaseRepository',
  AnalyticsService:     'AnalyticsService',
  SimilarityService:    'SimilarityService',
});

export class CompositionRoot {
  #container;
  #registry;
  #config;

  constructor(container, registry, config) {
    this.#container = container;
    this.#registry  = registry;
    this.#config    = config;
  }

  assemble() {
    const c = this.#container;

    // ── Infrastructure (PR-012) ────────────────────────────────────────────
    c.singleton(TOKENS.Config,        () => this.#config);
    c.singleton(TOKENS.LegacyBridge,  () => new LegacyBridge());
    c.singleton(TOKENS.StorageService, () => new LocalStorageAdapter());
    c.singleton(TOKENS.AuthService,    () => new LegacyAuthAdapter());

    // ── Null stubs — replaced in listed PRs ───────────────────────────────
    // Replacement rule: impl MUST extend the contract listed in the audit above.
    c.singleton(TOKENS.RecordRepository,     () => null); // PR-013: extends IRecordRepository
    c.singleton(TOKENS.ExperimentRepository, () => null); // PR-014: extends IExperimentRepository
    c.singleton(TOKENS.ConsentRepository,    () => null); // PR-015: extends IConsentRepository
    c.singleton(TOKENS.CaseRepository,       () => null); // PR-016: extends ICaseRepository
    c.singleton(TOKENS.AnalyticsService,     () => null); // PR-017: extends IAnalyticsService
    c.singleton(TOKENS.SimilarityService,    () => null); // PR-018: extends ISimilarityService

    this._registerFeatures();
  }

  _registerFeatures() {
    const r = this.#registry;
    r.register('Record',     { status: 'legacy', migratesIn: 'PR-013' });
    r.register('Experiment', { status: 'legacy', migratesIn: 'PR-014' });
    r.register('Case',       { status: 'legacy', migratesIn: 'PR-016' });
    r.register('Consent',    { status: 'legacy', migratesIn: 'PR-015' });
    r.register('Analytics',  { status: 'legacy', migratesIn: 'PR-017' });
    r.register('Similarity', { status: 'legacy', migratesIn: 'PR-018' });
    r.register('Auth',       { status: 'adapter', migratesIn: 'PR-012' });
    r.register('B2BExport',  { status: 'legacy', migratesIn: 'PR-020' });
  }
}
