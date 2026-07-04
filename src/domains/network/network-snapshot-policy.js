// network-snapshot-policy.js — DATA ASSET COUNCIL (IPPO-COUNCIL-003) Section 2 SSOT.
// BD-016: each data asset must be persisted only through its declared SSOT.
// BD-018: Snapshots must include generatedAt and (where applicable) vectorVersion.
// PR-033: NetworkSignal Persistence Foundation
//
// Three categories as per DATA ASSET COUNCIL Section 2:
//   KEEP_FOREVER — permanent storage, DELETE forbidden
//   SNAPSHOT     — latest state saved, re-computable from Layer 1
//   CACHE        — transient, never persisted

export const PERSISTENCE_CATEGORY = Object.freeze({
  KEEP_FOREVER: 'KEEP_FOREVER',
  SNAPSHOT:     'SNAPSHOT',
  CACHE:        'CACHE',
});

// SSOT mapping of every named data asset to its persistence category.
// Source of truth for StorageRepository and PersistentNetworkSignalService decisions.
export const ASSET_PERSISTENCE_POLICY = Object.freeze({
  // KEEP_FOREVER — DELETE forbidden (BD-001, BD-002, BD-022 etc.)
  Record:           PERSISTENCE_CATEGORY.KEEP_FOREVER,
  NetworkSignal:    PERSISTENCE_CATEGORY.KEEP_FOREVER,   // Wave2: Supabase (BD-022)
  DiseaseEntity:    PERSISTENCE_CATEGORY.KEEP_FOREVER,
  Case:             PERSISTENCE_CATEGORY.KEEP_FOREVER,
  Experiment:       PERSISTENCE_CATEGORY.KEEP_FOREVER,
  ConsentEvent:     PERSISTENCE_CATEGORY.KEEP_FOREVER,
  SimilarityEdge:   PERSISTENCE_CATEGORY.KEEP_FOREVER,  // BD-001
  ResearchDataset:  PERSISTENCE_CATEGORY.KEEP_FOREVER,  // BD-021

  // SNAPSHOT — re-computable from Layer 1 Record (BD-015, BD-018)
  Profile:              PERSISTENCE_CATEGORY.SNAPSHOT,
  KpiSnapshot:          PERSISTENCE_CATEGORY.SNAPSHOT,
  SignalSummary:        PERSISTENCE_CATEGORY.SNAPSHOT,   // daily snapshot (Wave2)
  LongitudinalSummary:  PERSISTENCE_CATEGORY.SNAPSHOT,  // weekly snapshot (Wave2)
  SimilaritySnapshot:   PERSISTENCE_CATEGORY.SNAPSHOT,  // per VECTOR_VERSION
  DiseaseSnapshot:      PERSISTENCE_CATEGORY.SNAPSHOT,  // on status change
  NetworkSnapshot:      PERSISTENCE_CATEGORY.SNAPSHOT,  // Disease Cluster stats (Wave2)

  // CACHE — never persisted; re-computed on demand
  MovingAverage:    PERSISTENCE_CATEGORY.CACHE,
  TrendWindow:      PERSISTENCE_CATEGORY.CACHE,
  SignalTimeline:   PERSISTENCE_CATEGORY.CACHE,
  FeatureVector:    PERSISTENCE_CATEGORY.CACHE,
  UISession:        PERSISTENCE_CATEGORY.CACHE,
  PageCache:        PERSISTENCE_CATEGORY.CACHE,
  AnalyticsAggregate: PERSISTENCE_CATEGORY.CACHE,
});

/**
 * Return the persistence category for a named asset.
 * Throws for unknown assets to surface misuse at development time.
 * @param {string} assetName
 * @returns {'KEEP_FOREVER'|'SNAPSHOT'|'CACHE'}
 */
export function getPersistenceCategory(assetName) {
  if (!(assetName in ASSET_PERSISTENCE_POLICY)) {
    throw new Error(
      `[SnapshotPolicy] Unknown asset "${assetName}". ` +
      `Register it in ASSET_PERSISTENCE_POLICY first.`,
    );
  }
  return ASSET_PERSISTENCE_POLICY[assetName];
}

/**
 * Return true if the asset must be kept forever (DELETE forbidden).
 * @param {string} assetName
 * @returns {boolean}
 */
export function isKeepForever(assetName) {
  return getPersistenceCategory(assetName) === PERSISTENCE_CATEGORY.KEEP_FOREVER;
}

/**
 * Return true if the asset is snapshot-persisted (latest version only, re-computable).
 * @param {string} assetName
 * @returns {boolean}
 */
export function isSnapshot(assetName) {
  return getPersistenceCategory(assetName) === PERSISTENCE_CATEGORY.SNAPSHOT;
}

/**
 * Return true if the asset is transient cache (never persisted).
 * @param {string} assetName
 * @returns {boolean}
 */
export function isCache(assetName) {
  return getPersistenceCategory(assetName) === PERSISTENCE_CATEGORY.CACHE;
}
