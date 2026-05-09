# Phase F-2 — Sync Reliability & Offline/Online Stabilization

## Goal

Improve trust and resilience around sync and reconnect behavior without rewriting the existing persistence lifecycle.

The priority is:

```txt
record continuity
> sync aggressiveness
> architectural purity
```

This phase must preserve the existing save pipeline and guarded stabilization layers.

## Important constraints

Do NOT change:

- `saveState` ordering
- Supabase persistence ordering
- save lifecycle sequencing
- hydration sequencing
- render timing
- record identity merge behavior
- same-date edit semantics
- localStorage schema
- guarded replay suppression logic

## Reliability goals

### 1. Offline-first continuity

The app should continue feeling stable when:

- offline during save
- reconnect after offline use
- refresh while partially offline
- temporary Supabase failure
- delayed sync completion

### 2. Reconnect stability

Reconnect should:

- avoid duplicate sync attempts
- avoid record shrink perception
- avoid stale overwrite
- avoid replay loops
- preserve latest local edits

### 3. User trust

The user should understand:

- records are still locally preserved
- sync may complete later
- temporary network issues are recoverable

without panic-oriented language.

## Allowed work

### Safe additions

- sync status copy improvements
- reconnect helper messaging
- read-only sync observability
- retry visibility
- bounded debug summaries
- offline UI hints
- resilience documentation
- non-persistent indicators

### Not allowed

- persistence rewrites
- sync queue rewrites
- changing Supabase order
- changing localStorage ownership
- changing save candidate selection
- changing freshness guard behavior
- changing identity guard semantics
- changing hydration ownership

## Sync observability

Recommended observability targets:

- last successful sync timestamp
- pending reconnect visibility
- duplicate reconnect detection
- offline session duration visibility
- reconnect attempt counters

Observability must remain:

- read-only
- bounded
- optional
- failure tolerant

## Offline/online scenarios

### Required validation paths

1. Save while offline
2. Refresh while offline
3. Reconnect after offline save
4. Multiple reconnect attempts
5. Same-date edit during reconnect
6. Refresh during delayed sync
7. Open insights after reconnect
8. Open calendar after reconnect

## Expected safe behavior

### Acceptable

- delayed cloud sync
- temporary stale indicator
- eventual reconnect retry
- temporary offline badge

### Unacceptable

- record disappearance
- duplicate same-date records
- stale overwrite after reconnect
- welcome replay after reconnect
- active screen drift
- reconnect-triggered hydration replay
- infinite sync retry loops

## Suggested implementation order

### Step 1 — Improve observability only

Start with:

- status labels
- helper text
- debug summaries
- reconnect visibility

without touching persistence behavior.

### Step 2 — Validate reconnect paths

Exercise:

- airplane mode
- delayed reconnect
- refresh during reconnect
- multiple tab reopen

### Step 3 — Add bounded retry guidance only if safe

Allowed:

- user-facing reassurance
- retry status copy
- passive reconnect indicators

Avoid:

- automatic retry rewrites
- queue mutation
- forced replay

## Validation checklist

- [ ] offline save still works
- [ ] reconnect preserves latest local edits
- [ ] no duplicate same-date records
- [ ] no stale overwrite after reconnect
- [ ] no hydration replay after reconnect
- [ ] no welcome replay after reconnect
- [ ] calendar remains consistent after reconnect
- [ ] insights remains readable after reconnect
- [ ] multiple reconnect attempts do not loop infinitely

## Console/runtime checks

After offline/online testing:

```js
window.ippoRecordFreshnessGuardSummary?.()
window.ippoEditSaveIdentityGuardSummary?.()
window.ippoUiDriftSuppressionSummary?.()
window.ippoUiTransitionOwnershipSummary?.()
window.ippoStabilizationAssertionsRuntimeSummary?.()
window.ippoVerifyLastRecordSave?.()
```

Expected:

- bounded suppression counts
- no stale replay loops
- no duplicate persistence candidates
- no identity guard violations
- no reconnect-triggered screen drift

## PR boundary

A safe Phase F-2 PR may include:

- docs
- copy
- observability helpers
- status UI
- offline hints
- bounded diagnostics

A risky Phase F-2 PR must be split if it changes:

- persistence ordering
- sync execution ordering
- save candidate resolution
- replay suppression ownership
- hydration lifecycle
- reconnect execution flow

## Completion definition

Phase F-2 is complete when reconnect behavior feels trustworthy and understandable without increasing persistence or replay risk.
