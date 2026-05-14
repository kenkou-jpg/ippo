// ============================================================
//  ippo – src/store/persistence.js
//  persistence boundary utilities
// ============================================================

export function isPersistenceReady() {
  return typeof window.saveState === 'function' && typeof window.getState === 'function' && !!window.getState();
}

export function guardedSaveState() {
  try {
    if (typeof window.saveState === 'function' && typeof window.getState === 'function' && window.getState()) {
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
