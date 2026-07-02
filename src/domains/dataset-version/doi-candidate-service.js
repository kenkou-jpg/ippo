// doi-candidate-service.js — PR-070: Dataset DOI Candidate.
// Assigns a structured DOI candidate ID to a published DatasetVersion (PR-055) and
// generates academic citation strings (APA / Nature). Wave2 structural preparation
// for Wave3's official DOI application — IPPO_DOI_PREFIX is a placeholder, not a
// registered Crossref/DataCite prefix.
// BD-021: operates only on already-published (Append-Only) DatasetVersion records —
// never mutates them; every method returns a new frozen object.

import { generateCitation }                          from './citation-generator.js';
import { IPPO_DOI_PREFIX, DOI_CANDIDATE_SCHEMA_VERSION, CITATION_FORMATS } from './doi-candidate-types.js';

export { CITATION_FORMATS };

export class DOICandidateService {

  /**
   * Assign a structured DOI candidate ID to a published DatasetVersion.
   * Format: 10.{ippo-prefix}/{datasetVersionId} (completion condition ①).
   *
   * @param {Readonly<object>} datasetVersion  from DatasetVersionService.publish() (PR-055)
   * @returns {Readonly<object>} { datasetVersionId, versionName, doiCandidate, assignedAt, schemaVersion }
   */
  assignDoiCandidate(datasetVersion) {
    if (!datasetVersion?.versionId) {
      throw new Error('[DOICandidateService] datasetVersion.versionId is required');
    }

    return Object.freeze({
      datasetVersionId: datasetVersion.versionId,
      versionName:      datasetVersion.versionName,
      doiCandidate:      `${IPPO_DOI_PREFIX}/${datasetVersion.versionId}`,
      assignedAt:        new Date().toISOString(), // BD-018
      schemaVersion:     DOI_CANDIDATE_SCHEMA_VERSION,
    });
  }

  /**
   * Attach a doi_candidate field to a Dataset V2's metadata (completion condition ①/③).
   * Returns a NEW frozen object — the source dataset is never mutated (BD-021).
   *
   * @param {Readonly<object>} datasetV2       from ResearchDatasetV2Service.buildDatasetV2() (PR-068)
   * @param {Readonly<object>} datasetVersion  from DatasetVersionService.publish() (PR-055)
   * @returns {Readonly<object>} datasetV2 with metadata.doi_candidate set
   */
  attachDoiCandidateToDatasetV2(datasetV2, datasetVersion) {
    if (!datasetV2?.id) throw new Error('[DOICandidateService] datasetV2 is required');
    const assignment = this.assignDoiCandidate(datasetVersion);

    return Object.freeze({
      ...datasetV2,
      metadata: Object.freeze({ ...datasetV2.metadata, doi_candidate: assignment.doiCandidate }),
    });
  }

  /**
   * Generate a citation string for a published DatasetVersion.
   * Completion condition ②: Citation フォーマット生成（APA / Nature）.
   *
   * @param {Readonly<object>} datasetVersion  from DatasetVersionService.publish() (PR-055)
   * @param {string} [format]  CITATION_FORMATS value, default APA
   * @returns {string}
   */
  generateCitation(datasetVersion, format = CITATION_FORMATS.APA) {
    const assignment = this.assignDoiCandidate(datasetVersion);
    return generateCitation(datasetVersion, assignment.doiCandidate, format);
  }

  /** @returns {Readonly<object>} */
  getStatus() {
    return Object.freeze({
      ready:          true,
      schemaVersion:  DOI_CANDIDATE_SCHEMA_VERSION,
      doiPrefix:      IPPO_DOI_PREFIX,
      doiPrefixNote:  'Wave2 placeholder — Wave3: replace with registered Crossref/DataCite prefix',
      formats:        Object.values(CITATION_FORMATS),
      bd021:          'operates on Append-Only DatasetVersion records — never mutates source',
    });
  }
}
