# Phase H — Startup & Blank Screen Reliability

## Goal

Prevent the most trust-breaking failure mode after the Vite SPA migration:

```txt
app.html loads
↓
/src/main.js or runtime startup fails
↓
#app stays empty
↓
user sees a blank screen
```

Phase H focuses on startup reliability, boot failure observability, and safe fallback UI.

This phase should make sure the app never fails silently.

## Priority

This phase is higher priority than normal UX polish.

Recommended product priority:

1. app does not show / blank screen recovery
2. sync reliability
3. UX polish
4. retention improvement
5. insight quality
6. lightweight E2E
7. performance polish

## Core principle

A startup failure is acceptable only if it is visible, recoverable, and diagnosable.

Unacceptable:

```txt
blank screen with no message
blank screen with no reload path
blank screen with no console diagnostics
blank screen caused by one failed module import
```

## Main risk areas

### 1. Module import failure

Potential causes:

- missing module path
- Vite build artifact mismatch
- GitHub Pages path issue
- stale service worker cache
- syntax error in an imported module

### 2. Runtime startup exception

Potential causes:

- startup runtime throws before render
- ownership graph check throws
- missing expected global function
- unguarded DOM access

### 3. Empty shell problem

Current app shell is intentionally minimal:

```html
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

This makes startup clean, but it also means boot failure can leave the user with an empty page.

## Allowed work

### Safe additions

- boot timeout guard
- blank screen detector
- fatal boot fallback UI
- reload/retry button
- diagnostic summary helper
- global startup error listener
- unhandled rejection listener
- module-load failure copy
- service-worker cache guidance
- non-invasive fallback rendering

### Not allowed

- rewriting `main.js` import order without a specific failure
- changing hydration sequencing
- changing render ownership
- changing `showScreen` timing
- changing `switchTab` timing
- changing save/sync ordering
- changing DOM IDs used by existing screens

## Suggested implementation approach

### Step 1 — Add static boot fallback

Add a minimal fallback inside the shell that can display if JS fails before rendering.

Requirements:

- lightweight
- no dependency on modules
- no dependency on app state
- hidden or replaced once app boots
- includes reload guidance

### Step 2 — Add startup watchdog

Add a small watchdog that checks whether:

- `#app` has visible content
- main app or welcome screen rendered
- Vite entry marked ready
- fatal boot error occurred

The watchdog should not interfere with normal render timing.

### Step 3 — Capture boot errors

Capture:

- `window.onerror`
- `window.onunhandledrejection`
- module script load failure if possible
- startup runtime errors via existing boot markers

### Step 4 — Expose diagnostic summary

Add a helper such as:

```js
window.ippoBootFailureSummary?.()
```

It should include:

- app content present
- visible screen count
- last boot events
- boot errors
- Vite ready flag
- service worker presence
- current URL

### Step 5 — Validate against startup paths

Test:

- normal boot
- reload
- hard reload
- GitHub Pages deployment path
- stale service worker cache
- simulated module failure
- simulated runtime throw

## User-facing fallback copy

Recommended Japanese copy:

```txt
アプリの表示に時間がかかっています。
通信状況や更新直後のキャッシュが影響している可能性があります。
ページを再読み込みしてください。
```

Button:

```txt
再読み込みする
```

Optional secondary text:

```txt
何度も表示される場合は、ブラウザのキャッシュを削除してからもう一度お試しください。
```

## Validation checklist

- [ ] normal boot does not show fallback
- [ ] fallback appears if app remains empty too long
- [ ] reload button works
- [ ] fatal boot errors are captured
- [ ] unhandled promise rejection is captured
- [ ] diagnostics are available from console
- [ ] fallback does not rewrite render timing
- [ ] fallback does not change hydration sequencing
- [ ] fallback does not affect save/sync behavior
- [ ] fallback is accessible on mobile

## Runtime checks

After testing startup:

```js
window.ippoBootFailureSummary?.()
window.ippoBootSummary?.()
window.ippoStartupVerifySummary?.()
window.ippoBootstrapShellSummary?.()
window.ippoRuntimeOwnershipGraphSummary?.()
```

Expected:

- normal boot shows ready state
- fatal boot state remains false during healthy startup
- blank screen fallback stays inactive during healthy startup
- diagnostics are bounded and readable

## E2E additions

Phase G test plan should include startup reliability tests:

### Startup smoke

- visit app
- wait for either welcome or main app
- assert no blank screen

### Blank-screen guard smoke

- simulate delayed app render
- assert fallback appears
- assert reload button exists

### Fatal startup smoke

- simulate startup exception if test harness allows
- assert diagnostics are captured
- assert fallback is visible

## Completion definition

Phase H is complete when a startup failure can no longer silently become an empty blank screen.

The user should either see the app or see a clear, recoverable fallback message.
