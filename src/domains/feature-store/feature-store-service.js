// feature-store-service.js — Feature Store V1 Service.
// BD-037: input signals MUST be Supabase-persisted; in-memory Signal is forbidden.
//         Enforcement: every signal must carry persistedId OR options.source === 'supabase'.
// BD-018: FeatureMatrix carries computedAt ISO string (via buildFeatureMatrix).
// BD-031: Pure deterministic computation — no AI / LLM.
// BD-032: All returned objects are frozen.
// PR-053: Feature Store V1

import { buildFeatureMatrix } from './feature-matrix-entity.js';
import { buildDomainEvent }   from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';
import {
  FEATURE_KEYS, WINDOW_DAYS, DELTA_WINDOW_DAYS, PHASE_KEYS, FEATURE_STORE_SCHEMA_VERSION,
} from './feature-store-types.js';

export { FEATURE_KEYS, FEATURE_STORE_SCHEMA_VERSION };

export class FeatureStoreService {
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      import('./feature-store-repository.js').FeatureStoreRepository,
   *   eventPublisher?: object|null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[FeatureStoreService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── BD-037 Guard ──────────────────────────────────────────────────────────

  /**
   * Validate that every signal is from Supabase persistence (BD-037).
   * Pass options.source === 'supabase' as an explicit declaration,
   * OR each signal must carry a non-empty persistedId field.
   * @param {object[]} signals
   * @param {{ source?: string }} options
   */
  #assertPersistedSource(signals, options) {
    if (options?.source === 'supabase') return; // caller attests
    const violator = signals.find(s => !s?.persistedId);
    if (violator) {
      throw new Error(
        '[FeatureStoreService] BD-037 violation: in-memory Signal detected. ' +
        'Only Supabase-persisted signals (with persistedId) are allowed. ' +
        'Pass options.source="supabase" if signals are guaranteed persisted.'
      );
    }
  }

  // ── Core computation ──────────────────────────────────────────────────────

  /**
   * Compute a FeatureMatrix for a single user from their persisted signals.
   *
   * @param {{
   *   userId:   string,
   *   signals:  object[],
   * }} input
   * @param {{
   *   source?:     string,   // 'supabase' to bypass per-signal persistedId check
   *   snapshotId?: string,
   * }} [options={}]
   * @returns {Readonly<object>} FeatureMatrix
   */
  compute({ userId, signals }, options = {}) {
    if (!userId) throw new Error('[FeatureStoreService] userId is required');
    if (!Array.isArray(signals)) throw new Error('[FeatureStoreService] signals must be an array');

    this.#assertPersistedSource(signals, options);

    const now     = Date.now();
    const cutoff  = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const recent  = signals.filter(s => new Date(s.timestamp ?? s.createdAt).getTime() >= cutoff);

    const features = {
      [FEATURE_KEYS.AVG_PAIN_30D]:            this._avgByType(recent, 'PAIN'),
      [FEATURE_KEYS.AVG_SLEEP_30D]:           this._avgByType(recent, 'SLEEP'),
      [FEATURE_KEYS.AVG_SYMPTOM_30D]:         this._avgByType(recent, 'SYMPTOM'),
      [FEATURE_KEYS.MENSTRUAL_REGULARITY]:    this._menstrualRegularity(signals),
      [FEATURE_KEYS.LONGITUDINAL_DELTA_PAIN]: this._longitudinalDeltaPain(signals, now),
      [FEATURE_KEYS.PHASE_PAIN_DISTRIBUTION]: this._phasePainDistribution(recent),
    };

    const matrix = buildFeatureMatrix({ userId, features, snapshotId: options.snapshotId });
    this.#repository.save(matrix);
    this.#publish(DOMAIN_EVENT_TYPES.FEATURE_STORE_UPDATED, userId, { userId, snapshotId: matrix.snapshotId });
    return matrix;
  }

  /**
   * Retrieve the latest FeatureMatrix for a user.
   * @param {string} userId
   * @returns {Readonly<object>|null}
   */
  getMatrix(userId) {
    return this.#repository.findByUserId(userId);
  }

  /** @returns {ReadonlyArray<Readonly<object>>} */
  getAllMatrices() {
    return this.#repository.findAll();
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    const stats = this.#repository.getStats();
    return Object.freeze({
      ready:         true,
      schemaVersion: FEATURE_STORE_SCHEMA_VERSION,
      windowDays:    WINDOW_DAYS,
      bd037:         'in-memory Signal forbidden — Supabase-persisted only',
      ...stats,
    });
  }

  // ── Private computation helpers ───────────────────────────────────────────

  _avgByType(signals, type) {
    const vals = signals
      .filter(s => s.signalType === type)
      .map(s => typeof s.normalizedValue === 'number' ? s.normalizedValue : s.rawValue);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  _menstrualRegularity(signals) {
    const menstrual = signals
      .filter(s => s.signalType === 'MENSTRUAL')
      .sort((a, b) => new Date(a.timestamp ?? a.createdAt) - new Date(b.timestamp ?? b.createdAt));

    if (menstrual.length < 2) return null;

    const intervals = [];
    for (let i = 1; i < menstrual.length; i++) {
      const prev = new Date(menstrual[i - 1].timestamp ?? menstrual[i - 1].createdAt).getTime();
      const curr = new Date(menstrual[i].timestamp     ?? menstrual[i].createdAt).getTime();
      intervals.push((curr - prev) / (24 * 60 * 60 * 1000)); // days
    }

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean === 0) return 1.0;

    const variance = intervals.reduce((sum, x) => sum + (x - mean) ** 2, 0) / intervals.length;
    const cv       = Math.sqrt(variance) / mean; // coefficient of variation
    // regularity ∈ [0, 1] where 1 = perfectly regular
    return Math.max(0, Math.min(1, 1 - cv));
  }

  _longitudinalDeltaPain(signals, now) {
    const ms       = DELTA_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const recentPain = signals.filter(s => {
      if (s.signalType !== 'PAIN') return false;
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= now - ms;
    });
    const priorPain = signals.filter(s => {
      if (s.signalType !== 'PAIN') return false;
      const t = new Date(s.timestamp ?? s.createdAt).getTime();
      return t >= now - 2 * ms && t < now - ms;
    });

    const avgRecent = this._avg(recentPain.map(s => s.normalizedValue ?? s.rawValue));
    const avgPrior  = this._avg(priorPain.map(s => s.normalizedValue ?? s.rawValue));

    if (avgRecent === null || avgPrior === null) return null;
    return avgRecent - avgPrior;
  }

  _phasePainDistribution(signals) {
    const dist = {};
    for (const phase of PHASE_KEYS) {
      const vals = signals
        .filter(s => s.signalType === 'PAIN' && s.menstrualPhase === phase)
        .map(s => s.normalizedValue ?? s.rawValue);
      dist[phase] = vals.length > 0 ? this._avg(vals) : null;
    }
    return Object.freeze(dist);
  }

  _avg(vals) {
    if (!vals || vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.FEATURE_STORE, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
