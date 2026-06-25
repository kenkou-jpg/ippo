// CaseIdGenerator — generates immutable Case IDs.
// Format: CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}
// Example: CASE-ENDOMETRIOSIS-202606-AB12CD34
// Generated IDs must never be mutated after creation.

const RANDOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a random 8-character alphanumeric suffix.
 * Uses crypto.getRandomValues when available (browser/Node 15+), falls back to Math.random.
 * @returns {string}
 */
function _random8() {
  const arr = new Array(8);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(8);
    globalThis.crypto.getRandomValues(buf);
    for (let i = 0; i < 8; i++) arr[i] = RANDOM_CHARS[buf[i] % RANDOM_CHARS.length];
  } else {
    for (let i = 0; i < 8; i++) arr[i] = RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  }
  return arr.join('');
}

/**
 * Normalise a disease key to the ID segment.
 * Strips spaces, lowercases, truncates to 20 chars, uppercases.
 * @param {string} diseaseKey
 * @returns {string}
 */
function _diseaseSegment(diseaseKey) {
  if (!diseaseKey) return 'UNKNOWN';
  return String(diseaseKey)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 20) || 'UNKNOWN';
}

/**
 * Extracts YYYYMM from an ISO date string.
 * @param {string} [isoDate]  YYYY-MM-DD or ISO datetime
 * @returns {string}  YYYYMM
 */
function _yyyymm(isoDate) {
  const d = isoDate ? new Date(isoDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

/**
 * Generate a Case ID.
 * @param {string} diseaseKey       primary disease key (e.g. 'endometriosis')
 * @param {string} [generatedAt]    ISO date; defaults to now
 * @returns {string}
 */
export function generateCaseId(diseaseKey, generatedAt = null) {
  const disease = _diseaseSegment(diseaseKey);
  const yyyymm  = _yyyymm(generatedAt);
  const random  = _random8();
  return `CASE-${disease}-${yyyymm}-${random}`;
}

/**
 * Validate that a string is a well-formed Case ID.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidCaseId(id) {
  return /^CASE-[A-Z0-9]{1,20}-\d{6}-[A-Z0-9]{8}$/.test(id);
}
