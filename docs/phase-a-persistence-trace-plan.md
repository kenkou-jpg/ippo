# Phase A — Persistence Trace Stabilization Plan

## Goal

Add low-risk observability around record save / persistence / sync flows without changing:

- render timing
- hydration timing
- persistence order
- save execution order
- screen activation order
- compatibility bridge behavior

This phase is observability-first.

Do not rewrite the pipeline.

## Why this exists

The migration is now structurally complete.

The remaining risks are primarily:

- duplicate saves
- duplicate sync
- stale hydration state
- race-condition visibility gaps
- rollback ambiguity
- reconnect edge cases
- calendar reflection timing confusion

These are difficult to debug without trace visibility.

## Critical rule

Tracing must never mutate execution behavior.

Allowed:

```js
console.debug()
performance.mark()
window.__IPPO_TRACE.push(...)
```

Not allowed:

```js
await trace()
Promise.all(...)
debounce(...)
queueMicrotask(...)
requestAnimationFrame(...)
```

inside critical save ordering.

## Initial trace targets

### 1. Record save lifecycle

Target pipeline:

```txt
UI
↓
saveRecord
↓
record-save-orchestrator
↓
execution plan
↓
persistence delegation
↓
saveState
↓
localStorage
↓
Supabase sync
↓
calendar reflection
```

Required trace points:

- save-start
- draft-created
- target-resolved
- execution-plan-created
- persistence-start
- local-save-complete
- remote-sync-start
- remote-sync-complete
- calendar-refresh
- save-complete
- save-failed

## Suggested trace shape

```js
window.__IPPO_TRACE = window.__IPPO_TRACE || [];

window.__IPPO_TRACE.push({
  area: 'record-save',
  phase: 'local-save-complete',
  recordId,
  date,
  ts: Date.now(),
});
```

## 2. Hydration lifecycle

Required visibility:

- startup-enter
- hydration-start
- hydration-state-loaded
- hydration-render-ready
- screen-activation-ready
- hydration-complete

Goal:

Detect:

- render-before-hydration
- duplicate hydration
- stale state render
- partial activation

## 3. Sync lifecycle

Required visibility:

- sync-queued
- sync-start
- sync-success
- sync-failure
- offline-fallback
- reconnect-detected
- duplicate-sync-skipped

Goal:

Detect:

- reconnect loops
- duplicate remote writes
- stale overwrite
- offline replay bugs

## 4. Calendar reflection lifecycle

Required visibility:

- calendar-render-start
- calendar-record-source-ready
- calendar-month-switch
- calendar-render-complete
- calendar-record-reflected

Goal:

Detect:

- stale month renders
- delayed reflection
- render-before-save-complete
- hydration mismatch

## Safe implementation rules

### Allowed

- additive logging
- additive trace arrays
- additive debug guards
- readonly visibility helpers

### Forbidden

- timing rewrites
- batching changes
- async order changes
- Promise structure changes
- render lifecycle rewrites
- replacing existing save pipeline

## Debug mode suggestion

Recommended:

```js
window.IPPO_TRACE_ENABLED = true;
```

and:

```js
if (window.IPPO_TRACE_ENABLED) {
  console.debug(...)
}
```

Keep tracing lightweight.

## Future phases

After trace visibility is stable:

### Phase B

Targeted regression fixes.

### Phase C

Persistence replay tests.

### Phase D

Playwright E2E flows.

### Phase E

Performance + UX improvements.

## Exit criteria

This phase is complete when:

- [ ] save flow trace is visible
- [ ] hydration lifecycle is visible
- [ ] sync lifecycle is visible
- [ ] duplicate save timing can be identified
- [ ] reconnect behavior can be identified
- [ ] no execution order changed
- [ ] no timing regression introduced
