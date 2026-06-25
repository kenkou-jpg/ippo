// ConsentFilter — gates similarity participation on consent level.
// Must be called BEFORE any vector comparison.
// Rule: consentLevel >= SIMILARITY_CONSENT_THRESHOLD (2) required.

import { SIMILARITY_CONSENT_THRESHOLD } from './similarity-candidate.js';

/**
 * @typedef {{ accepted: object[], rejected: object[], rejectedCount: number }} FilterResult
 */

export class ConsentFilter {
  /**
   * Split candidates into accepted (eligible) and rejected (insufficient consent).
   *
   * @param {object[]} candidates   SimilarityCandidate[]
   * @returns {FilterResult}
   */
  filter(candidates) {
    if (!Array.isArray(candidates)) {
      throw new TypeError('[ConsentFilter] candidates must be an array');
    }

    const accepted = [];
    const rejected = [];

    for (const c of candidates) {
      if (c?.eligibleForSimilarity && (c.consentLevel ?? 0) >= SIMILARITY_CONSENT_THRESHOLD) {
        accepted.push(c);
      } else {
        rejected.push(c);
      }
    }

    return { accepted, rejected, rejectedCount: rejected.length };
  }

  /**
   * Returns only accepted candidates (convenience wrapper).
   * @param {object[]} candidates
   * @returns {object[]}
   */
  filterAccepted(candidates) {
    return this.filter(candidates).accepted;
  }

  /**
   * Check whether a single candidate passes the consent gate.
   * @param {object} candidate
   * @returns {boolean}
   */
  passes(candidate) {
    return (
      candidate?.eligibleForSimilarity === true &&
      (candidate.consentLevel ?? 0) >= SIMILARITY_CONSENT_THRESHOLD
    );
  }
}
