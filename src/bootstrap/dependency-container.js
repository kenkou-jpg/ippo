// Lightweight DI container — no framework, no external dependencies
// All production `new` calls must go through CompositionRoot, not here.
export class DependencyContainer {
  #factories  = new Map();
  #singletons = new Map();

  // Register a factory. Throws if token is already bound.
  register(token, factory) {
    if (this.#factories.has(token)) {
      throw new Error(`[DI] Token already registered: "${String(token)}"`);
    }
    this.#factories.set(token, factory);
  }

  // Shorthand: register as a factory that caches its result after first call.
  singleton(token, factory) {
    this.register(token, (c) => {
      if (!this.#singletons.has(token)) {
        this.#singletons.set(token, factory(c));
      }
      return this.#singletons.get(token);
    });
  }

  resolve(token) {
    const factory = this.#factories.get(token);
    if (!factory) throw new Error(`[DI] No binding for token: "${String(token)}"`);
    return factory(this);
  }

  has(token) {
    return this.#factories.has(token);
  }
}
