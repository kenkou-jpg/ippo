// cluster-similarity-adapter.js — Wave2 connection point for DiseaseCluster ↔ Similarity.
// BD-012: Longitudinal Signal Edge assignment is Wave2 scope.
// BD-009: Disease Cluster Foundation (Wave2 elevation target).
// PR-034: Disease Cluster Foundation — Wave2 Stub
//
// Wave2 roadmap (DO NOT DELETE these comments — they define the integration contract):
//   DiseaseCluster
//     ↓ buildFeatureHints()   → FeatureVector augmentation (Wave2)
//     ↓ getClusterVector()    → SimilarityEngine input (Wave2)
//     ↓ getSimilarityMetadata() → SimilarityEdge annotation (Wave2)
//     ↓ Signal Statistics     → Research Dataset (Wave2)
//     ↓ Similarity            → AI / Recommendation (Wave3)

export class ClusterSimilarityAdapter {
  /**
   * Build feature hints from a DiseaseCluster for use in FeatureVector augmentation.
   * Wave2 Stub: returns an empty hints object.
   * Full implementation: inject cluster signalTypes into VectorBuilder weighting.
   * @param {object} cluster DiseaseCluster entity
   * @returns {{ hints: object[], clusterKey: string, wave: string }}
   */
  buildFeatureHints(cluster) {
    return {
      hints:      [],
      clusterKey: cluster?.clusterKey ?? null,
      wave:       'Wave2 Stub — FeatureVector augmentation from DiseaseCluster not yet implemented.',
    };
  }

  /**
   * Return a placeholder cluster vector for SimilarityEngine input.
   * Wave2 Stub: returns a zero-filled vector.
   * Full implementation: compute centroid vector from cluster member signals.
   * @param {object} cluster DiseaseCluster entity
   * @returns {{ vector: number[], clusterKey: string, clusterVersion: string, wave: string }}
   */
  getClusterVector(cluster) {
    return {
      vector:         [],
      clusterKey:     cluster?.clusterKey ?? null,
      clusterVersion: cluster?.clusterVersion ?? '1',
      wave:           'Wave2 Stub — centroid vector computation not yet implemented.',
    };
  }

  /**
   * Return similarity metadata for a DiseaseCluster.
   * Wave2 Stub: returns minimal metadata.
   * Full implementation: annotate SimilarityEdge with cluster membership.
   * @param {object} cluster DiseaseCluster entity
   * @returns {{ clusterKey: string, relatedDiseaseCount: number, signalTypeCount: number, wave: string }}
   */
  getSimilarityMetadata(cluster) {
    return {
      clusterKey:          cluster?.clusterKey ?? null,
      relatedDiseaseCount: cluster?.relatedDiseases?.length ?? 0,
      signalTypeCount:     cluster?.signalTypes?.length ?? 0,
      wave:                'Wave2 Stub — SimilarityEdge annotation from cluster not yet implemented.',
    };
  }
}
