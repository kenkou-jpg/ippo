// Legacy Access Audit — detects direct infrastructure access that bypasses adapters.
// PR-012: console.warn only (informational).
// PR-015: escalate to console.error after adapter coverage is complete.
//
// Known violation sites are catalogued here as a static registry.
// Dynamic detection is installed via installAuditProxy() for localStorage.

// ── Static violation catalogue ────────────────────────────────────────────────
// Each entry documents a known bypass. Remove entries as they are migrated.
const KNOWN_VIOLATIONS = [
  // localStorage — src/store/state.js
  { file: 'src/store/state.js',                key: 'localStorage',    note: 'STATE_KEY read/write — migrate in Phase A-3' },
  // localStorage — src/modules/
  { file: 'src/modules/app-bootstrap.js',      key: 'localStorage',    note: 'STATE_KEY hydration — migrate with StorageAdapter in PR-013' },
  { file: 'src/modules/record-draft-guard.js', key: 'localStorage',    note: 'draft DRAFT_KEY — migrate in PR-013' },
  { file: 'src/modules/premium/premium-service.js', key: 'localStorage', note: '_CACHE_KEY premium flag — migrate in PR-019' },
  { file: 'src/modules/home-next/home-next-shell.js', key: 'localStorage', note: 'feature flag — migrate in PR-020' },
  { file: 'src/modules/home-renderer.js',      key: 'localStorage',    note: 'ippo_hide_add_home flag — migrate in PR-020' },
  { file: 'src/modules/onboarding-runtime.js', key: 'localStorage',    note: 'ippo_hide_add_home flag — migrate in PR-020' },
  { file: 'src/modules/insights-dynamic-renderer.js', key: 'localStorage', note: '_STABLE_KEY — migrate in PR-017' },
  { file: 'src/modules/daily-record-card-guard.js', key: 'localStorage', note: 'debug flag read — low priority' },
  { file: 'src/modules/record/save.js',        key: 'localStorage',    note: 'debug flag read — low priority' },
  // localStorage — src/services/
  { file: 'src/services/adaptive-signals.js',  key: 'localStorage',    note: '_STORAGE_KEY — migrate in PR-017' },
  { file: 'src/services/companion-intelligence.js', key: 'localStorage', note: '_CACHE_KEY — migrate in PR-017' },
  { file: 'src/services/companion-memory.js',  key: 'localStorage',    note: '_MEMORY_KEY — migrate in PR-017' },
  { file: 'src/services/life-rhythm-memory.js', key: 'localStorage',   note: '_LRM_KEY — migrate in PR-017' },
  { file: 'src/services/recovery.js',          key: 'localStorage',    note: 'ippo_last_record_count — migrate in PR-013' },
  { file: 'src/services/settings-profile.js',  key: 'localStorage',    note: 'SETTINGS_PROFILE_KEY — migrate in PR-020' },
  { file: 'src/services/settings-store.js',    key: 'localStorage',    note: 'STORE_KEY — migrate in PR-020' },
  { file: 'src/services/supabase.js',          key: 'localStorage',    note: 'session token keys — Supabase SDK internal, exempt' },
  // window.supabase direct access
  { file: 'src/main.js',                       key: 'window.supabase', note: 'prediction hook + bridge — migrate with AuthAdapter in PR-019' },
  { file: 'src/modules/record.js',             key: 'window.supabase', note: 'hasWindowSupabase diagnostic — low priority' },
  { file: 'src/runtime/runtime-debug-overlay.js', key: 'window.supabase', note: 'debug overlay — low priority' },
];

// ── Dynamic proxy install (lightweight, no behaviour change) ─────────────────
let _proxyInstalled = false;

export function installAuditProxy() {
  if (_proxyInstalled || typeof window === 'undefined') return;
  _proxyInstalled = true;

  // Wrap localStorage with a Proxy that tracks callers outside the adapter path.
  // Uses a lightweight stack-frame heuristic — not 100% accurate but useful.
  try {
    const _real = window.localStorage;
    const _warned = new Set();

    const _shouldWarn = (method) => {
      try {
        const stack = new Error().stack ?? '';
        // Allow calls from within the adapter
        if (stack.includes('local-storage-adapter')) return false;
        // Allow calls from known-legacy files that are catalogued above
        const key = `${method}`;
        if (_warned.has(key)) return false;
        _warned.add(key);
        return true;
      } catch (_) { return false; }
    };

    window.localStorage = new Proxy(_real, {
      get(target, prop) {
        if (typeof target[prop] === 'function') {
          return function(...args) {
            if (_shouldWarn(String(prop))) {
              console.warn(
                `[LegacyAccessAudit] Direct localStorage.${String(prop)}() detected. ` +
                `Use LocalStorageAdapter via DI container instead.`,
              );
            }
            return target[prop].apply(target, args);
          };
        }
        return target[prop];
      },
    });
  } catch (_) {
    // Proxy on localStorage may fail in some environments — fail silently
  }
}

// ── Static audit report ───────────────────────────────────────────────────────
export function runAccessAudit() {
  const byKey = KNOWN_VIOLATIONS.reduce((acc, v) => {
    (acc[v.key] ??= []).push(v);
    return acc;
  }, {});

  console.warn(
    `[LegacyAccessAudit] ${KNOWN_VIOLATIONS.length} known infrastructure bypass(es) catalogued. ` +
    `These will become errors in PR-015. Details:`
  );

  for (const [key, violations] of Object.entries(byKey)) {
    console.warn(`  [${key}] ${violations.length} site(s):`);
    for (const v of violations) {
      console.warn(`    • ${v.file} — ${v.note}`);
    }
  }
}

export function getViolationCount() {
  return KNOWN_VIOLATIONS.length;
}

export function getViolations() {
  return [...KNOWN_VIOLATIONS];
}

// ── PR-020 Audit API ──────────────────────────────────────────────────────────

/**
 * Count of known window.supabase direct references still in place.
 * Target: 0 before PR-021.
 * @returns {number}
 */
export function getSupabaseDirectCount() {
  return KNOWN_VIOLATIONS.filter(v => v.key === 'window.supabase').length;
}

/**
 * Count of known localStorage direct references (Repository bypass).
 * Exempt: src/services/supabase.js (Supabase SDK internal).
 * Target: 0 before PR-021.
 * @returns {number}
 */
export function getRepositoryBypassCount() {
  return KNOWN_VIOLATIONS.filter(
    v => v.key === 'localStorage' && !v.note.includes('exempt'),
  ).length;
}

/**
 * Full PR-020 audit summary.
 * @returns {{ supabaseDirect: number, repositoryBypass: number, total: number }}
 */
export function getPR020AuditSummary() {
  return {
    supabaseDirect:   getSupabaseDirectCount(),
    repositoryBypass: getRepositoryBypassCount(),
    total:            KNOWN_VIOLATIONS.length,
  };
}
