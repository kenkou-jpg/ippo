// App Bootstrap — new-world entry point.
// main.js calls boot(); all wiring flows downward from here.
// Do NOT call this file's boot() from any feature or domain layer.
import { loadBootstrapConfig } from './bootstrap-config.js';
import { DependencyContainer }  from './dependency-container.js';
import { RouteRegistry }        from './route-registry.js';
import { CompositionRoot }      from '../application/composition-root.js';
import { Application }          from '../application/app.js';

export function boot() {
  const config    = loadBootstrapConfig();
  const container = new DependencyContainer();
  const registry  = new RouteRegistry();

  const root = new CompositionRoot(container, registry, config);
  root.assemble();

  const app = new Application(container);
  app.initialize();
}
