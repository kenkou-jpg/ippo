// citation-generator.js — Pure citation string formatting for DatasetVersion records.
// PR-070: Dataset DOI Candidate

import { CITATION_FORMATS } from './doi-candidate-types.js';

/**
 * Generate a citation string for a published DatasetVersion (PR-055).
 *
 * @param {{ versionName: string, createdBy: string, publishedAt: string }} datasetVersion
 * @param {string} doiCandidate  — e.g. "10.99999/dv_..." (from DOICandidateService)
 * @param {string} [format]      — CITATION_FORMATS value, default APA
 * @returns {string}
 */
export function generateCitation(datasetVersion, doiCandidate, format = CITATION_FORMATS.APA) {
  if (!datasetVersion?.versionName) {
    throw new Error('[CitationGenerator] datasetVersion.versionName is required');
  }
  if (!doiCandidate) {
    throw new Error('[CitationGenerator] doiCandidate is required');
  }

  const author = datasetVersion.createdBy ?? 'IPPO Research Platform';
  const year   = datasetVersion.publishedAt
    ? new Date(datasetVersion.publishedAt).getFullYear()
    : new Date().getFullYear();
  const doiUrl = `https://doi.org/${doiCandidate}`;

  switch (format) {
    case CITATION_FORMATS.APA:
      return `${author}. (${year}). ${datasetVersion.versionName} [Data set]. IPPO. ${doiUrl}`;
    case CITATION_FORMATS.NATURE:
      return `${author} ${datasetVersion.versionName}. IPPO (${year}). ${doiUrl}`;
    default:
      throw new Error(`[CitationGenerator] unknown format: "${format}"`);
  }
}
