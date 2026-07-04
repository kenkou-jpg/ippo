// disease-cluster-snapshot-entity.js — PR-046: DiseaseCluster Statistics Snapshot.
// BD-018: every snapshot must contain generatedAt.
// BD-028: cluster statistics with k < 5 must NOT be published.
// BD-032: snapshots are Append-Only (no update / delete).
// Supabase table design (disease_cluster_snapshots — future migration):
//   id            TEXT PRIMARY KEY
//   cluster_id    TEXT NOT NULL
//   case_count    INTEGER NOT NULL
//   signal_means  JSONB NOT NULL
//   percentiles   JSONB NOT NULL
//   dominant_phase TEXT
//   generated_at  TIMESTAMPTZ NOT NULL
//   version       TEXT NOT NULL DEFAULT '1'

let _counter = 0;

/**
 * Build an immutable DiseaseClusterSnapshot.
 * BD-018: generatedAt is mandatory.
 * BD-028: caller must ensure caseCount >= k-threshold before publishing.
 *
 * @param {{
 *   clusterId:         string,
 *   caseCount:         number,
 *   signalMeans:       Record<string, number>,
 *   signalPercentiles: Record<string, { p25: number, p50: number, p75: number, p90: number }>,
 *   dominantPhase:     string | null,
 *   schedule?:         'weekly' | 'daily',
 * }} params
 * @returns {Readonly<object>}
 */
export function buildDiseaseClusterSnapshot({
  clusterId,
  caseCount,
  signalMeans,
  signalPercentiles,
  dominantPhase = null,
  schedule      = 'weekly',
}) {
  if (!clusterId || typeof clusterId !== 'string') {
    throw new Error('[DiseaseClusterSnapshot] clusterId is required');
  }
  if (typeof caseCount !== 'number' || caseCount < 0) {
    throw new Error('[DiseaseClusterSnapshot] caseCount must be a non-negative number');
  }

  return Object.freeze({
    id:                `csnap_${clusterId}_${++_counter}_${Date.now()}`,
    clusterId,
    caseCount,
    signalMeans:       Object.freeze({ ...signalMeans }),
    signalPercentiles: Object.freeze(
      Object.fromEntries(
        Object.entries(signalPercentiles).map(([k, v]) => [k, Object.freeze({ ...v })]),
      ),
    ),
    dominantPhase:     dominantPhase ?? null,
    generatedAt:       new Date().toISOString(),  // BD-018
    schedule,
    version:           '1',
  });
}
