# ippo Final Stabilization & Merge Checklist

## Current architecture state

ippo has completed the migration from:

- giant `app.html`
- inline startup/runtime ownership
- window-global-heavy execution

into:

- minimal shell
- Vite SPA structure
- runtime ownership separation
- modular services/stores
- guarded stabilization runtimes

Current structure:

```txt
app.html
↓
minimal shell
↓
src/main.js
↓
bootstrap/runtime ownership
↓
modules/*
↓
store/*
↓
services/*
```

## Migration status

### Completed

- startup ownership migration
- hydration ownership migration
- render ownership migration
- screen activation ownership migration
- app.html slimming
- compatibility bridge reduction
- save/sync stabilization
- stale overwrite repair
- transition ownership runtime
- UI drift suppression runtime
- onboarding replay suppression
- hydration replay suppression
- tab replay suppression
- modal replay suppression
- navigation replay suppression

### Remaining scope

Only final stabilization/hardening remains.

No additional architecture migration should be introduced.

## Final validation checklist

### Startup/hydration

- [ ] No startup console errors
- [ ] No missing runtime imports
- [ ] No `/src/modules/*.js` 404 errors
- [ ] No hydration replay to welcome for completed users
- [ ] `main-app` remains visible after reload

### Save/edit flows

- [ ] New record save works
- [ ] Same-date edit updates existing record
- [ ] No duplicate same-date records
- [ ] Calendar reflects saved records
- [ ] Save order remains stable
- [ ] Offline fallback still works

### UI stabilization

- [ ] `showScreen` transitions remain stable
- [ ] `switchTab` transitions remain stable
- [ ] Browser Back does not restore stale onboarding
- [ ] Modal close does not reopen stale modal
- [ ] No multiple `.screen.active` drift
- [ ] Active screen reconciliation does not loop

### Sync/reconnect

- [ ] localStorage restore remains stable
- [ ] Supabase sync remains stable
- [ ] Offline → online does not shrink records
- [ ] No duplicate reconnect sync

### Regression/runtime assertions

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

- runtimes load correctly
- suppression counts stay bounded
- no repeated stale replay loops
- no duplicate save candidates

## Cleanup policy

Allowed cleanup:

- dead trace pruning
- redundant warning pruning
- duplicated runtime helper cleanup
- minor performance trimming
- debug log reduction

Not allowed during final stabilization:

- hydration timing rewrites
- render sequencing rewrites
- persistence order rewrites
- save/sync rewrites
- DOM ID renames
- screen lifecycle rewrites

## Final goal

The final goal is no longer:

```txt
"make migration survive"
```

The final goal is:

```txt
"preserve user trust and record continuity"
```

The app should now behave as a maintainable SPA with guarded stabilization layers instead of a fragile inline HTML runtime.
