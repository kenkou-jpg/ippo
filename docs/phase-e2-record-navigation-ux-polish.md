# Phase E-2 — Record & Navigation UX Polish

## Goal

Improve daily-use friction after the migration/stabilization phase without changing runtime ownership, render timing, hydration sequencing, or save/sync order.

This phase is intentionally limited to UX polish and regression-safe guidance.

## Scope

### Record input UX

Focus areas:

- reduce uncertainty before save
- reduce accidental repeated save taps
- improve edit continuity perception
- make required/important input states easier to understand
- preserve the existing save pipeline

Allowed changes:

- visual affordance improvements
- helper text improvements
- disabled/loading state styling
- non-persistent UI feedback
- accessibility labels where safe
- copy improvements

Not allowed:

- rewriting `saveRecordScreen`
- changing `saveState` ordering
- changing Supabase sync ordering
- changing record identity resolution
- changing same-date edit merge behavior
- changing localStorage keys

## Navigation UX

Focus areas:

- reduce perceived flicker between screens
- make active tab state clearer
- avoid stale modal/onboarding perception
- preserve existing `showScreen` and `switchTab` timing

Allowed changes:

- CSS-only transition polish
- active state clarity
- copy/label improvements
- safe fallback UI hints

Not allowed:

- rewriting `showScreen`
- rewriting `switchTab`
- changing screen activation order
- changing browser history behavior
- changing DOM IDs/classes/data attributes

## Suggested implementation order

### Step 1 — Audit current friction

Check these user paths:

1. home → record
2. calendar day → record edit
3. save new record
4. save existing same-date record
5. record → calendar
6. record → insights
7. modal open/close during navigation
8. browser back after record edit

### Step 2 — Add only guarded UI polish

Prefer:

- CSS refinements
- helper text
- aria attributes
- non-persistent state indicators

Avoid:

- persistent data model changes
- save/sync lifecycle changes
- render sequencing changes

### Step 3 — Validate record continuity

Required checks:

- new record save works
- same-date edit updates existing record
- no duplicate same-date record
- calendar reflects saved record
- insights still reads existing records
- offline save still works
- offline → online does not shrink records

## Manual validation commands

Run in console after exercising record/navigation flows:

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

- no stale onboarding replay
- no modal replay loop
- no multiple active screens
- no duplicate save candidates
- no identity guard violations
- no record shrink after reconnect

## PR boundary

This Phase E-2 PR should be considered safe if it only changes:

- docs
- copy
- CSS-only polish
- non-persistent UI feedback
- accessibility hints

Any functional save/sync/navigation behavior change must be split into a separate PR and explicitly reviewed against the Phase D stabilization checklist.

## Completion definition

Phase E-2 is complete when:

- record entry feels clearer
- navigation feels less jumpy
- active screen/tab state is easier to understand
- save/edit continuity is preserved
- no runtime timing or persistence behavior changes are introduced
