# Phase E — Maintenance Cleanup Checklist

## Goal

Phase E is no longer architecture migration.

The purpose is:

- UX polish
- trace pruning
- dead runtime reduction
- observability cleanup
- performance trimming
- maintenance safety

without rewriting runtime timing or persistence sequencing.

## Important constraints

Do NOT change:

- `showScreen` timing
- `switchTab` ordering
- hydration sequencing
- save lifecycle ordering
- sync lifecycle ordering
- Supabase persistence ordering
- DOM IDs
- screen lifecycle ownership

## Allowed cleanup

### Trace pruning

Allowed:

- excessive debug logs
- duplicate runtime summaries
- repeated startup assertions
- obsolete migration-only warnings
- duplicate console trace helpers

Not allowed:

- removing runtime guards still participating in replay suppression
- removing freshness guards
- removing edit/save identity guards

## Runtime cleanup policy

Safe candidates:

- migration rehearsal runtimes no longer referenced
- duplicated summary helpers
- dead compatibility traces
- dead shadow preview logs

Unsafe candidates:

- runtime ownership graph
- guarded execution runtimes
- UI drift suppression
- welcome reset guard
- persistence guarded execution

## UX polish targets

### Record flow

- reduce save friction
- improve edit continuity
- reduce accidental double interaction
- improve mobile spacing stability

### Navigation

- reduce visual transition flicker
- reduce stale modal restoration perception
- preserve active screen continuity

### Insights

- improve body understanding readability
- improve continuity motivation
- improve symptom trend readability

## Validation

Before merge:

- no startup regressions
- no save regressions
- no duplicate records
- no stale onboarding replay
- no screen drift
- no offline-online shrink

Run:

```js
window.ippoWelcomeResetGuardSummary?.()
window.ippoUiTransitionOwnershipSummary?.()
window.ippoUiDriftSuppressionSummary?.()
window.ippoRecordFreshnessGuardSummary?.()
window.ippoEditSaveIdentityGuardSummary?.()
window.ippoStabilizationAssertionsRuntimeSummary?.()
```

Expected:

- bounded suppression counts
- no replay loops
- no duplicate persistence candidates
- no repeated startup assertion spam

## Phase roadmap

### Phase E-1

- cleanup policy
- trace pruning
- dead runtime identification
- maintenance safety rails

### Phase E-2

- record UX polish
- navigation friction reduction
- transition polish

### Phase F-1

- insights enhancement
- body understanding UX
- continuity UX

### Phase F-2

- sync reliability
- reconnect resilience
- offline/online stability

### Phase G

- E2E tests
- persistence regression tests
- offline/online tests
