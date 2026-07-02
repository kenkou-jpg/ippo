// cohort-research-export-service.js — PR-069: Cohort Research Export.
// Exports a CohortDefinition's (PR-054) matching data pool as a versioned Research Dataset.
// BD-039: re-verifies k-anonymity via CohortBuilderService.checkPublicationEligibility()
//         immediately before every export — eligibility is re-checked on each call, not
//         cached from cohort-definition time (a cohort verified earlier could in principle
//         be re-evaluated; this call is the export-time gate).
// BD-021: publication is Append-Only via DatasetVersionService (PR-055).
// Reuses ResearchDataset entity + DatasetExportService (PR-040) for the actual JSON/CSV/
// PARQUET serialization — Cohort Export does not duplicate format logic.

import { buildResearchDataset } from '../research/research-dataset-entity.js';
import { DatasetExportService } from '../research/dataset-export-service.js';
import { ANONYMIZATION_LEVEL }  from '../research/research-dataset-types.js';
import { DATASET_TYPES }        from '../dataset-version/dataset-version-types.js';

export class CohortResearchExportService {
  #cohortBuilderService;
  #datasetVersionService;
  #datasetExportService;

  /**
   * @param {{
   *   cohortBuilderService:  import('./cohort-builder-service.js').CohortBuilderService,
   *   datasetVersionService: import('../dataset-version/dataset-version-service.js').DatasetVersionService,
   *   datasetExportService?: import('../research/dataset-export-service.js').DatasetExportService|null,
   * }} deps
   */
  constructor({ cohortBuilderService, datasetVersionService, datasetExportService = null }) {
    if (!cohortBuilderService)  throw new Error('[CohortResearchExportService] cohortBuilderService is required');
    if (!datasetVersionService) throw new Error('[CohortResearchExportService] datasetVersionService is required');
    this.#cohortBuilderService  = cohortBuilderService;
    this.#datasetVersionService = datasetVersionService;
    this.#datasetExportService  = datasetExportService ?? new DatasetExportService();
  }

  /**
   * Export a cohort's matching data pool as a versioned Research Dataset.
   * BD-039: re-verifies k-anonymity via CohortBuilderService — throws when the cohort is
   * not verified or its verifiedCount has fallen below K_ANONYMITY_MIN (completion
   * condition ②). The caller supplies the data pool already filtered to the cohort's
   * matching records (query/filter matching is out of scope for this service — see
   * CohortBuilderService for the CohortDefinition.filters shape).
   *
   * @param {{
   *   cohortId:   string,
   *   signals?:   object[], diseases?: object[], events?: object[], snapshots?: object[],
   *   createdBy:  string,
   * }} input
   * @returns {Readonly<object>} { cohort, dataset, version }
   * @throws when the cohort is not k-anonymity eligible (BD-039, propagated from CohortBuilderService)
   */
  exportCohort({ cohortId, signals = [], diseases = [], events = [], snapshots = [], createdBy }) {
    this.#cohortBuilderService.checkPublicationEligibility(cohortId); // BD-039 re-verification
    const cohort = this.#cohortBuilderService.getCohort(cohortId);

    const dataset = buildResearchDataset({
      datasetVersion:      '1.0.0',
      signalCount:         signals.length,
      diseaseCount:        diseases.length,
      eventCount:          events.length,
      snapshotCount:       snapshots.length,
      anonymizationLevel:  ANONYMIZATION_LEVEL.K_ANONYMITY,
      signals, diseases, events, snapshots,
      metadata: { cohortId, cohortName: cohort.name },
    });

    // Completion condition ③: Export is tied to a persisted, versionId-bearing DatasetVersion.
    // Naming (PR-055 extended for cohortId): IPPO-DATASET-COHORT-{cohortId}-v1.0-{YYYYMMDD}.
    const version = this.#datasetVersionService.publish({
      type:      DATASET_TYPES.COHORT,
      cohortId,
      datasetId: dataset.id,
      major:     1,
      minor:     0,
      createdBy,
      content: {
        cohortId,
        signalCount:   dataset.signalCount,
        diseaseCount:  dataset.diseaseCount,
        eventCount:    dataset.eventCount,
        snapshotCount: dataset.snapshotCount,
        verifiedCount: cohort.verifiedCount,
      },
      metadata: { cohortName: cohort.name },
    });

    return Object.freeze({ cohort, dataset, version });
  }

  /** @param {Readonly<object>} dataset  from exportCohort().dataset */
  exportJSON(dataset)    { return this.#datasetExportService.exportJSON(dataset); }
  /** @param {Readonly<object>} dataset  from exportCohort().dataset */
  exportCSV(dataset)     { return this.#datasetExportService.exportCSV(dataset); }
  /** @param {Readonly<object>} dataset  from exportCohort().dataset — Wave2 Stub */
  exportPARQUET(dataset) { return this.#datasetExportService.exportPARQUET(dataset); }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:         true,
      namingPattern: 'IPPO-DATASET-COHORT-{cohortId}-v1.0-{YYYYMMDD}',
      bd021:         'publication is Append-Only via DatasetVersionService',
      bd039:         're-verifies cohort eligibility via CohortBuilderService immediately before every export',
      formats:       ['JSON', 'CSV', 'PARQUET (Wave2 Stub)'],
    });
  }
}
