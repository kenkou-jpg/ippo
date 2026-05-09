# Phase A — Manual Regression Checklist

This checklist starts the post-migration stabilization phase.

The goal is to verify critical user flows after the minimal shell + Vite modules migration without changing render timing, hydration timing, persistence order, DOM IDs, or the thin compatibility bridge.

## Non-negotiable safety rules

Do not change these while investigating regressions:

- `showScreen` timing
- `switchTab` timing
- hydration timing
- `saveState` timing
- persistence order
- sync lifecycle order
- DOM IDs
- classes used by existing screens
- `data-*` attributes
- thin compatibility bridge APIs:
  - `saveState`
  - `loadState`
  - `showScreen`
  - `switchTab`
  - `saveRecord`

## Required baseline before each fix PR

Run the available build check:

```bash
npm run build
```

Then perform the manual checks below in a browser.

## 1. Startup / hydration

### Fresh user state

- [ ] Open the app with a clean browser profile or cleared localStorage.
- [ ] Confirm the app renders from the minimal shell.
- [ ] Confirm no blank screen after module load.
- [ ] Confirm onboarding or first-run UI appears as expected.
- [ ] Refresh the page.
- [ ] Confirm the same startup state is restored.

### Existing user state

- [ ] Open the app with existing localStorage records.
- [ ] Confirm hydration completes before user-visible record/calendar state is relied on.
- [ ] Confirm no duplicate startup UI appears.
- [ ] Confirm no console error from missing bridge functions.

## 2. Record save flow

### New record

- [ ] Open the record screen.
- [ ] Fill a minimal valid record.
- [ ] Save.
- [ ] Confirm the save completes once.
- [ ] Confirm the record appears in the current app state.
- [ ] Confirm the record survives reload.
- [ ] Confirm localStorage contains the saved record.
- [ ] Confirm no duplicate record is created for the same date.

### Edit existing record

- [ ] Open an existing record.
- [ ] Change one field.
- [ ] Save.
- [ ] Confirm the original record identity/date is preserved.
- [ ] Confirm unchanged fields are not unintentionally cleared.
- [ ] Confirm the edit survives reload.
- [ ] Confirm calendar reflects the edited record.

### Repeated save edge case

- [ ] Save a record.
- [ ] Immediately reopen the same date.
- [ ] Save again.
- [ ] Confirm no duplicate record appears.
- [ ] Confirm no stale rollback message remains visible.

## 3. Calendar

### Initial render

- [ ] Open the calendar screen after startup.
- [ ] Confirm the current month renders.
- [ ] Confirm existing records are visible on their expected dates.
- [ ] Confirm no record from another month leaks into the current month.

### Month switching

- [ ] Switch to the previous month.
- [ ] Switch to the next month.
- [ ] Return to the current month.
- [ ] Confirm records are still rendered on correct dates.
- [ ] Confirm no blank calendar after repeated switching.

### Save reflection

- [ ] Save a new record from the record screen.
- [ ] Return to calendar.
- [ ] Confirm the new record appears without requiring a hard reload when expected.
- [ ] Refresh.
- [ ] Confirm the record still appears.

## 4. Onboarding

### First-run completion

- [ ] Clear localStorage.
- [ ] Open the app.
- [ ] Complete onboarding.
- [ ] Confirm the main app appears.
- [ ] Refresh.
- [ ] Confirm onboarding does not reappear unexpectedly.

### Hydration after completion

- [ ] Complete onboarding.
- [ ] Navigate between main screens.
- [ ] Refresh.
- [ ] Confirm the completed state is restored after hydration.

## 5. Screen transitions

### Core navigation

- [ ] Use `showScreen`-backed navigation.
- [ ] Use `switchTab`-backed navigation.
- [ ] Confirm each screen activates once.
- [ ] Confirm the previous screen is hidden as expected.
- [ ] Confirm no screen remains partially active after switching.

### Modal reopen

- [ ] Open a modal.
- [ ] Close it.
- [ ] Reopen it.
- [ ] Confirm event handlers still work.
- [ ] Confirm no duplicate close/save handler fires.

### Browser back / return path

- [ ] Navigate across at least three screens.
- [ ] Use browser back or app back navigation where available.
- [ ] Confirm app state remains consistent.
- [ ] Confirm no blank screen is shown.

## 6. Sync / persistence

### Offline fallback

- [ ] Start online.
- [ ] Save a record.
- [ ] Go offline.
- [ ] Save or edit another record.
- [ ] Confirm localStorage fallback persists the change.
- [ ] Refresh while offline if supported.
- [ ] Confirm the local change remains visible.

### Reconnect

- [ ] Return online.
- [ ] Confirm sync is attempted once per pending change.
- [ ] Confirm no duplicate record appears after reconnect.
- [ ] Confirm local state and remote sync state do not visibly diverge.

### Duplicate sync guard

- [ ] Trigger two quick consecutive saves.
- [ ] Confirm only one logical latest record remains.
- [ ] Confirm no duplicate sync notification or duplicate persisted item appears.

## 7. Compatibility bridge smoke check

In the browser console, verify these still exist during the stabilization phase:

```js
typeof window.saveState === 'function'
typeof window.loadState === 'function'
typeof window.showScreen === 'function'
typeof window.switchTab === 'function'
typeof window.saveRecord === 'function'
```

Do not remove these until a dedicated bridge-removal phase proves no remaining runtime path depends on them.

## Regression notes template

Use this format when a manual check fails:

```md
### Regression

- Area:
- Steps to reproduce:
- Expected:
- Actual:
- Console errors:
- localStorage state before:
- localStorage state after:
- Suspected boundary:
  - startup
  - hydration
  - render
  - screen activation
  - record save
  - persistence
  - sync
- Fix constraint:
  - no timing rewrite
  - no persistence order rewrite
  - no DOM ID/class/data attribute rename
```

## Phase A exit criteria

Phase A is complete when:

- [ ] Record new save passes.
- [ ] Record edit save passes.
- [ ] Calendar render and month switching pass.
- [ ] Onboarding first-run and completed-state hydration pass.
- [ ] Screen transitions and modal reopen pass.
- [ ] Offline/localStorage fallback path passes.
- [ ] Reconnect sync path has no visible duplicate records.
- [ ] `npm run build` passes.

After this checklist is stable, move to Phase B: targeted persistence/E2E tests.
