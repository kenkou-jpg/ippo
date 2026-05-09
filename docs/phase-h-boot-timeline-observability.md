# Phase H — Boot Timeline Observability

## Goal

Improve startup diagnostics by exposing a readable boot timeline.

The purpose is to answer:

```txt
Where did startup stop?
```

without rewriting startup sequencing.

## Motivation

After the Vite migration, startup now depends on:

- module import success
- runtime ownership graph
- hydration preparation
- render activation
- screen activation
- startup verification

A blank screen can happen even when only one boot stage fails.

## Proposed helper

```js
window.ippoBootTimelineSummary?.()
```

## Suggested timeline events

### Shell

- shell-loaded
- fallback-installed
- module-script-requested

### Main entry

- main-entry-start
- vite-ready
- startup-verify-start
- startup-verify-finished

### Rendering

- first-render-detected
- first-active-screen-detected
- welcome-rendered
- app-rendered

### Failure states

- fatal-boot-error
- blank-screen-watchdog-triggered
- fallback-shown
- unhandled-rejection-detected

## Recommended summary shape

```js
{
  rendered: true,
  fallbackShown: false,
  firstActiveScreen: 'home',
  events: [...],
  errors: [...],
  startupDurationMs: 1200
}
```

## Safety constraints

Do not:

- rewrite import order
- rewrite startup sequencing
- rewrite hydration sequencing
- rewrite render ownership
- change save/sync behavior

This phase is observability-only.

## Validation

Healthy startup should show:

- ordered boot events
- one active screen
- fallback hidden
- no fatal startup errors

Failure startup should show:

- last successful boot event
- captured startup error
- fallback visible if app remains empty

## Completion definition

Startup failures can be narrowed down from console diagnostics without needing invasive runtime rewrites.
