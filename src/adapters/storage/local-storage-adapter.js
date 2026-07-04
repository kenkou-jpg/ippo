// LocalStorageAdapter — the ONLY permitted path to localStorage in new-world code.
// Extends IStorageService. All direct localStorage calls outside this file are violations.
import { IStorageService } from '../../contracts/index.js';
import { assertImplementsContract } from '../../application/architecture-guard.js';

export class LocalStorageAdapter extends IStorageService {
  /**
   * Retrieve a value. Attempts JSON.parse; falls back to raw string.
   * @param {string} key
   * @returns {unknown}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try { return JSON.parse(raw); } catch (_) { return raw; }
    } catch (_) {
      return null;
    }
  }

  /**
   * Persist a value. Objects/arrays are JSON-serialized; primitives stored as-is.
   * @param {string} key
   * @param {unknown} value
   */
  set(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (_) {
      // QuotaExceededError and other storage errors swallowed intentionally —
      // callers must not assume persistence succeeded.
    }
  }

  /**
   * @param {string} key
   */
  remove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
  }

  /**
   * Clear all keys with the given prefix (default: 'ippo_').
   * Does NOT call localStorage.clear() to avoid wiping third-party keys.
   * @param {string} [prefix='ippo_']
   */
  clear(prefix = 'ippo_') {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      for (const k of keys) localStorage.removeItem(k);
    } catch (_) {}
  }

  /**
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    try { return localStorage.getItem(key) !== null; } catch (_) { return false; }
  }
}

assertImplementsContract(LocalStorageAdapter, IStorageService, 'StorageService');
