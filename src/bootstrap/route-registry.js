// Feature Registry — registers feature descriptors, no implementations
// PR-012+ will swap each feature from { status:'legacy' } to a real adapter.
const KNOWN_FEATURES = new Set([
  'Record',
  'Experiment',
  'Case',
  'Consent',
  'Analytics',
  'Similarity',
  'Auth',
  'API',        // PR-020: API Gateway
  'RecordV2',   // PR-021: Record V2 Read Switch
  'Engagement',    // PR-022: Engagement Layer
  'B2BExport',
  'Communication', // PR-023: Communication Layer
  'Delivery',      // PR-024: Delivery Layer
  'Operations',           // PR-026: Operations & KPI Automation
  'OperationsAutomation', // PR-027: Operations Automation & Analytics Completion
  'Symptom',              // PR-028: Symptom Intelligence Foundation
  'Disease',              // PR-029: Disease Entity Foundation
  'NetworkSignal',        // PR-030: Network Signal Foundation
  'SignalIntelligence',   // PR-031: Signal Intelligence Foundation
  'Longitudinal',         // PR-032: Longitudinal Signal Foundation
  'PersistentSignal',     // PR-033: NetworkSignal Persistence Foundation
  'DiseaseCluster',       // PR-034: Disease Cluster Foundation
  'SignalSnapshot',           // PR-035: Snapshot Foundation
  'SimilarityIntelligence',  // PR-036: Similarity Intelligence Foundation
  'EventSourcing',           // PR-037: Event Sourcing Foundation
  'Emotion',                 // PR-038: Emotion Signal Foundation
  'MenstrualIntelligence',   // PR-039: Menstrual Intelligence Foundation
  'ResearchDataset',         // PR-040: Research Dataset Foundation
  'NetworkSignalV2',         // PR-041: NetworkSignal Repository V2 (Wave2 Phase A-1)
  'EmotionSignal',           // PR-043: Emotion Signal Generation Foundation (Wave2 Phase A-3)
  'MenstrualPhaseResolution', // PR-044: MenstrualPhase Auto-Resolution (Wave2 Phase A-4)
  'DiseaseEntityV2',          // PR-045: Disease Entity V2 Upgrade (Wave2 Phase A-5)
  'DiseaseClusterStatistics', // PR-046: Disease Cluster Statistics (Wave2 Phase B-1)
  'FeatureVectorV2',          // PR-047: FeatureVector V2 (Wave2 Phase B-2)
  'LongitudinalEdgeEnricher', // PR-048: Longitudinal Edge Enricher (Wave2 Phase B-3)
  'EnvironmentalSignal',      // PR-049: Environmental Signal Collector (Wave2 Phase B-4)
  'SignalIntelligenceV2',     // PR-050: Signal Intelligence V2 (Wave2 Phase B-5)
  'KnowledgeGraph',           // PR-051: Knowledge Graph Foundation (Wave2 Phase C-1)
  'KnowledgeGraphBuilder',    // PR-052: Knowledge Graph Builder (Wave2 Phase C-2)
  'FeatureStore',             // PR-053: Feature Store V1 (Wave2 Phase C-3)
  'CohortBuilder',            // PR-054: Cohort Builder (Wave2 Phase C-4)
  'DatasetVersion',           // PR-055: Dataset Version Management (Wave2 Phase C-5)
  'EvidenceLayer',            // PR-056: Evidence Layer (Wave2 Phase C capstone)
  'SignalInsight',            // PR-057: Signal Insight Service (Wave2 Phase D-1)
  'PatternDiscovery',         // PR-058: Pattern Discovery Service (Wave2 Phase D-2)
  'CaseRecommendation',       // PR-059: Case Recommendation Foundation (Wave2 Phase D-3)
  'SimilarCaseSearch',        // PR-060: Similar Case Search (Wave2 Phase D-4)
  'ResearchAssistance',       // PR-061: Research Assistance (Wave2 Phase D-5)
  'AISafetyLayer',            // PR-062: AI Safety Layer (Wave2 Phase D capstone)
  'SimilarityEngineV2',       // PR-063: Similarity Engine V2 (Wave2 Phase E-1)
  'DiseaseNetworkScoreV2',    // PR-064: Disease Network Score V2 (Wave2 Phase E-2)
  'SimilaritySnapshotV2',     // PR-065: Similarity Snapshot V2 (Wave2 Phase E-3)
  'Phase3Validation',         // PR-066: Phase 3 Completion Validator (Wave2 Phase E-4)
  'SimilarityPublicGate',     // PR-067: Similarity UI Public Gate (Wave2 Phase E capstone)
  'ResearchDatasetV2',        // PR-068: Research Dataset V2 (Wave2 Phase F開始)
  'CohortResearchExport',     // PR-069: Cohort Research Export (Wave2 Phase F継続)
  'DoiCandidate',             // PR-070: Dataset DOI Candidate (Wave2 Phase F継続)
  'ResearchQueryAPI',         // PR-071: Research Query API (Wave2 Phase F継続)
  'ResearchPlatformAudit',    // PR-072: Research Platform Audit (Wave2 Phase F capstone)
]);

export class RouteRegistry {
  #features = new Map();

  register(name, descriptor) {
    if (!KNOWN_FEATURES.has(name)) {
      console.error(`[RouteRegistry] Unknown feature: "${name}". Known: ${[...KNOWN_FEATURES].join(', ')}`);
      return;
    }
    if (this.#features.has(name)) {
      console.error(`[RouteRegistry] Feature already registered: "${name}"`);
      return;
    }
    this.#features.set(name, Object.freeze({ name, ...descriptor }));
  }

  getAll() {
    return new Map(this.#features);
  }

  isRegistered(name) {
    return this.#features.has(name);
  }

  get knownFeatures() {
    return [...KNOWN_FEATURES];
  }
}
