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
