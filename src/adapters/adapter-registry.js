// AdapterRegistry — tracks which adapters are wired into the DI container.
// Used by LegacyAccessAudit and future conformance checks.
// Not a service locator: callers resolve adapters through DependencyContainer, not here.
const KNOWN_ADAPTERS = new Set([
  'StorageService',
  'AuthService',
  // PR-013+: RecordAdapter, ExperimentAdapter, ConsentAdapter, CaseAdapter
]);

export class AdapterRegistry {
  #adapters = new Map();

  /**
   * @param {string} name  Must be a known adapter name
   * @param {object} instance  The adapter instance
   */
  register(name, instance) {
    if (!KNOWN_ADAPTERS.has(name)) {
      console.error(`[AdapterRegistry] Unknown adapter: "${name}". Known: ${[...KNOWN_ADAPTERS].join(', ')}`);
      return;
    }
    this.#adapters.set(name, instance);
  }

  /**
   * @param {string} name
   * @returns {object|null}
   */
  get(name) {
    return this.#adapters.get(name) ?? null;
  }

  getAll() {
    return new Map(this.#adapters);
  }

  isRegistered(name) {
    return this.#adapters.has(name);
  }

  get knownAdapters() {
    return [...KNOWN_ADAPTERS];
  }
}
