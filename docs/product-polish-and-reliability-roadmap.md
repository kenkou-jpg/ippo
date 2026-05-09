# ippo Product Polish & Reliability Roadmap

## Current phase

The migration and stabilization phases are complete.

ippo should now be treated as a maintainable SPA product, not a migration project.

Current priority order:

1. App display / startup reliability
2. Sync reliability
3. UX polish
4. Retention improvement
5. Insight quality
6. Lightweight E2E
7. Performance polish

## 1. App display / startup reliability

This is the highest priority because a blank screen breaks trust immediately.

Goals:

- app should never fail silently
- startup failures should show a fallback UI
- reload/recovery guidance should be available
- boot diagnostics should be available

Already introduced in Phase H:

- static boot fallback outside `#app`
- startup watchdog checks
- blank-screen detector
- global `error` capture
- global `unhandledrejection` capture
- reload button
- `window.ippoBootFailureSummary?.()`

Validation:

- normal boot hides fallback
- fallback appears only when app remains empty
- diagnostics are readable
- render timing is unchanged
- hydration sequencing is unchanged

## 2. Sync reliability

Priority:

```txt
record continuity
> sync aggressiveness
> architectural purity
```

Goals:

- offline save remains trustworthy
- reconnect does not shrink records
- reconnect does not duplicate same-date records
- stale cloud data does not overwrite fresh local edits
- temporary Supabase issues are recoverable

Allowed work:

- sync status copy
- offline/reconnect hints
- bounded diagnostics
- read-only sync observability

Avoid:

- persistence ordering rewrites
- sync lifecycle rewrites
- localStorage schema changes
- identity guard semantics changes

## 3. UX polish

Goals:

- reduce daily record entry friction
- make active navigation state clearer
- reduce perceived screen flicker
- improve save confidence
- improve edit continuity perception

Allowed work:

- copy improvements
- CSS-only polish
- helper text
- non-persistent feedback
- accessibility labels

Avoid:

- `showScreen` timing changes
- `switchTab` timing changes
- save lifecycle rewrites
- DOM ID/class/data attribute renames

## 4. Retention improvement

Goals:

- make daily continuation feel gentle and achievable
- reduce guilt from missed days
- make small wins visible
- create useful reasons to return

Potential features:

- gentle streak language
- weekly reflection card
- low-pressure reminder copy
- small pattern discovery prompts
- "record when you can" guidance

Avoid:

- guilt-based streak pressure
- anxiety-inducing health copy
- notification spam
- medical overclaiming

## 5. Insight quality

Principle:

Insights should help the user feel:

```txt
I can understand my body a little better from what I already recorded.
```

Goals:

- improve empty states
- improve trend readability
- add read-only derived summaries
- explain incomplete data gently
- improve body understanding cards

Allowed data behavior:

- read existing records
- tolerate missing fields
- fail gently

Forbidden data behavior:

- mutating records from insights
- writing localStorage
- writing Supabase
- changing save/sync behavior

Medical safety:

- avoid diagnosis-like language
- avoid treatment advice
- use non-diagnostic trend wording
- suggest medical consultation only for persistent concerns

## 6. Lightweight E2E

Priority tests:

- startup smoke
- blank-screen fallback smoke
- completed user reload
- new record save
- same-date edit
- offline save
- offline to online reconnect
- navigation drift
- insights read-only rendering

Short-term:

```bash
npm run build
npm run preview
```

Medium-term:

- add Playwright only after scenarios are stable
- start with smoke tests, not full coverage

Long-term CI gates:

- build
- startup smoke
- record save smoke
- same-date edit smoke
- offline persistence smoke

## 7. Performance polish

Goals:

- reduce startup cost
- reduce trace noise
- reduce duplicate runtime checks
- trim dead migration-only helpers
- keep user-facing responsiveness smooth

Allowed:

- dead trace pruning
- duplicated warning cleanup
- bounded debug summaries
- CSS polish
- lazy non-critical diagnostics where safe

Avoid:

- import order rewrites without evidence
- startup sequencing rewrites
- hydration sequencing rewrites
- render ownership rewrites

## Global non-negotiables

Do not change without a dedicated safety PR:

- render timing
- hydration sequencing
- `showScreen` timing
- `switchTab` timing
- save lifecycle ordering
- sync lifecycle ordering
- Supabase persistence ordering
- localStorage schema
- DOM IDs/classes/data attributes used by screens

## Runtime validation helpers

Useful console checks:

```js
window.ippoBootFailureSummary?.()
window.ippoWelcomeResetGuardSummary?.()
window.ippoUiTransitionOwnershipSummary?.()
window.ippoUiDriftSuppressionSummary?.()
window.ippoRecordFreshnessGuardSummary?.()
window.ippoEditSaveIdentityGuardSummary?.()
window.ippoStabilizationAssertionsRuntimeSummary?.()
window.ippoVerifyLastRecordSave?.()
```

Expected healthy state:

- app renders
- fallback stays hidden on normal boot
- one active screen only
- no stale replay loops
- no duplicate same-date records
- no record shrink after reconnect
- save/edit continuity preserved

## Completion definition

This roadmap is complete when ippo feels like a production-oriented self-care app:

- it starts reliably
- it fails visibly and recoverably
- records remain continuous
- sync is trustworthy
- insights feel useful and safe
- tests protect the most important flows
- performance polish does not destabilize architecture
