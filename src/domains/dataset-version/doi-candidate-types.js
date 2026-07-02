// doi-candidate-types.js — SSOT for DOI Candidate assignment.
// PR-070: Dataset DOI Candidate
// Wave2 scope: DOI candidate IDs are structural placeholders. Wave3: replace
// IPPO_DOI_PREFIX with a registered Crossref/DataCite prefix for official DOI application.

/** Placeholder DOI prefix. Wave2 structure only — not a registered DOI prefix. */
export const IPPO_DOI_PREFIX = '10.99999';

/** Schema version for DoiCandidateAssignment records. */
export const DOI_CANDIDATE_SCHEMA_VERSION = '1';

/** Supported citation formats. */
export const CITATION_FORMATS = Object.freeze({
  APA:    'APA',
  NATURE: 'NATURE',
});
