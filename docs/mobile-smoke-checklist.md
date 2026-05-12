# Mobile Smoke Checklist

Real-device verification for ippo on iPhone Safari and Android Chrome.

Run this before every public release.
Emulators are acceptable for a quick pass; real devices are required for a release sign-off.

---

## Devices

| Target | Priority |
|--------|----------|
| iPhone (latest iOS) — Safari | Required |
| iPhone (iOS 15 or older) — Safari | Recommended |
| Android (Chrome latest) | Required |
| Android (Chrome older) | Optional |

---

## Setup per device

1. Clear browser cache and site data for the app's origin.
2. Disable any content blockers or browser extensions.
3. Use the production URL, not localhost.
4. Keep DevTools / Safari Web Inspector connected if possible.

---

## 1. Initial load

- [ ] App opens without a blank white screen
- [ ] `ippo-boot-fallback` card does NOT appear within 5 seconds
- [ ] Onboarding or home screen renders fully
- [ ] No layout overflow visible (horizontal scroll bar should not appear)
- [ ] Logo, text, and buttons are within safe area (no notch/island overlap)

---

## 2. Startup — returning user

- [ ] Close and reopen the app (background → foreground, or close tab → reopen)
- [ ] Confirm the previously viewed screen or state is restored
- [ ] No blank screen on resume
- [ ] No duplicate onboarding screen

---

## 3. Keyboard overlap

- [ ] Open a screen with a text input field
- [ ] Tap the input — software keyboard appears
- [ ] The input field remains visible above the keyboard (not hidden behind it)
- [ ] The form's submit/save button is accessible without dismissing the keyboard
- [ ] Dismissing the keyboard does not cause layout jump or content shift

iPhone Safari note: `position: fixed` elements can behave differently when the virtual keyboard is open. Verify the save button and bottom navigation are not pushed off-screen.

---

## 4. Fixed footer / bottom navigation

- [ ] Bottom navigation bar renders at the bottom of the viewport
- [ ] Navigation bar does not overlap content when scrolling
- [ ] On iPhone with home indicator: bottom bar respects `env(safe-area-inset-bottom)` — no items obscured by the home indicator
- [ ] On Android: bottom navigation is not obscured by gesture bar

---

## 5. Modal and sheet behavior

- [ ] Open a modal (e.g., record entry screen, settings overlay)
- [ ] Modal renders within the viewport — not clipped at top or bottom
- [ ] Scrollable content inside the modal can be scrolled without scrolling the background page
- [ ] Modal close button is reachable (not behind the notch or status bar)
- [ ] On iPhone: modal respects `env(safe-area-inset-top)` when full-height

---

## 6. Scroll behavior

- [ ] Long content screens (calendar, insights, settings) scroll smoothly
- [ ] Scroll does not freeze or stutter mid-scroll
- [ ] Overscroll bounce (iOS) does not reveal a blank white background behind the app
- [ ] After scrolling to bottom and back to top, no layout reflow

---

## 7. Record save

- [ ] Open the record screen from the home or calendar
- [ ] Fill in at least one field
- [ ] Tap Save
- [ ] Save feedback appears (success message or similar)
- [ ] App returns to the previous screen or updates in place
- [ ] Hard reload: saved record is still present
- [ ] Calendar shows the record on the correct date

---

## 8. Offline recovery

- [ ] Enable Airplane Mode (or disable Wi-Fi + cellular)
- [ ] Reload the app — it should load from Service Worker cache, not show a browser error page
- [ ] Save a record while offline
- [ ] Confirm the record appears locally (localStorage)
- [ ] Re-enable network
- [ ] Confirm sync retry fires (no duplicate record)

---

## 9. Reload recovery

- [ ] Save a record
- [ ] Pull to refresh (or use browser reload button)
- [ ] App reloads and shows the saved record
- [ ] No blank screen after reload
- [ ] No double-render or flash of onboarding screen

---

## 10. Tap targets

- [ ] All interactive elements (buttons, links, tabs) can be tapped without accidentally activating an adjacent element
- [ ] Minimum tap target size feels comfortable (≥ 44px recommended)
- [ ] No overlapping tap targets on the navigation bar

---

## Known mobile-specific caveats

- **iPhone Safari `position: fixed` + keyboard**: the virtual keyboard does not trigger a `resize` event in older iOS. Bottom-fixed elements may overlap the keyboard. Verify the save button is accessible.
- **iOS safe area**: status bar and home indicator require `env(safe-area-inset-*)`. If a new screen was added without this, check for visual clipping.
- **Android back gesture**: swiping back from the edge may conflict with in-app navigation. Confirm it does not navigate away from the app unintentionally.
- **Overscroll background**: if `background-color` is not set on `body`/`html`, iOS overscroll may reveal white. Confirm the app background extends into the overscroll area.

---

## Sign-off

| Check | iPhone Safari | Android Chrome |
|-------|--------------|----------------|
| Initial load | | |
| Returning user | | |
| Keyboard overlap | | |
| Fixed footer | | |
| Modal behavior | | |
| Scroll behavior | | |
| Record save | | |
| Offline recovery | | |
| Reload recovery | | |
| Tap targets | | |

All rows must be filled before mobile sign-off.
