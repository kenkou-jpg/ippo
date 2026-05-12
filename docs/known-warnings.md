# Known Warnings

Intentionally accepted warnings in ippo's production build and runtime.

Each entry documents: what the warning is, why it exists, why it is safe to keep, and the condition under which it should be resolved.

---

## 1. Vite: dynamic import also statically imported

### Warning text

```
(!) <module> is dynamically imported by src/main.js but also statically imported
by src/modules/runtime-sequencing.js (or record.js), dynamic import will not move
module into another chunk.
```

### Affected modules

| Module | Also statically imported by |
|--------|-----------------------------|
| `startup-guard-candidate.js` | `runtime-sequencing.js` |
| `legacy-bootstrap-fallback-isolation.js` | `runtime-sequencing.js` |
| `startup-sequencing-candidate-orchestration.js` | `runtime-sequencing.js` |
| `main-entry-startup-observer-wiring.js` | `runtime-sequencing.js` |
| `record-save-orchestrator.js` | `record.js` |

### Why it exists

These modules are listed in `src/main.js` as optional runtime lanes (deferred dynamic imports with explicit `delayMs`). They are also statically imported by `runtime-sequencing.js` and `record.js` because those files are observe-only registrars that must run before optional lane scheduling.

The dual-import is intentional: the static import ensures the module is registered, and the dynamic import entry in the lane list is a no-op from a chunk perspective (Vite will colocate the module in the main chunk).

### Why it is safe

- The modules are all observe-only / diagnostics-only layers. They do not own startup, hydration, render, or persistence execution.
- The practical effect is that these modules are bundled in the main chunk rather than split into separate async chunks. This is a bundle optimization miss, not a runtime error.
- App behavior and startup ordering are unaffected.

### Resolution condition

Resolve if and only if a dedicated chunk-splitting phase is approved. This requires removing the static imports from `runtime-sequencing.js` and `record.js` after confirming no runtime path depends on the static registration order. Do not attempt without a careful phase-by-phase plan.

**Current decision: keep. Runtime safety > chunk optimization.**

---

## 2. Service Worker: legacy compatibility files

### What exists

| File | Status |
|------|--------|
| `public/sw.js` | Canonical source. Deployed as `dist/sw.js`. Edit here. |
| `service-worker.js` | Legacy containment. Mirrors old behavior. Do not edit. |
| `sw.js` (root) | Compatibility mirror for old GitHub Pages raw-source delivery. Do not edit. |

### Why it exists

Before the `dist/` deploy migration, GitHub Pages served files directly from the repository root. Some users' browsers registered the root `sw.js`. After the migration to `dist/`-based deploys, `public/sw.js` became canonical, but the root file was kept to avoid breaking cached SW registrations.

### Why it is safe

The Service Worker lifecycle is fully contained. The SW scope is `/`. Clients that registered the old root `sw.js` will eventually be updated when the browser's SW update check fires. No runtime behavior depends on the legacy files remaining.

### Resolution condition

Remove `service-worker.js` and the root `sw.js` after confirming:
1. No active client is still registered to the root SW scope based on old raw-source delivery.
2. A grace period of at least one release cycle has passed since the `dist/` deploy migration.

**Current decision: keep for compatibility. Remove in a dedicated SW cleanup phase.**

---

## 3. Console warning: missing Supabase key

### Warning text

```
ippo: SUPABASE_KEY is not available. Supabase client was not initialized.
```

### When it appears

This warning appears in local development environments where `.env.local` has not been created. It also appears in any build where the `VITE_SUPABASE_KEY` secret was not injected.

### Why it is safe

`src/services/supabase.js` is designed to degrade gracefully: when the key is absent, `supabase` is set to `null` and `window.__ippoSupabaseStatus.reason` is set to `'missing-supabase-key'`. The app continues to function in local-only mode using localStorage.

### Resolution condition

This warning should NOT appear in production. If it appears after a production deploy:
1. Confirm `VITE_SUPABASE_KEY` is set in GitHub Secrets.
2. Trigger a fresh build — the key is injected at build time, not at runtime.

For local development: copy `.env.example` to `.env.local` and fill in the anon key.

**Current decision: expected in local dev, must not appear in production.**

---

## 4. Optional runtime module load timeout

### What it is

The optional runtime lane loader (`guarded-optional-runtime-loader.js`) logs a warning if a dynamically imported module exceeds its `timeoutMs` threshold.

### Why it exists

Optional runtime modules (observability, migration assurance, record observability) are scheduled with explicit delays (350ms–2200ms base) and timeouts (2500ms). If a module import takes longer than expected (slow network, cold cache), the timeout fires and the module load is abandoned.

### Why it is safe

All modules loaded through the optional lane system are explicitly annotated as non-execution-critical. They are observe-only, diagnostics-only, or candidate-rehearsal layers. A timeout means observability data is unavailable, not that any user-facing feature is broken.

### Resolution condition

If this warning appears persistently in production, investigate network conditions or bundle size for the affected module. No architecture change is required.

**Current decision: expected under degraded network conditions, acceptable.**

---

## Summary table

| Warning | Severity | Action required |
|---------|----------|-----------------|
| Vite dynamic/static import | Build-time info | None (chunk opt deferred) |
| Legacy SW files | Operational note | Remove in future SW cleanup phase |
| Missing Supabase key (local) | Dev-only expected | None for local dev |
| Missing Supabase key (production) | P0 | Redeploy with secret set |
| Optional runtime timeout | Runtime info | Monitor; no immediate action |
