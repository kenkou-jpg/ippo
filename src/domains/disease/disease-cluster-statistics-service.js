// disease-cluster-statistics-service.js — PR-046: Disease Cluster Statistics (BD-009).
// Stateless, pure computation — no AI, no LLM, no randomness (BD-031 / BD-038).
// BD-009: clusterId === diseaseKey in Wave1.
// BD-028: caller must enforce k-threshold before publishing results.
// BD-018: all snapshots include generatedAt.
// BD-032: Append-Only — no mutation of stored signals or clusters.

import { buildDiseaseClusterSnapshot } from './disease-cluster-snapshot-entity.js';
import { buildDomainEvent }             from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import { MENSTRUAL_PHASES }             from '../menstrual/menstrual-types.js';

// ── Internal pure helpers ───────────────────────────────────────────────────

/** Arithmetic mean of a numeric array. Returns 0 for empty arrays. */
function _mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Percentile via linear interpolation (inclusive).
 * @param {number[]} sorted  Pre-sorted ascending array.
 * @param {number}   p       Percentile 0–100.
 */
function _percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx  = (p / 100) * (sorted.length - 1);
  const lo   = Math.floor(idx);
  const hi   = Math.ceil(idx);
  const frac = idx - lo;
  return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
}

/**
 * Determine the dominant menstrual phase from signals.
 * Only counts explicit (non-UNKNOWN) phases.
 * Returns null if no phase information is available.
 *
 * @param {object[]} signals  NetworkSignal array
 * @returns {string | null}
 */
function _dominantPhase(signals) {
  const counts = {};
  for (const s of signals) {
    const phase = s.menstrualPhase ?? s.metadata?.phase ?? null;
    if (phase && phase !== MENSTRUAL_PHASES.UNKNOWN) {
      counts[phase] = (counts[phase] ?? 0) + 1;
    }
  }
  if (Object.keys(counts).length === 0) return null;
  return Object.entries(counts).reduce(
    (best, [phase, cnt]) => cnt > best[1] ? [phase, cnt] : best,
    [null, -1],
  )[0];
}

// ── Service ────────────────────────────────────────────────────────────────

export class DiseaseClusterStatisticsService {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Compute a full cluster profile from a set of NetworkSignals.
   *
   * Callers provide the pre-filtered signals that belong to the cluster
   * (i.e. signals derived from records of users with clusterId as diseaseKey).
   * BD-009: clusterId === diseaseKey.
   * BD-028: caller must not publish if caseCount < 5.
   *
   * @param {string}   clusterId  Disease cluster key (= diseaseKey)
   * @param {object[]} signals    NetworkSignal array for this cluster
   * @returns {Readonly<{
   *   clusterId:         string,
   *   caseCount:         number,
   *   signalMeans:       Record<string, number>,
   *   signalPercentiles: Record<string, { p25, p50, p75, p90 }>,
   *   dominantPhase:     string | null,
   *   generatedAt:       string,
   * }>}
   */
  computeClusterProfile(clusterId, signals = []) {
    if (!clusterId || typeof clusterId !== 'string') {
      throw new Error('[DiseaseClusterStatisticsService] clusterId is required');
    }
    if (!Array.isArray(signals)) {
      throw new TypeError('[DiseaseClusterStatisticsService] signals must be an array');
    }

    // Group normalizedValues by signalType
    const grouped = {};
    for (const s of signals) {
      const type = s.signalType;
      if (!type) continue;
      grouped[type] ??= [];
      grouped[type].push(s.normalizedValue ?? 0);
    }

    const signalMeans       = {};
    const signalPercentiles = {};

    for (const [type, values] of Object.entries(grouped)) {
      const sorted = [...values].sort((a, b) => a - b);
      signalMeans[type]       = _mean(sorted);
      signalPercentiles[type] = Object.freeze({
        p25: _percentile(sorted, 25),
        p50: _percentile(sorted, 50),
        p75: _percentile(sorted, 75),
        p90: _percentile(sorted, 90),
      });
    }

    const caseCount     = new Set(signals.map(s => s.recordId).filter(Boolean)).size;
    const dominantPhase = _dominantPhase(signals);

    const profile = Object.freeze({
      clusterId,
      caseCount,
      signalMeans:       Object.freeze(signalMeans),
      signalPercentiles: Object.freeze(signalPercentiles),
      dominantPhase,
      generatedAt:       new Date().toISOString(),
    });

    this.#publishClusterComputed(profile);
    return profile;
  }

