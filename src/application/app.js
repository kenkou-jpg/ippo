// Application — public surface is initialize() only.
// Resolves the LegacyBridge from the container and boots it.
//
// PR-APP-BOOT-01 (Founder Decision, a案): also resolves ApiGateway and
// publishes it as window.app.api via ApplicationRuntime. This is the only
// place the DependencyContainer is touched to reach ApiGateway — UI code
// must never call container.resolve() itself (Container依存を画面へ漏らさない).
import { TOKENS } from './composition-root.js';
import { runArchitectureGuard } from './architecture-guard.js';
import { ApplicationRuntime } from './application-runtime.js';

export class Application {
  #container;
  #runtime;

  constructor(container) {
    this.#container = container;
  }

  initialize() {
    runArchitectureGuard();
    const bridge = this.#container.resolve(TOKENS.LegacyBridge);
    bridge.boot();

    const apiGateway = this.#container.resolve(TOKENS.ApiGateway);
    this.#runtime = new ApplicationRuntime(apiGateway);
    if (typeof window !== 'undefined') {
      window.app = this.#runtime;
    }
  }

  /** @returns {ApplicationRuntime|undefined} */
  get runtime() {
    return this.#runtime;
  }
}
