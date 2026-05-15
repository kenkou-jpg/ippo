// ============================================================
//  ippo – src/services/environment-service.js
//  Single Environment Authority
//
//  RULE: All environment variable access in this app goes
//  through this module. Direct import.meta.env.* or bare
//  SUPABASE_URL identifiers anywhere else are prohibited.
//
//  Load order: imported first in main.js (after boot-stability).
// ============================================================

// ─── Resolution (runs at module evaluation time) ─────────────
// VITE_SUPABASE_ANON_KEY is preferred; VITE_SUPABASE_KEY kept for backwards compat
var _url = (function () {
  try {
    var v = import.meta.env.VITE_SUPABASE_URL;
    if (v && v !== 'undefined') return v;
  } catch (_) {}
  return 'https://ekaoojdqhkpeudujfsdh.supabase.co';
})();

var _key = (function () {
  try {
    var v = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;
    if (v && v !== 'undefined') return v;
  } catch (_) {}
  return null;
})();

var _appVersion = (function () {
  try {
    var meta = document.querySelector('meta[name="app-version"]');
    if (meta && meta.content) return meta.content;
  } catch (_) {}
  try {
    if (typeof __APP_VERSION__ !== 'undefined') return __APP_VERSION__;
  } catch (_) {}
  return 'unknown';
})();

var _buildVersion = (function () {
  try {
    if (typeof __BUILD_VERSION__ !== 'undefined') return __BUILD_VERSION__;
  } catch (_) {}
  return _appVersion;
})();

var _isDev = (function () {
  try {
    return !!(import.meta.env && import.meta.env.DEV);
  } catch (_) {}
  return false;
})();

// ─── Validation ──────────────────────────────────────────────
var _issues = [];
if (!_key) _issues.push('missing-supabase-key');
if (!_url) _issues.push('missing-supabase-url');
if (_url && !/^https?:\/\//.test(_url)) _issues.push('malformed-supabase-url');
if (_key && _key.length < 20) _issues.push('malformed-supabase-key');

// ─── SAFE_BOOTSTRAP_MODE ─────────────────────────────────────
// Activated when SUPABASE_KEY is absent.
// In safe mode: save disabled, cloud disabled, local-only, diagnostics visible.
var SAFE_BOOTSTRAP_MODE = !_key;

if (SAFE_BOOTSTRAP_MODE) {
  window.__ippoSafeBootstrapMode = true;
  console.warn('[environment-service] SAFE_BOOTSTRAP_MODE: SUPABASE_KEY missing. Cloud features disabled.');
}

// ─── Public API ──────────────────────────────────────────────

export function getSupabaseConfig() {
  return { url: _url, key: _key };
}

export function getEnvironment() {
  return {
    supabaseUrl:        _url,
    supabaseKeyPresent: !!_key,
    appVersion:         _appVersion,
    buildVersion:       _buildVersion,
    isDev:              _isDev,
    isProduction:       !_isDev,
    safeBootstrapMode:  SAFE_BOOTSTRAP_MODE,
    issues:             _issues.slice(),
  };
}

export function isProduction() { return !_isDev; }
export function isDev()        { return _isDev; }
export function getAppVersion()   { return _appVersion; }
export function getBuildVersion() { return _buildVersion; }
export function isSafeBootstrapMode() { return SAFE_BOOTSTRAP_MODE; }

export function getEnvironmentHealth() {
  return {
    healthy:           _issues.length === 0,
    issues:            _issues.slice(),
    supabaseUrl:       _url,
    keyPresent:        !!_key,
    safeBootstrapMode: SAFE_BOOTSTRAP_MODE,
    appVersion:        _appVersion,
    isDev:             _isDev,
    checkedAt:         new Date().toISOString(),
  };
}

// ─── Bootstrap event ─────────────────────────────────────────
window.__ippoEnvironmentReady = true;
window.__ippoEnvironmentHealth = getEnvironmentHealth;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('environment-service-ready', {
    safeBootstrapMode: SAFE_BOOTSTRAP_MODE,
    keyPresent:        !!_key,
    issues:            _issues,
  });
}

window.dispatchEvent(new CustomEvent('ippo:environment-ready', {
  detail: getEnvironmentHealth(),
}));
