// ============================================================
//  src/domains/experiment/ExperimentRepository.js
//  Experiment ドメイン — Repository Pattern
//  CRITICAL: status = DRAFT|ACTIVE|COMPLETED|ABANDONED のみ（RD-003）
//  CRITICAL: Outcome生成は 7日ルール適用（RD-004）
// ============================================================

import { supabase } from '../../services/supabase.js';

/**
 * ユーザーの実験一覧を取得
 * @param {string} userId
 * @param {{ status?: string }} opts
 */
export async function findByUser(userId, { status } = {}) {
  let q = supabase
    .from('experiments')
    .select('*, experiment_events(*)')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/**
 * 実験を作成（DRAFT状態で開始）
 * @param {string} userId
 * @param {object} config
 */
export async function create(userId, config) {
  const validTypes = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ABANDONED'];
  const { data: exp, error: expErr } = await supabase
    .from('experiments')
    .insert({
      user_id: userId,
      status: 'DRAFT',
      ...config,
    })
    .select()
    .single();

  if (expErr) throw expErr;

  const { error: evtErr } = await supabase
    .from('experiment_events')
    .insert({
      experiment_id: exp.id,
      user_id: userId,
      event_type: 'CREATED',
      from_status: null,
      to_status: 'DRAFT',
      payload: { created_at: new Date().toISOString() },
    });

  if (evtErr) throw evtErr;
  return exp;
}

/**
 * 実験を開始（DRAFT → ACTIVE）
 * @param {string} userId
 * @param {string} experimentId
 * @param {string} actualStartDate - 'YYYY-MM-DD'
 */
export async function start(userId, experimentId, actualStartDate) {
  const exp = await _getOwned(userId, experimentId);
  if (exp.status !== 'DRAFT') throw new Error(`Cannot start experiment in status: ${exp.status}`);

  const plannedEndAt = _addDays(actualStartDate, exp.planned_days);

  const { error: updErr } = await supabase
    .from('experiments')
    .update({ status: 'ACTIVE', started_at: actualStartDate, planned_end_at: plannedEndAt })
    .eq('id', experimentId);
  if (updErr) throw updErr;

  await _insertEvent(experimentId, userId, 'STARTED', 'DRAFT', 'ACTIVE', {
    actual_start_date: actualStartDate,
    baseline_end_date: _addDays(actualStartDate, -1),
  });
}

/**
 * 実験を完了（ACTIVE → COMPLETED）
 * @param {string} userId
 * @param {string} experimentId
 * @param {string} actualEndDate - 'YYYY-MM-DD'
 */
export async function complete(userId, experimentId, actualEndDate) {
  const exp = await _getOwned(userId, experimentId);
  if (exp.status !== 'ACTIVE') throw new Error(`Cannot complete experiment in status: ${exp.status}`);

  const { error } = await supabase
    .from('experiments')
    .update({ status: 'COMPLETED', actual_end_at: actualEndDate })
    .eq('id', experimentId);
  if (error) throw error;

  await _insertEvent(experimentId, userId, 'COMPLETED', 'ACTIVE', 'COMPLETED', {
    actual_end_date: actualEndDate,
    outcome_id: null,
  });
}

/**
 * 実験を中断（ACTIVE → ABANDONED）
 * @param {string} userId
 * @param {string} experimentId
 * @param {string} reason
 */
export async function abandon(userId, experimentId, reason) {
  const exp = await _getOwned(userId, experimentId);
  if (exp.status !== 'ACTIVE') throw new Error(`Cannot abandon experiment in status: ${exp.status}`);

  const now = new Date().toISOString();
  const daysCompleted = exp.started_at
    ? Math.floor((Date.now() - new Date(exp.started_at)) / 86400000)
    : 0;

  const { error } = await supabase
    .from('experiments')
    .update({
      status: 'ABANDONED',
      actual_end_at: now.split('T')[0],
      abandoned_at: now,
      abandon_reason: reason,
    })
    .eq('id', experimentId);
  if (error) throw error;

  // ABANDONED payload に outcome_id: null を含める（RD-004）
  await _insertEvent(experimentId, userId, 'ABANDONED', 'ACTIVE', 'ABANDONED', {
    reason,
    days_completed: daysCompleted,
    outcome_id: null,
  });
}

/**
 * Outcome生成可能かチェック（RD-004: 7日ルール）
 * @param {object} experiment
 * @returns {{ canGenerate: boolean, reason?: string }}
 */
export function canGenerateOutcome(experiment) {
  if (experiment.status === 'COMPLETED') {
    return { canGenerate: true };
  }
  if (experiment.status === 'ABANDONED') {
    const endAt = new Date(experiment.actual_end_at);
    const sevenDaysLater = new Date(endAt.getTime() + 7 * 86400000);
    if (Date.now() >= sevenDaysLater.getTime()) {
      return { canGenerate: true };
    }
    return {
      canGenerate: false,
      reason: `ABANDONED後7日未経過。生成可能日: ${sevenDaysLater.toISOString().split('T')[0]}`,
    };
  }
  return { canGenerate: false, reason: `status=${experiment.status} は Outcome生成不可` };
}

// ── Private helpers ──────────────────────────────────────────

async function _getOwned(userId, experimentId) {
  const { data, error } = await supabase
    .from('experiments')
    .select('*')
    .eq('id', experimentId)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .single();
  if (error) throw error;
  return data;
}

async function _insertEvent(experimentId, userId, eventType, fromStatus, toStatus, payload) {
  const { error } = await supabase
    .from('experiment_events')
    .insert({ experiment_id: experimentId, user_id: userId, event_type: eventType, from_status: fromStatus, to_status: toStatus, payload });
  if (error) throw error;
}

function _addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
