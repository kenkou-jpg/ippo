# Phase G — E2E, Persistence & Offline/Online Regression Test Plan

## Goal

Create a durable regression test strategy for the stabilized Vite SPA.

Phase G should protect the most important outcome of the migration:

```txt
user records remain continuous and the app does not drift across startup, save, navigation, and reconnect flows.
```

This phase should not introduce new runtime architecture.

## Testing priorities

### Priority 1 — Record continuity

The most important tests protect:

- new record save
- same-date edit
- duplicate prevention
- local persistence
- stale overwrite prevention
- offline save continuity
- reconnect preservation

### Priority 2 — UI drift prevention

Tests should protect:

- no stale welcome replay
- no hydration replay to onboarding
- no multiple active screens
- no modal replay loop
- tab/screen alignment
- browser back stability

### Priority 3 — Sync reliability

Tests should protect:

- offline-first behavior
- reconnect without shrink
- reconnect without duplicate same-date records
- temporary Supabase failure tolerance
- delayed sync visibility

## Recommended test layers

### 1. Manual smoke checklist

Use before every merge touching:

- record
- persistence
- sync
- navigation
- hydration
- insights
- onboarding

### 2. Lightweight unit-style checks

Target pure or mostly-pure helpers:

- record date normalization
- same-date identity matching
- upsert helpers
- merge-preserving-existing behavior
- record repository snapshots

### 3. Browser E2E tests

Recommended flows:

1. first load completed user
2. first load incomplete onboarding user
3. home → record → save → calendar
4. calendar day → edit same date → save
5. record → insights → record
6. modal open/close → navigation
7. browser back after record edit
8. offline save → reload → reconnect

## E2E scenarios

### Scenario A — Completed user reload

Expected:

- app opens to main app
- welcome does not replay
- one active screen only
- bottom nav active state matches visible screen

### Scenario B — New record save

Expected:

- saving creates one record
- calendar shows saved state
- insights can read record
- localStorage remains populated
- no duplicate same-date record

### Scenario C — Same-date edit

Expected:

- edit updates existing record
- record count does not increase
- previous non-edited fields are preserved when expected
- identity guard does not report violation

### Scenario D — Offline save

Expected:

- local save succeeds
- user does not lose entered data
- sync can be delayed
- reload still restores local record

### Scenario E — Offline → online reconnect

Expected:

- latest local record remains present
- reconnect does not shrink records
- reconnect does not duplicate same-date record
- no stale overwrite occurs
- no welcome/hydration replay occurs

### Scenario F — UI drift suppression

Expected:

- modal close does not reopen stale modal
- browser back does not restore stale onboarding
- only one `.screen.active` exists
- active screen reconciliation does not loop

## Runtime console checks

After test flows, run:

```js
window.ippoWelcomeResetGuardSummary?.()
window.ippoUiTransitionOwnershipSummary?.()
window.ippoUiDriftSuppressionSummary?.()
window.ippoRecordFreshnessGuardSummary?.()
window.ippoEditSaveIdentityGuardSummary?.()
window.ippoStabilizationAssertionsRuntimeSummary?.()
window.ippoVerifyLastRecordSave?.()
```

Expected:

- bounded suppression counts
- no repeated stale replay loops
- no duplicate save candidates
- no identity guard violations
- no reconnect-triggered screen drift

## Suggested tooling

### Short-term

Use manual smoke checks plus existing Vite build:

```bash
npm run build
npm run preview
```

### Medium-term

Add Playwright only after test scenarios are stable.

Initial Playwright targets:

- startup smoke
- record save smoke
- same-date edit smoke
- offline persistence smoke
- navigation drift smoke

### Long-term

Add CI gates for:

- build
- smoke E2E
- persistence helper checks
- offline/online regression smoke

## Test data guidance

Use minimal fixture states:

### Empty state

- no records
- completed onboarding false or missing

### Completed user state

- onboarding complete
- zero records

### Record fixture state

- 1 record
- 7 records
- same-date edit candidate
- partial record with missing optional fields

### Offline fixture state

- local record exists
- cloud sync delayed or unavailable
- reconnect candidate present

## Non-goals

Phase G should not:

- rewrite app architecture
- introduce a new framework
- rewrite hydration
- rewrite persistence
- rewrite Supabase sync
- rename DOM IDs
- require full medical/analytics correctness tests

## Merge safety checklist

Before merging test-related PRs:

- [ ] `npm run build` passes
- [ ] app starts from preview
- [ ] completed user does not replay welcome
- [ ] record save still works
- [ ] same-date edit does not duplicate
- [ ] offline save preserves local record
- [ ] reconnect does not shrink records
- [ ] insights renders without mutating records
- [ ] no multiple active screens

## Completion definition

Phase G is complete when the project has a stable, repeatable regression strategy that protects record continuity, UI drift suppression, and offline/online reliability without increasing runtime complexity.