  /**
   * Compute a case's rank within its cluster.
   *
   * @param {string}   caseId          Identifier for the case being ranked
   * @param {string}   clusterId       Disease cluster key
   * @param {object[]} caseSignals     Signals belonging to this specific case
   * @param {object[]} allClusterSignals  All signals for the cluster (for ranking)
   * @returns {Readonly<{ caseId: string, clusterId: string, percentile: number, signalRanks: Record<string, number> }>}
   */
  getCaseRankInCluster(caseId, clusterId, caseSignals = [], allClusterSignals = []) {
    if (!caseId || typeof caseId !== 'string') {
      throw new Error('[DiseaseClusterStatisticsService] caseId is required');
    }
    if (!clusterId || typeof clusterId !== 'string') {
      throw new Error('[DiseaseClusterStatisticsService] clusterId is required');
    }

    // Group cluster signals by type → sorted values
    const clusterByType = {};
    for (const s of allClusterSignals) {
      const t = s.signalType;
      if (!t) continue;
      clusterByType[t] ??= [];
      clusterByType[t].push(s.normalizedValue ?? 0);
    }
    for (const t of Object.keys(clusterByType)) {
      clusterByType[t].sort((a, b) => a - b);
    }

    // Compute case mean per signalType → percentile rank within cluster
    const caseMeanByType = {};
    const caseGrouped    = {};
    for (const s of caseSignals) {
      const t = s.signalType;
      if (!t) continue;
      caseGrouped[t] ??= [];
      caseGrouped[t].push(s.normalizedValue ?? 0);
    }
    for (const [t, vs] of Object.entries(caseGrouped)) {
      caseMeanByType[t] = _mean(vs);
    }

    const signalRanks = {};
    for (const [type, caseMean] of Object.entries(caseMeanByType)) {
      const sorted = clusterByType[type] ?? [];
      if (sorted.length === 0) {
        signalRanks[type] = 50; // default mid-rank if no cluster data
        continue;
      }
      const below = sorted.filter(v => v <= caseMean).length;
      signalRanks[type] = Math.round((below / sorted.length) * 100);
    }

    // Overall percentile: average across signalTypes that have cluster data
    const ranks  = Object.values(signalRanks);
    const overall = ranks.length > 0 ? Math.round(_mean(ranks)) : 50;

    return Object.freeze({
      caseId,
      clusterId,
      percentile:  overall,
      signalRanks: Object.freeze(signalRanks),
    });
  }

  /**
   * Create a DiseaseClusterSnapshot (weekly / BD-018).
   * Wraps computeClusterProfile() result into a persisted snapshot shape.
   * BD-028: does NOT enforce k-threshold here — caller must check caseCount >= 5.
   *
   * @param {string}   clusterId
   * @param {object[]} signals
   * @param {{ schedule?: 'weekly' | 'daily' }} options
   * @returns {Readonly<object>}  DiseaseClusterSnapshot
   */
  createClusterSnapshot(clusterId, signals = [], { schedule = 'weekly' } = {}) {
    const profile = this.computeClusterProfile(clusterId, signals);
    return buildDiseaseClusterSnapshot({
      clusterId,
      caseCount:         profile.caseCount,
      signalMeans:       profile.signalMeans,
      signalPercentiles: profile.signalPercentiles,
      dominantPhase:     profile.dominantPhase,
      schedule,
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishClusterComputed(profile) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.DISEASE_CLUSTER_COMPUTED,
        aggregateType: AGGREGATE_TYPES.DISEASE,
        aggregateId:   profile.clusterId,
        payload:       Object.freeze({
          clusterId:     profile.clusterId,
          caseCount:     profile.caseCount,
          dominantPhase: profile.dominantPhase,
          generatedAt:   profile.generatedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
