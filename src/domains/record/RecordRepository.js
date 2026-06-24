// ============================================================
//  src/domains/record/RecordRepository.js
//  Record ドメイン — Repository Pattern
//  CONSTITUTION: domains/ は infrastructure/ に依存しない
//  SCHEMA_V1 C-1: record_date は DATE型・タイムゾーンなし
//  SCHEMA_V1 C-9: UNIQUE(user_id, record_date) — 1日1レコード
// ============================================================

import { supabase } from '../../services/supabase.js';

/**
 * ユーザーの記録一覧を取得
 * @param {string} userId
 * @param {{ from?: string, to?: string, limit?: number }} opts
 * @returns {Promise<Array>}
 */
export async function findByUser(userId, { from, to, limit = 90 } = {}) {
  let q = supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('record_date', { ascending: false })
    .limit(limit);

  if (from) q = q.gte('record_date', from);
  if (to)   q = q.lte('record_date', to);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/**
 * 指定日の記録を取得
 * @param {string} userId
 * @param {string} recordDate - 'YYYY-MM-DD'
 * @returns {Promise<object|null>}
 */
export async function findByDate(userId, recordDate) {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .eq('record_date', recordDate)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 記録を保存（UPSERT）
 * UNIQUE(user_id, record_date) に基づいて INSERT or UPDATE
 * @param {string} userId
 * @param {string} recordDate - 'YYYY-MM-DD'
 * @param {object} fields
 * @returns {Promise<object>}
 */
export async function upsert(userId, recordDate, fields) {
  const payload = {
    user_id: userId,
    record_date: recordDate,
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('records')
    .upsert(payload, { onConflict: 'user_id,record_date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 記録を論理削除
 * @param {string} userId
 * @param {string} recordId
 */
export async function softDelete(userId, recordId) {
  const { error } = await supabase
    .from('records')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Case品質計算用: ユーザーの記録統計を取得
 * @param {string} userId
 * @returns {Promise<{daysRecorded: number, coverageRate: number, avgFieldFillRate: number}>}
 */
export async function getStatsForCase(userId) {
  const { data, error } = await supabase
    .from('records')
    .select('record_date, pain_level, energy, sleep_quality, wellness_score')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('record_date', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    return { daysRecorded: 0, coverageRate: 0, avgFieldFillRate: 0 };
  }

  const daysRecorded = data.length;
  const first = new Date(data[0].record_date);
  const last  = new Date(data[data.length - 1].record_date);
  const periodDays = Math.max(1, (last - first) / 86400000 + 1);
  const coverageRate = daysRecorded / periodDays;

  const keyFields = ['pain_level', 'energy', 'sleep_quality', 'wellness_score'];
  const filledRates = data.map(r => {
    const filled = keyFields.filter(f => r[f] != null).length;
    return filled / keyFields.length;
  });
  const avgFieldFillRate = filledRates.reduce((a, b) => a + b, 0) / filledRates.length;

  return { daysRecorded, coverageRate, avgFieldFillRate };
}
