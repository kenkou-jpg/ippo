// SimilarityAccessGuard — enforces ownership on Similarity access.
// Users may only retrieve similarity results linked to their own Cases.
// Admins bypass ownership checks (similarity:read:all).
// PR-020: Auth Boundary
import { AuthError } from './permission-service.js';

export class SimilarityAccessGuard {
  /**
   * Assert that the requesting user may access similarity data for the given case.
   * @param {string}  caseUserId        owner of the case
   * @param {string}  requestingUserId  current auth user
   * @param {boolean} isAdmin
   */
  assertAccess(caseUserId, requestingUserId, isAdmin) {
    if (isAdmin) return;
    if (caseUserId !== requestingUserId) {
      throw new AuthError(
        `SimilarityAccessGuard: access denied — case owned by another user`,
        'FORBIDDEN',
      );
    }
  }

  /**
   * Filter a list of similarity edges to those owned by requestingUserId.
   * @param {Array<object>} edges
   * @param {string}        requestingUserId
   * @param {boolean}       isAdmin
   * @returns {Array<object>}
   */
  filterEdges(edges, requestingUserId, isAdmin) {
    if (isAdmin) return edges;
    return edges.filter(
      e => e.userId === requestingUserId || e.sourceUserId === requestingUserId,
    );
  }
}
