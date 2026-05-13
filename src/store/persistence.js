// ============================================================
//  ippo – src/store/persistence.js
//  persistence boundary utilities
// ============================================================

export function isPersistenceReady() {
  return typeof window.saveState === 'function' && !!window.state;
}

export function guardedSaveState() {
  try {
    if (typeof window.saveState === 'function' && window.state) {
      window.saveState();
      return true;
    }
  } catch (_) {}
  return false;
}

export function tracePersistence(label, payload) {
  if (typeof window.ippoTracePersistencePhase === 'function') {
    window.ippoTracePersistencePhase(label, payload || {});
  }
}
