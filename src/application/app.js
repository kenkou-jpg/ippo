// Application — public surface is initialize() only.
// Resolves the LegacyBridge from the container and boots it.
import { TOKENS } from './composition-root.js';
import { runArchitectureGuard } from './architecture-guard.js';

export class Application {
  #container;

  constructor(container) {
    this.#container = container;
  }

  initialize() {
    runArchitectureGuard();
    const bridge = this.#container.resolve(TOKENS.LegacyBridge);
    bridge.boot();
  }
}
