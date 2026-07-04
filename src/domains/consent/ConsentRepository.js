// ============================================================
//  src/domains/consent/ConsentRepository.js
//  Consent ドメイン — Repository Pattern
//  CRITICAL: level は 0〜3 のみ（RD-006。Level 4は使用しない）
//  CRITICAL: consent_events は append-only（DELETE/UPDATE 禁止）
//
//  Level定義（CONSTITUTION確定版）:
//    Level 0: 未同意（Default）
//    Level 1: PLATFORM + CASE_PUBLICATION GRANTED
//    Level 2: Level1 + RESEARCH GRANTED
//    Level 3: Level2 + COMMERCIAL GRANTED
// ============================================================

import { supabase } from '../../services/supabase.js';

const POLICY_VERSION = '2026-07-01-v1';

/**
 * ユーザーの現在のConsent状態を取得
 * @param {string} userId
 * @returns {Promise<{level: number, consents: Array}>}
 */
export async function findByUser(userId) {
  const { data, error } = await supabase
    .from('consents')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const level = _deriveLevel(data || []);
  return { level, consents: data || [] };
}

/**
 * Platform同意を記録（Level 0 → Level 1）
 * @param {string} userId
 * @param {{ ipHash?: string, userAgentHash?: string }} meta
 */
export async function grantPlatform(userId, { ipHash, userAgentHash } = {}) {
  await _grantConsent(userId, 'PLATFORM', 1, ipHash, userAgentHash);
  await _grantConsent(userId, 'CASE_PUBLICATION', 1, ipHash, userAgentHash);
}

/**
 * 研究利用同意を記録（Level 1 → Level 2）
 * @param {string} userId
 * @param {{ ipHash?: string, userAgentHash?: string }} meta
 */
export async function grantResearch(userId, { ipHash, userAgentHash } = {}) {
  await _grantConsent(userId, 'RESEARCH', 2, ipHash, userAgentHash);
}

/**
 * 商業利用同意を記録（Level 2 → Level 3）
 * @param {string} userId
 * @param {{ ipHash?: string, userAgentHash?: string }} meta
 */
export async function grantCommercial(userId, { ipHash, userAgentHash } = {}) {
  await _grantConsent(userId, 'COMMERCIAL', 3, ipHash, userAgentHash);
}

/**
 * 同意を撤回（全 consent_type を WITHDRAWN に）
 * Level は 0 に戻る
 * @param {string} userId
 * @param {string} reason
 */
export async function withdraw(userId, reason = '') {
  const { data: existing } = await supabase
    .from('consents')
    .select('id, consent_type, status, level')
    .eq('user_id', userId)
    .eq('status', 'GRANTED');

  for (const c of existing || []) {
    await supabase.from('consents').update({
      status: 'WITHDRAWN',
      level: 0,
      withdrawn_at: new Date().toISOString(),
    }).eq('id', c.id);

    await supabase.from('consent_events').insert({
      consent_id: c.id,
      user_id: userId,
      event_type: 'WITHDRAWN',
      from_level: c.level,
      to_level: 0,
      from_status: 'GRANTED',
      to_status: 'WITHDRAWN',
      policy_version: POLICY_VERSION,
      jurisdiction: 'JP',
      payload: { reason },
    });
  }
}

// ── Private helpers ──────────────────────────────────────────

function _deriveLevel(consents) {
  const granted = new Set(
    consents.filter(c => c.status === 'GRANTED').map(c => c.consent_type)
  );
  if (granted.has('COMMERCIAL')) return 3;
  if (granted.has('RESEARCH'))   return 2;
  if (granted.has('PLATFORM'))   return 1;
  return 0;
}

async function _grantConsent(userId, consentType, level, ipHash, userAgentHash) {
  const { data: existing } = await supabase
    .from('consents')
    .select('*')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('jurisdiction', 'JP')
    .maybeSingle();

  let consentId;

  if (existing) {
    consentId = existing.id;
    await supabase.from('consents').update({
      status: 'GRANTED',
      level,
      granted_at: new Date().toISOString(),
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
    }).eq('id', consentId);
  } else {
    const { data: inserted } = await supabase.from('consents').insert({
      user_id: userId,
      consent_type: consentType,
      level,
      status: 'GRANTED',
      policy_version: POLICY_VERSION,
      jurisdiction: 'JP',
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      granted_at: new Date().toISOString(),
    }).select().single();
    consentId = inserted.id;
  }

  await supabase.from('consent_events').insert({
    consent_id: consentId,
    user_id: userId,
    event_type: 'GRANTED',
    from_level: existing?.level ?? 0,
    to_level: level,
    from_status: existing?.status ?? 'PENDING',
    to_status: 'GRANTED',
    policy_version: POLICY_VERSION,
    jurisdiction: 'JP',
    ip_hash: ipHash,
    user_agent_hash: userAgentHash,
  });
}
