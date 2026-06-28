// disease-entity-upgrade-service.js — PR-045: Disease Entity V2 Upgrade (BD-004).
// Upgrades a Wave1 DiseaseEntry to full DiseaseEntity V2 structure.
// BD-032: Append-Only — upgrade creates a new entity; existing entries are not mutated.
// BD-031: No AI, no LLM, no diagnosis suggestion.
// diseaseKey === name is preserved for Case / SimilarityEdge backward compat (BD-035).

import { CONFIRMED_BY, CONFIRMED_BY_VALUES } from './disease-types.js';
import { buildDomainEvent }                  from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } from '../events/domain-event-types.js';

export class DiseaseEntityUpgradeService {
  #eventPublisher;

  /**
   * @param {{ eventPublisher?: object|null }} deps
   */
  constructor({ eventPublisher = null } = {}) {
    this.#eventPublisher = eventPublisher ?? null;
  }

  /**
   * Upgrade a DiseaseEntry with V2 fields.
   * Returns a new frozen object containing all original fields plus
   * icdCode / confirmedBy / relatedSymptoms / diseaseKey.
   * Does NOT persist — caller is responsible for storing the result.
   *
   * @param {object} entry                  Existing DiseaseEntry (from DiseaseRepository)
   * @param {{
   *   icdCode?:         string|null,
   *   confirmedBy?:     string,
   *   relatedSymptoms?: string[],
   * }} upgradeParams
   * @returns {Readonly<object>}  upgraded DiseaseEntity V2
   */
  upgrade(entry, {
    icdCode         = null,
    confirmedBy     = CONFIRMED_BY.UNKNOWN,
    relatedSymptoms = [],
  } = {}) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('[DiseaseEntityUpgradeService] entry is required');
    }
    if (!entry.id || !entry.name) {
      throw new Error('[DiseaseEntityUpgradeService] entry must have id and name');
    }
    if (confirmedBy !== null && !CONFIRMED_BY_VALUES.has(confirmedBy)) {
      throw new Error(`[DiseaseEntityUpgradeService] confirmedBy "${confirmedBy}" is not in registry`);
    }
    if (!Array.isArray(relatedSymptoms)) {
      throw new Error('[DiseaseEntityUpgradeService] relatedSymptoms must be an array');
    }

    const upgraded = Object.freeze({
      ...entry,
      diseaseKey:      entry.name,          // BD-035: alias for backward compat
      icdCode:         icdCode ?? null,
      confirmedBy,
      relatedSymptoms: Object.freeze([...relatedSymptoms]),
      upgradedAt:      new Date().toISOString(),
    });

    this.#publishUpgradedEvent(upgraded);
    return upgraded;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  #publishUpgradedEvent(upgraded) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType:     DOMAIN_EVENT_TYPES.DISEASE_ENTITY_UPGRADED,
        aggregateType: AGGREGATE_TYPES.DISEASE,
        aggregateId:   upgraded.id,
        payload:       Object.freeze({
          diseaseId:       upgraded.id,
          diseaseKey:      upgraded.diseaseKey,
          icdCode:         upgraded.icdCode,
          confirmedBy:     upgraded.confirmedBy,
          relatedSymptoms: [...upgraded.relatedSymptoms],
          upgradedAt:      upgraded.upgradedAt,
        }),
      });
      this.#eventPublisher.publish(event);
    } catch {
      // Event publishing is best-effort; upgrade result already returned.
    }
  }
}
