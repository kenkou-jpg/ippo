// consent-service.js — Research Consent UI backing service (PR-P2-06).
// localStorage-backed, single-user local state (matches the app's existing
// companion-intelligence.js / recovery-journey.js integration style).
//
// Storage keys/shape intentionally mirror src/repositories/consent/consent-repository.js
// (ConsentRepositoryImpl, PR-018, DI-registered but not yet wired to any live screen) —
// ippo_consent / ippo_consent_events, { level, grantedAt, updatedAt }, GRANTED/REVOKED events.
// This keeps a future migration to that repository a drop-in swap rather than a third
// incompatible format. Level definitions (docs/HANDOFF_PHASE7_COMPLETE.md PR-P2-06 entry):
//   0 = 未同意, 1 = PLATFORM, 2 = PLATFORM+RESEARCH, 3 = +COMMERCIAL.
// This PR only manages the RESEARCH boundary (Level 2), matching consent-gate-service.js's
// RESEARCH_CONSENT_MIN_LEVEL.

const CONSENT_KEY = 'ippo_consent';
const CONSENT_EVENTS_KEY = 'ippo_consent_events';
const RESEARCH_LEVEL = 2;

function _load() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function _save(consent) {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch (_) {}
}

function _appendEvent(eventType, fromLevel, toLevel) {
  try {
    const raw = localStorage.getItem(CONSENT_EVENTS_KEY);
    const events = raw ? JSON.parse(raw) : [];
    events.push({
      id: 'cevt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      eventType,
      fromLevel,
      toLevel,
      occurredAt: new Date().toISOString(),
    });
    localStorage.setItem(CONSENT_EVENTS_KEY, JSON.stringify(events));
  } catch (_) {}
}

export function getConsentState() {
  const c = _load();
  return {
    level: c?.level ?? 0,
    grantedAt: c?.grantedAt ?? null,
    updatedAt: c?.updatedAt ?? null,
  };
}

export function isResearchConsentGranted() {
  return getConsentState().level >= RESEARCH_LEVEL;
}

export function grantResearchConsent() {
  const current = getConsentState();
  const now = new Date().toISOString();
  _save({ level: RESEARCH_LEVEL, grantedAt: current.grantedAt || now, updatedAt: now });
  _appendEvent('GRANTED', current.level, RESEARCH_LEVEL);
  renderResearchConsentStatus();
}

export function withdrawResearchConsent() {
  const current = getConsentState();
  const now = new Date().toISOString();
  _save({ level: 0, grantedAt: current.grantedAt, updatedAt: now });
  _appendEvent('REVOKED', current.level, 0);
  renderResearchConsentStatus();
}

export function toggleResearchConsent() {
  const granted = isResearchConsentGranted();
  const message = granted
    ? '研究への協力の同意を撤回しますか？'
    : '匿名化された記録を、疾患研究の役に立てることに同意しますか？いつでも撤回できます。';
  const action = granted ? withdrawResearchConsent : grantResearchConsent;
  if (typeof window.showConfirmModal === 'function') {
    window.showConfirmModal(message, action);
  } else {
    action();
  }
}

export function renderResearchConsentStatus() {
  const el = document.getElementById('settings-consent-sub');
  if (!el) return;
  el.textContent = isResearchConsentGranted()
    ? '協力中（いつでも撤回できます）'
    : '同意していません';
}

document.addEventListener('DOMContentLoaded', renderResearchConsentStatus);

window.ippoConsent = {
  getConsentState,
  isResearchConsentGranted,
  grantResearchConsent,
  withdrawResearchConsent,
  toggleResearchConsent,
  renderResearchConsentStatus,
};
window.toggleResearchConsent = toggleResearchConsent;
