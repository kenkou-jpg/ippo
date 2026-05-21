// ============================================================
//  ippo – src/store/persistence.js
//  persistence boundary utilities
// ============================================================

import { getState, saveState } from './state.js';

export function isPersistenceReady() {
  return !!getState();
}

export function guardedSaveState() {
  try {
    if (getState()) {
      saveState();
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
