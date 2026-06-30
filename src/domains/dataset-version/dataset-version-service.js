// dataset-version-service.js — Dataset Version Management Service.
// BD-021: DatasetVersion は Append-Only — バージョン固定後の内容変更禁止。
// BD-018: DatasetVersion に publishedAt ISO string 必須 (via buildDatasetVersion).
// BD-032: All returned objects are frozen.
// BD-031: Pure deterministic logic — no AI / LLM.
// PR-055: Dataset Version Management

import { buildDatasetVersion, rejectMutation }   from './dataset-version-entity.js';
import { buildDomainEvent }                       from '../events/domain-event-entity.js';
import { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES }   from '../events/domain-event-types.js';
import {
  DATASET_TYPES, DATASET_VERSION_SCHEMA_VERSION, APPEND_ONLY_MSG,
} from './dataset-version-types.js';

export { DATASET_TYPES, DATASET_VERSION_SCHEMA_VERSION, APPEND_ONLY_MSG };

export class DatasetVersionService {
  #repository;
  #eventPublisher;

  /**
   * @param {{
   *   repository:      import('./dataset-version-repository.js').DatasetVersionRepository,
   *   eventPublisher?: object|null,
   * }} deps
   */
  constructor({ repository, eventPublisher = null }) {
    if (!repository) throw new Error('[DatasetVersionService] repository is required');
    this.#repository     = repository;
    this.#eventPublisher = eventPublisher ?? null;
  }

  // ── Publish ────────────────────────────────────────────────────────────────

  /**
   * Publish a new DatasetVersion.
   * BD-021: each call creates an immutable new version — prior versions are untouched.
   *
   * @param {{
   *   type:       string,
   *   major?:     number,
   *   minor?:     number,
   *   cohortId?:  string|null,
   *   datasetId?: string|null,
   *   createdBy:  string,
   *   content?:   object,
   *   metadata?:  object,
   * }} params
   * @returns {Readonly<object>} DatasetVersion
   */
  publish({
    type, major = 1, minor = 0, cohortId = null,
    datasetId = null, createdBy, content = {}, metadata = {},
  }) {
    const version = buildDatasetVersion({
      type, major, minor, cohortId, datasetId, createdBy, content, metadata,
    });
    this.#repository.append(version);
    this.#publish(
      DOMAIN_EVENT_TYPES.DATASET_VERSION_PUBLISHED,
      version.versionId,
      {
        versionId:    version.versionId,
        versionName:  version.versionName,
        type:         version.type,
        doiCandidate: version.doiCandidate,
      }
    );
    return version;
  }

  // ── BD-021 mutation guard ─────────────────────────────────────────────────

  /**
   * Always throws — DatasetVersion is immutable after publishing (BD-021).
   */
  mutate() { rejectMutation(); }

  // ── Reads ──────────────────────────────────────────────────────────────────

  /** @returns {Readonly<object>|null} */
  getVersion(versionId) {
    return this.#repository.findById(versionId);
  }

  /**
   * @param {string} [datasetId]
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  getVersions(datasetId) {
    return this.#repository.findAll(datasetId);
  }

  /**
   * @param {string} type  — DATASET_TYPES value
   * @returns {ReadonlyArray<Readonly<object>>}
   */
  getVersionsByType(type) {
    return this.#repository.findByType(type);
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    const stats = this.#repository.getStats();
    return Object.freeze({
      ready:          true,
      schemaVersion:  DATASET_VERSION_SCHEMA_VERSION,
      appendOnly:     true,
      bd021:          APPEND_ONLY_MSG,
      namingPattern:  'IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}',
      ...stats,
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  #publish(eventType, aggregateId, payload) {
    if (!this.#eventPublisher) return;
    try {
      const event = buildDomainEvent({
        eventType, aggregateId, aggregateType: AGGREGATE_TYPES.DATASET_VERSION, payload,
      });
      this.#eventPublisher.publish(event);
    } catch { /* best-effort */ }
  }
}
