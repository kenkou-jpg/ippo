// research-dataset-service.js — Research Dataset domain service.
// BD-015: RESEARCH_DATASET_CREATED events are replayable.
// BD-018: generatedAt on all statistics output.
// BD-021: Append-Only — DELETE forbidden.
// BD-022: Wave1 in-memory only.
// PR-040: Research Dataset Foundation

import { withStatus }             from './research-dataset-entity.js';
import { validateDatasetParams }  from './research-dataset-validator.js';
import { DATASET_STATUS }         from './research-dataset-types.js';
import { buildDomainEvent }       from '../events/domain-event-entity.js';

export class ResearchDatasetService {
  #repository;
  #builder;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      object,
   *   builder:         object,
   *   eventPublisher?: object,
   * }} deps
   */
  constructor({ repository, builder, eventPublisher = null }) {
    if (!repository) throw new Error('[ResearchDatasetService] repository is required');
    if (!builder)    throw new Error('[ResearchDatasetService] builder is required');
    this.#repository     = repository;
    this.#builder        = builder;
    this.#eventPublisher = eventPublisher;
  }

  /**
   * Build and persist a new ResearchDataset.
   * Publishes RESEARCH_DATASET_CREATED event (BD-015).
   * @param {{ anonymizationLevel?: string, datasetVersion?: string }} [options]
   * @returns {Readonly<object>}
   */
  createDataset(options = {}) {
    const validation = validateDatasetParams(options);
    if (!validation.valid) {
      throw new Error(`[ResearchDatasetService] Validation failed: ${validation.errors.join(', ')}`);
    }

    const dataset = this.#builder.build(options);
    const ready   = withStatus(dataset, DATASET_STATUS.READY);
    this.#repository.append(ready);

    if (this.#eventPublisher) {
      try {
        const event = buildDomainEvent({
          eventType:     'RESEARCH_DATASET_CREATED',
          aggregateType: 'RESEARCH',
          aggregateId:   ready.id,
          payload: Object.freeze({
            datasetId:         ready.id,
            datasetVersion:    ready.datasetVersion,
            anonymizationLevel: ready.anonymizationLevel,
            recordCount:       ready.recordCount,
            signalCount:       ready.signalCount,
            diseaseCount:      ready.diseaseCount,
            snapshotCount:     ready.snapshotCount,
            eventCount:        ready.eventCount,
            generatedAt:       ready.generatedAt,
          }),
        });
        this.#eventPublisher.publish(event);
      } catch (_) {
        // Event publishing is best-effort in Wave1
      }
    }

    return ready;
  }

  /**
   * Return all persisted datasets.
   * @returns {Readonly<object>[]}
   */
  getDatasets() {
    return this.#repository.findAll();
  }

  /**
   * Return the most recently created dataset, or null.
   * @returns {Readonly<object>|null}
   */
  findLatest() {
    return this.#repository.findLatest();
  }

  /**
   * Verify a dataset entity for completeness.
   * @param {string} datasetId
   * @returns {{ verified: boolean, issues: string[] }}
   */
  verifyDataset(datasetId) {
    const dataset = this.#repository.findById(datasetId);
    if (!dataset) return { verified: false, issues: [`Dataset "${datasetId}" not found`] };

    const issues = [];
    if (!dataset.generatedAt) issues.push('missing generatedAt');
    if (!dataset.status)      issues.push('missing status');
    if (typeof dataset.signalCount !== 'number')   issues.push('signalCount must be a number');
    if (typeof dataset.diseaseCount !== 'number')  issues.push('diseaseCount must be a number');

    return { verified: issues.length === 0, issues };
  }

  /**
   * Return aggregate statistics across all datasets.
   * BD-018: includes generatedAt.
   * @returns {Readonly<object>}
   */
  getStatistics() {
    const all = this.#repository.findAll();
    const totalSignals   = all.reduce((s, d) => s + (d.signalCount   ?? 0), 0);
    const totalDiseases  = all.reduce((s, d) => s + (d.diseaseCount  ?? 0), 0);
    const totalSnapshots = all.reduce((s, d) => s + (d.snapshotCount ?? 0), 0);
    const totalEvents    = all.reduce((s, d) => s + (d.eventCount    ?? 0), 0);

    return Object.freeze({
      generatedAt:    new Date().toISOString(), // BD-018
      datasetCount:   all.length,
      totalSignals,
      totalDiseases,
      totalSnapshots,
      totalEvents,
      latest:         all.length > 0 ? all[all.length - 1].generatedAt : null,
    });
  }
}
