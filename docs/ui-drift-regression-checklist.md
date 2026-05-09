# UI Drift Regression Checklist

This checklist validates Phase C UI drift stabilization.

## Scope

Phase C focuses on preventing stale UI replay without rewriting render, hydration, or navigation timing.

Covered regressions:

- completed users returning to welcome/onboarding
- stale hydration replay overwriting newer screen state
- stale switchTab replay overwriting newer screen state
- modal close followed by stale modal reopen
- browser back/popstate replay restoring an old screen
- active screen disappearing after guard/suppression

## Required console summaries

Run these after each manual scenario:

```js
window.ippoWelcomeResetGuardSummary?.()
window.ippoUiTransitionOwnershipSummary?.()
window.ippoUiDriftSuppressionSummary?.()
window.ippoRecordFreshnessGuardSummary?.()
window.ippoStabilizationAssertionsRuntimeSummary?.()
```

Expected:

- no startup errors
- no missing runtime summaries
- no unexpected welcome visibility for completed users
- no unexpected multiple active screens
- suppressions only for stale replay candidates

## Scenario 1 — Completed user must not return to welcome

Steps:

1. Open app with existing records.
2. Navigate Home → Calendar → Record → Home.
3. Reload the page.
4. Wait for hydration to finish.

Expected:

- `screen-welcome` remains hidden.
- `main-app` remains visible.
- `window.ippoWelcomeResetGuardSummary().shouldBlockWelcome === true`.
- Any `welcome-replay-suppressed` event is acceptable only if caused by stale replay.

## Scenario 2 — Hydration must not overwrite newer UI transition

Steps:

1. Open app.
2. Immediately navigate to Calendar or Record while startup/hydration is settling.
3. Wait 3-5 seconds.

Expected:

- The selected screen remains stable.
- No completed user is sent to welcome.
- If stale hydration attempts to restore another screen, `hydration-replay-suppressed` appears.

## Scenario 3 — switchTab must not overwrite newer screen transition

Steps:

1. Navigate between tabs rapidly.
2. Open Record screen.
3. Switch back to Home or Calendar.

Expected:

- Final visible screen matches the last user action.
- If an older tab replay attempts to win, `tab-replay-suppressed` appears.

## Scenario 4 — Modal close must not reopen from stale replay

Steps:

1. Open any visible modal/dialog.
2. Close it.
3. Trigger navigation or wait briefly.

Expected:

- Closed modal does not reopen unexpectedly.
- Modal lifecycle appears in `window.ippoUiDriftSuppressionSummary().recentEvents`.
- If stale reopen occurs, `modal-replay-suppressed` appears.

## Scenario 5 — Browser back/popstate must not restore stale UI

Steps:

1. Navigate Home → Calendar → Record.
2. Use browser Back.
3. Observe final screen.

Expected:

- App remains in a valid visible screen.
- Completed user is not sent to welcome.
- If stale navigation restore is detected, `navigation-replay-suppressed` appears.

## Scenario 6 — Save flow still works after UI suppression

Steps:

1. Create a new record.
2. Confirm it appears in Home/Calendar.
3. Edit the same record.
4. Confirm no duplicate same-date record remains.

Expected:

- Record save still completes.
- Calendar reflection still occurs.
- `window.ippoEditSaveIdentityGuardSummary?.().duplicateDateCount === 0`.
- UI suppression does not block save flow.

## Scenario 7 — Offline/online freshness repair remains safe

Steps:

1. Open app with records.
2. Go offline.
3. Create or edit a record if browser allows local save.
4. Go online.

Expected:

- Records do not shrink unexpectedly.
- If stale overwrite is detected, `stale-record-overwrite-candidate` appears.
- Guarded repair may appear as `stale-record-overwrite-repaired` only when current records shrink.

## Merge readiness

Before merging Phase C:

- [ ] `npm run build` passes in CI.
- [ ] No `GET /src/modules/*.js 404` errors.
- [ ] Completed users do not see welcome after reload.
- [ ] Save/edit flow still works.
- [ ] Calendar reflects saved records.
- [ ] Modal close does not reopen unexpectedly.
- [ ] Browser back does not restore stale welcome/onboarding.
- [ ] Suppression logs are limited to stale replay candidates.

## Notes

The Phase C runtimes are intentionally guarded and additive. They should not change persistence order, sync order, hydration timing, or render timing.
