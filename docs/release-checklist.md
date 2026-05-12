# Release Checklist

Pre-release verification for ippo production deployment.

Run this checklist before every public release and after every hotfix.
Each section must pass before proceeding to the next.

---

## 0. Build verification

- [ ] `npm ci` completes without errors
- [ ] `npm run build` completes without errors
- [ ] No new red errors in the build output (existing Vite dynamic/static import warnings are pre-approved — see `known-warnings.md`)
- [ ] `dist/app.html` exists and references hashed asset filenames
- [ ] `dist/sw.js` exists and contains the current `CACHE_VERSION`
- [ ] `dist/manifest.json` exists and is valid JSON

---

## 1. Deploy confirmation

- [ ] Deployed build is served from `dist/` (not raw source tree)
- [ ] `https://<domain>/app.html` responds 200
- [ ] `https://<domain>/sw.js` responds 200 with `Content-Type: application/javascript`
- [ ] `https://<domain>/manifest.json` responds 200
- [ ] No redirect loop on root `/` → `/app.html`
- [ ] Canonical URL is consistent (no mixed `http`/`https`)
- [ ] CNAME is correct and DNS has propagated

GitHub Pages specific:
- [ ] GitHub Actions `Build and Deploy` workflow completed green on the target commit
- [ ] `VITE_SUPABASE_KEY` secret is set in the repository's GitHub Secrets

---

## 2. Smoke test — desktop browser

Run in a clean profile (cleared localStorage, no extensions):

- [ ] App opens without a blank screen
- [ ] No `ippo-boot-fallback` card appears within 5 seconds
- [ ] Console has no uncaught errors on startup
- [ ] Onboarding flow appears on first visit
- [ ] After completing onboarding, main app renders
- [ ] Record screen opens
- [ ] A record can be saved
- [ ] Saved record survives a hard reload (`Ctrl+Shift+R`)
- [ ] Calendar reflects the saved record

---

## 3. Mobile smoke test

See `mobile-smoke-checklist.md` for detailed steps.

- [ ] iPhone Safari: startup OK, no blank screen
- [ ] iPhone Safari: record save OK
- [ ] Android Chrome: startup OK, no blank screen
- [ ] Android Chrome: record save OK

---

## 4. Offline verification

- [ ] Open app online, save a record
- [ ] Open DevTools → Network → set to Offline
- [ ] Reload — app should load from Service Worker cache, not show a network error
- [ ] Save a record while offline — localStorage should capture it
- [ ] Return to Online — sync retry should fire without duplication
- [ ] Confirm the record saved offline is still visible and not duplicated

---

## 5. Sync and Supabase

- [ ] `window.__ippoSupabaseStatus.ready` is `true` in the browser console (requires `VITE_SUPABASE_KEY` to be set)
- [ ] Login / session persistence: close and reopen tab, user remains logged in
- [ ] A record saved while logged in appears in Supabase dashboard
- [ ] No 401 or 403 errors in the Network tab during sync
- [ ] No duplicate rows created for the same date in Supabase

If Supabase key is not present (local dev without `.env.local`):
- [ ] `window.__ippoSupabaseStatus.reason` is `'missing-supabase-key'` and app continues without crashing

---

## 6. Service Worker

- [ ] SW registers successfully: `navigator.serviceWorker.ready` resolves in console
- [ ] SW cache version matches `CACHE_VERSION` in `public/sw.js`
- [ ] After a `CACHE_VERSION` bump and redeploy, old cache is purged and new assets load
- [ ] No SW install errors in DevTools → Application → Service Workers
- [ ] `/sw.js` is served from the deploy root, not from `/public/sw.js`

SW source ownership:
- `public/sw.js` = canonical source (edit here)
- `service-worker.js` = legacy containment (do not edit)
- `root/sw.js` = compatibility mirror (do not edit)

---

## 7. Rollback

If a release needs to be rolled back:

1. Identify the last known-good commit hash from the `main` branch git log.
2. Revert via GitHub: create a revert PR or re-deploy the previous artifact.
3. Bump `CACHE_VERSION` in `public/sw.js` by 1 — this forces clients to invalidate the broken cache.
4. Confirm the reverted deploy is live by checking `dist/sw.js` `CACHE_VERSION`.
5. Monitor for 5 minutes: no new error reports, boot-fallback not showing.

Do not force-push `main`. Use a revert commit or re-deploy.

---

## 8. Post-deploy monitoring (first 30 minutes)

- [ ] Open app in an incognito window after deploy
- [ ] Confirm no blank screen on fresh load
- [ ] Check `window.ippoBootFailureSummary()` in the console: `fallbackShown` should be `false`
- [ ] Check `window.__ippoSupabaseStatus.ready` (if key is present)
- [ ] Confirm SW is active: DevTools → Application → Service Workers → Status = `activated`
- [ ] No unexpected 404s in the Network tab for JS/CSS assets

---

## Exit criteria

A release is safe to announce publicly when:

- [ ] Sections 0–7 above all pass
- [ ] No P0 issues open on GitHub
- [ ] Post-deploy monitoring (section 8) has been clean for 30 minutes
