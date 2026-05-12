# Production Smoke Checklist

Minimum viable verification that ippo is operational in production.

Run this immediately after every deploy. Completes in under 10 minutes.
For a full pre-release pass, use `release-checklist.md` instead.

---

## Prerequisites

- Use a clean incognito / private-browsing window
- Target the production URL (not localhost)
- Keep DevTools console open throughout

---

## 1. App opens

- [ ] Navigate to the production URL
- [ ] Page renders — no blank screen after 5 seconds
- [ ] `ippo-boot-fallback` card is NOT visible
- [ ] No uncaught errors in the console on startup

Quick console check:
```js
window.ippoBootFailureSummary()
// Expected: { fallbackShown: false, rendered: true, ... }
```

---

## 2. Onboarding / first run

- [ ] With empty localStorage, onboarding screen appears
- [ ] Onboarding can be completed without error
- [ ] Main app screen appears after completing onboarding

---

## 3. Create a record

- [ ] Open the record entry screen
- [ ] Fill in at least one symptom or field
- [ ] Tap / click Save
- [ ] Save feedback is shown (success state, no error message)
- [ ] App returns to previous screen or updates in place

---

## 4. Record persists after reload

- [ ] Hard reload the app (`Ctrl+Shift+R` or mobile equivalent)
- [ ] App reopens without blank screen
- [ ] The saved record is visible (in home screen or calendar)
- [ ] localStorage check (optional):
```js
JSON.parse(localStorage.getItem('ippo_records') || '[]').length
// Expected: > 0
```

---

## 5. Sync (requires Supabase key to be configured)

- [ ] Check Supabase status:
```js
window.__ippoSupabaseStatus
// Expected: { ready: true, hasKey: true, reason: null }
```
- [ ] Save a record while logged in
- [ ] Verify the record appears in the Supabase dashboard within ~10 seconds
- [ ] No 401/403/5xx errors in the Network tab during sync

If `ready: false` and `reason: 'missing-supabase-key'`, the `VITE_SUPABASE_KEY` secret was not injected at build time. Redeploy with the secret set.

---

## 6. Reconnect behavior

- [ ] Open app online
- [ ] Save a record
- [ ] Open DevTools → Network → Offline
- [ ] Attempt another save — confirm it does not crash, local state is updated
- [ ] Return to Online
- [ ] Confirm no duplicate record or error toast appears after reconnect

---

## 7. Login persistence

- [ ] Log in (if auth is enabled)
- [ ] Close the tab entirely
- [ ] Reopen the production URL
- [ ] Confirm user is still logged in (no unexpected logout screen)

Session storage check:
```js
!!localStorage.getItem('ippo_sb_token')
// Expected: true if a session is active
```

---

## 8. Service Worker

- [ ] DevTools → Application → Service Workers → Status shows `activated`
- [ ] No SW install or activation errors
- [ ] SW scope is `/` (not a subdirectory)

Quick console check:
```js
navigator.serviceWorker.ready.then(r => console.log('SW scope:', r.scope))
// Expected: scope ends with '/'
```

---

## 9. No console regressions

After completing checks 1–8, review the console:

- [ ] No uncaught `TypeError` or `ReferenceError`
- [ ] No `ippo:` prefixed error messages (warnings are acceptable)
- [ ] No 404 errors for JS/CSS assets in the Network tab
- [ ] No repeated failed fetch attempts

---

## Pass / Fail

| Check | Result | Notes |
|-------|--------|-------|
| 1. App opens | | |
| 2. Onboarding | | |
| 3. Create record | | |
| 4. Persist after reload | | |
| 5. Sync | | |
| 6. Reconnect | | |
| 7. Login persistence | | |
| 8. Service Worker | | |
| 9. No console regressions | | |

If any row is **Fail**: do not proceed with the public release announcement.
Escalate via a GitHub issue tagged `P0`.

---

## What this checklist does NOT cover

- Mobile-specific layout issues → see `mobile-smoke-checklist.md`
- Full regression across all screens → see `phase-a-manual-regression-checklist.md`
- Performance benchmarking
- Automated E2E tests
