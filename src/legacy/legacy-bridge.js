// Legacy Bridge — the ONLY permitted path from new-world code into app-legacy.js.
// Nothing outside this file may import modules/app-bootstrap.js directly.
import { bootstrap } from '../modules/app-bootstrap.js';

export class LegacyBridge {
  boot() {
    bootstrap();
  }
}
