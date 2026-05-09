# Phase I — Long-Term Boot Resilience

## Current problem

The app can still reach this state:

```txt
app.html loads
↓
static fallback watchdog runs
↓
src/main.js begins loading
↓
one static import or top-level runtime hangs / throws
↓
render never reaches #app
↓
fallback stays visible forever
```

This means the blank-screen fallback is working, but the boot architecture is still too tightly coupled.

## Long-term goal

A single startup runtime must not be able to block the whole app from rendering.

The app should boot in layers:

```txt
Layer 0: static shell fallback
Layer 1: minimal app render path
Layer 2: critical state + screen activation
Layer 3: save/persistence guards
Layer 4: sync/diagnostics/observability
Layer 5: migration-only or cleanup runtimes
```

Only Layers 0–2 should be allowed to block initial display.

Everything else should be loaded after the first visible screen or behind guarded dynamic imports.

## Core principle

```txt
render first
then harden
then observe
```

Do not allow observability, migration rehearsal, or cleanup runtimes to block first paint.

## Why the current structure is fragile

`src/main.js` currently performs many static imports.

In ES modules, a failure or hang in any static dependency can prevent the entire module graph from finishing.

That means non-critical runtimes can accidentally become boot-critical.

## Target architecture

### Phase I-1 — Classify startup imports

Every `src/main.js` import should be classified as one of:

1. critical boot
2. critical render
3. critical persistence safety
4. post-render stabilization
5. diagnostics / observability
6. migration-only / obsolete

### Phase I-2 — Move non-critical runtimes behind guarded dynamic imports

Use a helper such as:

```js
async function importOptionalRuntime(label, importer) {
  try {
    return await importer();
  } catch (error) {
    window.ippoMarkBootError?.('optional-runtime-import-failed', {
      label,
      message: error && error.message ? error.message : String(error),
    });
    return null;
  }
}
```

Non-critical imports should not be static imports in the initial boot path.

### Phase I-3 — Introduce first-render boundary

Define a clear boundary:

```txt
first visible app screen reached
```

After this boundary, load:

- diagnostics runtimes
- observability runtimes
- migration compatibility checks
- cleanup checks
- non-critical summaries

### Phase I-4 — Add timeout protection

Optional runtime loading should be timeout-bounded.

A hung runtime should be recorded but should not freeze the UI.

### Phase I-5 — Prune obsolete migration runtimes

After classification, remove or quarantine migration-only runtimes that are no longer needed.

This should be done only after first-render safety exists.

## What must remain boot-critical

Likely boot-critical:

- static fallback watchdog
- minimal app shell renderer
- state load needed for first screen decision
- onboarding/main-app decision
- screen activation path required for first visible screen

## What should not be boot-critical

Likely post-render or optional:

- summary helpers
- migration rehearsal runtimes
- shadow candidate runtimes
- duplicate assertion checks
- ownership graph diagnostics
- trace-only modules
- cleanup readiness checks
- non-critical sync diagnostics

## Safety constraints

Do not change casually:

- `showScreen` timing
- `switchTab` timing
- hydration sequencing
- save lifecycle ordering
- sync lifecycle ordering
- Supabase persistence ordering
- localStorage schema
- record identity guards
- DOM IDs/classes/data attributes

## Immediate recovery strategy

If the app is currently stuck on the fallback screen, the next safe code fix is:

1. identify the minimal import set required for first render
2. keep only that set static
3. move diagnostics/migration runtimes to post-render guarded dynamic imports
4. preserve existing fallback diagnostics

## Validation checklist

Before merging Phase I implementation:

- [ ] app renders a visible screen on GitHub Pages
- [ ] fallback does not stay forever on healthy boot
- [ ] optional runtime failures are logged, not fatal
- [ ] save/edit still works
- [ ] same-date edit does not duplicate
- [ ] offline save still works
- [ ] reconnect does not shrink records
- [ ] no stale welcome replay
- [ ] no multiple active screens

## Console checks

```js
window.ippoBootFailureSummary?.()
window.ippoBootTimelineSummary?.()
window.ippoWelcomeResetGuardSummary?.()
window.ippoRecordFreshnessGuardSummary?.()
window.ippoEditSaveIdentityGuardSummary?.()
```

## Completion definition

Phase I is complete when ippo can still render the first usable screen even if a non-critical runtime import fails or hangs.

At that point, startup resilience is structural, not just fallback-based.
