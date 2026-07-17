// ApplicationRuntime — PR-APP-BOOT-01.
//
// The ONLY object UI code may hold a reference to when it needs the "正"
// Application layer. Exposes ApiGateway as `.api`; never exposes the
// DependencyContainer itself, so screens cannot resolve() arbitrary tokens
// and Container dependency never leaks into UI code (Founder Decision, c案不採用).
//
// boot() constructs this once and assigns it to window.app. UI code should
// only ever touch window.app.api — never window.app.container (there is none).
export class ApplicationRuntime {
  #api;

  /** @param {import('./api-gateway.js').ApiGateway} apiGateway */
  constructor(apiGateway) {
    this.#api = apiGateway;
  }

  /** @returns {import('./api-gateway.js').ApiGateway} */
  get api() {
    return this.#api;
  }
}
