// longitudinal-edge-enricher.js — PR-048: Longitudinal Edge Enricher (BD-012).
// Attaches longitudinalContext to a SimilarityEdge AFTER generation.
// BD-012: Longitudinal Signal の Edge 付与は Wave2 スコープ — now active.
// BD-011: enriched edges carry vectorVersion (inherited from original edge).
// BD-031 / BD-038: Pure rule-based — no AI, no LLM, no randomness.
// BD-032: Append-Only — enrichment returns a NEW frozen edge (no mutation).
//
// Key constraint (PR-048 spec):
//   threshold 判定 → rawScore (EdgeGenerator が担当)
//   trendBonus     → displayScore にのみ加算（rawScore は変更しない）
//   trendBonus     = 0.05 when sourceTrend === targetTrend

import { buildDomainEvent }              from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import { SIGNAL_TYPES }                  from '../network/network-signal-types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Bonus added to displayScore when source and target share the same trend. */
export const TREND_BONUS = 0.05;

/** The window length in days for "recent" and "prior" segments. */
export const TREND_WINDOW_DAYS = 30;

/** Trend directions produced by this enricher. */
export const LONGITUDINAL_TREND = Object.freeze({
  IMPROVING: 'IMPROVING',
  STABLE:    'STABLE',
  WORSENING: 'WORSENING',
  UNKNOWN:   'UNKNOWN',
});

/** Delta (normalizedValue difference) below which we call trend STABLE. */
const STABLE_THRESHOLD = 0.05;

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Compute a composite 30-day trend for a case's signals.
 * Uses PAIN + SYMPTOM signals (primary disease burden signals).
 * "recent" = last TREND_WINDOW_DAYS; "prior" = previous TREND_WINDOW_DAYS.
 *
 * @param {object[]} signals  NetworkSignal[] for this case
 * @param {Date}     refDate  Reference date (default: now)
 * @returns {'IMPROVING'|'STABLE'|'WORSENING'|'UNKNOWN'}
 */
export function computeCaseTrend(signals, refDate = new Date()) {
  if (!Array.isArray(signals) || signals.length === 0) return LONGITUDINAL_TREND.UNKNOWN;

  const refMs   = refDate.getTime();
  const day30Ms = TREND_WINDOW_DAYS * 86_400_000;

  // Primary signals: PAIN and SYMPTOM (lower is better — delta < 0 → IMPROVING)
  const primary = signals.filter(s =>
    s?.signalType === SIGNAL_TYPES.PAIN || s?.signalType === SIGNAL_TYPES.SYMPTOM,
  );

  if (primary.length === 0) return LONGITUDINAL_TREND.UNKNOWN;

  const recent = primary.filter(s => {
    const ts = s.timestamp ?? s.createdAt ?? null;
    if (!ts) return false;
    const diff = refMs - new Date(ts).getTime();
    return diff >= 0 && diff < day30Ms;
  });

  const prior = primary.filter(s => {
    const ts = s.timestamp ?? s.createdAt ?? null;
    if (!ts) return false;
    const diff = refMs - new Date(ts).getTime();
    return diff >= day30Ms && diff < 2 * day30Ms;
  });

  if (recent.length === 0 || prior.length === 0) return LONGITUDINAL_TREND.UNKNOWN;

  const avgRecent = recent.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0) / recent.length;
  const avgPrior  = prior.reduce((s, sig) =>  s + (sig.normalizedValue ?? 0), 0) / prior.length;
  const delta     = avgRecent - avgPrior;

  if (Math.abs(delta) < STABLE_THRESHOLD) return LONGITUDINAL_TREND.STABLE;
  // Lower PAIN/SYMPTOM = better → negative delta = IMPROVING
  return delta < 0 ? LONGITUDINAL_TREND.IMPROVING : LONGITUDINAL_TREND.WORSENING;
}

// ── LongitudinalEdgeEnricher ──────────────────────────────────────────────────

export class LongitudinalEdgeEnricher {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Enrich a SimilarityEdge with longitudinalContext.
   * Returns a NEW frozen edge — original is never mutated (BD-032).
   *
   * rawScore   = original edge.score (threshold decision, unchanged)
   * displayScore = rawScore + trendBonus (capped at 1.0)
   *
   * @param {{
   *   edge:          object,   SimilarityEdge from EdgeGenerator
   *   sourceSignals: object[], NetworkSignal[] for the source case
   *   targetSignals: object[], NetworkSignal[] for the target case
   *   refDate?:      Date,     reference date for window calculation (default: now)
   * }} params
   * @returns {Readonly<object>} Enriched SimilarityEdge
   */
  enrich({ edge, sourceSignals = [], targetSignals = [], refDate = new Date() }) {
    if (!edge || typeof edge !== 'object') {
      throw new TypeError('[LongitudinalEdgeEnricher] edge is required');
    }
    if (!edge.edgeId || !edge.sourceCaseId || !edge.targetCaseId) {
      throw new Error('[LongitudinalEdgeEnricher] edge must have edgeId, sourceCaseId, targetCaseId');
    }

    const sourceTrend = computeCaseTrend(sourceSignals, refDate);
    const targetTrend = computeCaseTrend(targetSignals, refDate);
    const trendMatch  = sourceTrend !== LONGITUDINAL_TREND.UNKNOWN
                     && targetTrend !== LONGITUDINAL_TREND.UNKNOWN
                     && sourceTrend === targetTrend;
    const trendBonus  = trendMatch ? TREND_BONUS : 0;

    const rawScore     = edge.score;                                    // threshold uses this
    const displayScore = Math.min(1, rawScore + trendBonus);           // capped [0,1]

    const longitudinalContext = Object.freeze({
      sourceTrend,
      targetTrend,
      trendMatch,
      trendBonus,
    });

    const enriched = Object.freeze({
      ...edge,
      rawScore,
      displayScore,
      longitudinalContext,
      enrichedAt: new Date().toISOString(),
    });

    this.#publishEnriched(enriched);
    return enriched;
  }

  /**
   * Enrich multiple edges.
   * Each entry: { edge, sourceSignals, targetSignals, refDate? }
   *
   * @param {Array<{ edge: object, sourceSignals?: object[], targetSignals?: object[], refDate?: Date }>} entries
   * @returns {Readonly<object>[]}
   */
  enrichAll(entries = []) {
    return entries.map(entry => this.enrich({
      edge:          entry.edge,
      sourceSignals: entry.sourceSignals ?? [],
      targetSignals: entry.targetSignals ?? [],
      refDate:       entry.refDate ?? new Date(),
    }));
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishEnriched(enrichedEdge) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.LONGITUDINAL_EDGE_ENRICHED,
        aggregateType: AGGREGATE_TYPES.SIMILARITY,
        aggregateId:   enrichedEdge.edgeId,
        payload:       Object.freeze({
          edgeId:            enrichedEdge.edgeId,
          sourceCaseId:      enrichedEdge.sourceCaseId,
          targetCaseId:      enrichedEdge.targetCaseId,
          rawScore:          enrichedEdge.rawScore,
          displayScore:      enrichedEdge.displayScore,
          trendMatch:        enrichedEdge.longitudinalContext.trendMatch,
          trendBonus:        enrichedEdge.longitudinalContext.trendBonus,
          enrichedAt:        enrichedEdge.enrichedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort.
    }
  }
}
