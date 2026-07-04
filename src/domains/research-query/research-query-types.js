// research-query-types.js — Research Query API SSOT.
// PR-071: Research Query API (Phase F継続)

/**
 * The 4 supported QueryTypes (Roadmap PR-071 責務②).
 * @readonly
 */
export const QUERY_TYPES = Object.freeze({
  COHORT_STATS:            'COHORT_STATS',
  SIGNAL_CORRELATION:      'SIGNAL_CORRELATION',
  DISEASE_CLUSTER_COMPARE: 'DISEASE_CLUSTER_COMPARE',
  KG_PATH_QUERY:           'KG_PATH_QUERY',
});

/** Current QueryResult schema version. Bump on structural changes. */
export const RESEARCH_QUERY_SCHEMA_VERSION = '1';

/** Guard against unbounded KG traversal (KG_PATH_QUERY). */
export const KG_PATH_QUERY_MAX_DEPTH = 4;
